"""
FastAPI Outpainting Server
Wraps the Stable Diffusion inpainting pipeline from Outpainting_Pipeline.ipynb

Run:
    uvicorn main:app --host 0.0.0.0 --port 8000
"""

import io
import base64
import uuid
import os
import asyncio
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

import numpy as np
import torch
import groq
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from diffusers import StableDiffusionInpaintPipeline

# ─── Config ──────────────────────────────────────────────────────────────────
MODEL_ID       = "runwayml/stable-diffusion-inpainting"
RESULTS_DIR    = Path("results")
RESULTS_DIR.mkdir(exist_ok=True)
GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "")       # set in environment
FRONTEND_ORIGIN = os.getenv("FRONTEND_URL", "http://localhost:5173")

# In-memory job store  { job_id: { status, result_url, error } }
jobs: dict[str, dict] = {}

# Global pipeline (loaded once at startup)
pipe = None


# ─── Lifespan: load model once ───────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global pipe
    print("⏳ Loading Stable Diffusion inpainting model…")
    dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    device = "cuda" if torch.cuda.is_available() else "cpu"
    pipe = StableDiffusionInpaintPipeline.from_pretrained(MODEL_ID, torch_dtype=dtype)
    pipe = pipe.to(device)
    pipe.safety_checker = None          # disable for speed (re-enable if needed)
    print(f"✅ Model loaded on {device}")
    yield
    print("Shutting down…")


app = FastAPI(title="ExpandAI — Outpainting API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Aspect-ratio → expansion logic ──────────────────────────────────────────
ASPECT_RATIOS = {
    "1:1":  (1, 1),
    "4:3":  (4, 3),
    "16:9": (16, 9),
    "9:16": (9, 16),
    "21:9": (21, 9),
    "3:4":  (3, 4),
    "3:2":  (3, 2),
    "2:3":  (2, 3),
}

def compute_expansion(orig_w: int, orig_h: int, aspect_ratio: str, direction: str):
    """
    Given the original dimensions, target aspect ratio, and direction,
    return (new_w, new_h, offset_x, offset_y) — how to position the
    original image on the expanded canvas.
    """
    if aspect_ratio not in ASPECT_RATIOS:
        raise ValueError(f"Unknown aspect ratio: {aspect_ratio}")

    ar_w, ar_h = ASPECT_RATIOS[aspect_ratio]
    target_ar = ar_w / ar_h
    orig_ar   = orig_w / orig_h

    if direction in ("horizontal", "right", "left", "all"):
        # fix height, expand width
        new_h = orig_h
        new_w = max(orig_w, int(round(orig_h * target_ar)))
    elif direction in ("vertical", "top", "bottom"):
        # fix width, expand height
        new_w = orig_w
        new_h = max(orig_h, int(round(orig_w / target_ar)))
    else:  # "all" fallback
        new_h = orig_h
        new_w = max(orig_w, int(round(orig_h * target_ar)))

    # Placement of original inside canvas
    if direction == "right":
        offset_x, offset_y = 0, 0
    elif direction == "left":
        offset_x, offset_y = new_w - orig_w, 0
    elif direction == "bottom":
        offset_x, offset_y = 0, 0
    elif direction == "top":
        offset_x, offset_y = 0, new_h - orig_h
    elif direction == "horizontal":
        offset_x = (new_w - orig_w) // 2
        offset_y = 0
    elif direction == "vertical":
        offset_x = 0
        offset_y = (new_h - orig_h) // 2
    else:  # all / center
        offset_x = (new_w - orig_w) // 2
        offset_y = (new_h - orig_h) // 2

    return new_w, new_h, offset_x, offset_y


def build_canvas_and_mask(image: Image.Image, new_w: int, new_h: int, offset_x: int, offset_y: int):
    """Build expanded canvas (edge-stretched fill) + binary mask."""
    orig_w, orig_h = image.size
    canvas = Image.new("RGB", (new_w, new_h))

    # ── fill empty regions with stretched edge pixels ──
    # left strip
    if offset_x > 0:
        left_edge = image.crop((0, 0, 1, orig_h)).resize((offset_x, orig_h))
        canvas.paste(left_edge, (0, offset_y))
    # right strip
    right_start = offset_x + orig_w
    if right_start < new_w:
        right_edge = image.crop((orig_w - 1, 0, orig_w, orig_h)).resize((new_w - right_start, orig_h))
        canvas.paste(right_edge, (right_start, offset_y))
    # top strip
    if offset_y > 0:
        top_edge = image.crop((0, 0, orig_w, 1)).resize((orig_w, offset_y))
        canvas.paste(top_edge, (offset_x, 0))
    # bottom strip
    bottom_start = offset_y + orig_h
    if bottom_start < new_h:
        bot_edge = image.crop((0, orig_h - 1, orig_w, orig_h)).resize((orig_w, new_h - bottom_start))
        canvas.paste(bot_edge, (offset_x, bottom_start))

    # paste original
    canvas.paste(image, (offset_x, offset_y))

    # ── mask: white = region to generate ──
    mask = np.ones((new_h, new_w), dtype=np.uint8) * 255
    mask[offset_y:offset_y + orig_h, offset_x:offset_x + orig_w] = 0
    mask_image = Image.fromarray(mask)

    return canvas, mask_image


def get_prompt_from_groq(image: Image.Image, api_key: str) -> tuple[str, str]:
    """Auto-generate prompts using Groq's vision model (Llama 4 Scout)."""
    client = groq.Groq(api_key=api_key)

    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}},
                {"type": "text", "text": (
                    "Analyze this image carefully. "
                    "I am doing outpainting — extending the edges using Stable Diffusion inpainting. "
                    "Generate TWO things:\n"
                    "1. A detailed photorealistic positive prompt (scene, lighting, colors, style, quality tags like 8k, highly detailed).\n"
                    "2. A negative prompt listing things to avoid.\n\n"
                    "Respond ONLY in this exact format (no extra text):\n"
                    "POSITIVE: <your positive prompt here>\n"
                    "NEGATIVE: <your negative prompt here>"
                )}
            ]
        }],
        max_tokens=512
    )

    lines = response.choices[0].message.content.strip().splitlines()
    positive, negative = "", ""
    for line in lines:
        if line.startswith("POSITIVE:"):
            positive = line.replace("POSITIVE:", "").strip()
        elif line.startswith("NEGATIVE:"):
            negative = line.replace("NEGATIVE:", "").strip()

    if not positive:
        positive = "photorealistic scene, highly detailed, 8k, natural lighting"
    if not negative:
        negative = "blurry, low quality, distorted, watermark, text, bad anatomy, ugly, duplicate"

    return positive, negative


def run_outpainting(
    image: Image.Image,
    aspect_ratio: str,
    direction: str,
    prompt: Optional[str],
    negative_prompt: Optional[str],
) -> Image.Image:
    """Core outpainting logic — mirrors your notebook pipeline."""
    orig_w, orig_h = image.size

    # 1. Compute expansion
    new_w, new_h, off_x, off_y = compute_expansion(orig_w, orig_h, aspect_ratio, direction)

    # 2. Build canvas + mask
    canvas, mask_img = build_canvas_and_mask(image, new_w, new_h, off_x, off_y)

    # 3. Auto-generate prompts via Groq if not provided
    if not prompt and GROQ_API_KEY:
        try:
            prompt, negative_prompt = get_prompt_from_groq(image, GROQ_API_KEY)
            print(f"  Groq prompt: {prompt[:80]}…")
        except Exception as e:
            print(f"  Groq failed ({e}), using fallback prompt")
            prompt = "photorealistic scene, highly detailed, 8k, natural lighting"
            negative_prompt = "blurry, low quality, distorted, watermark, text, bad anatomy"
    elif not prompt:
        prompt = "photorealistic scene, highly detailed, 8k, natural lighting"
        negative_prompt = negative_prompt or "blurry, low quality, distorted, watermark, text"

    # 4. Resize to 512×512 (SD v1.5 requirement)
    canvas_512 = canvas.resize((512, 512))
    mask_512   = mask_img.resize((512, 512), Image.NEAREST)

    # 5. Run inpainting
    result_512 = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        image=canvas_512,
        mask_image=mask_512,
        num_inference_steps=50,
        guidance_scale=8.5,
        strength=0.99,
    ).images[0]

    # 6. Scale result back to target canvas size
    result = result_512.resize((new_w, new_h), Image.LANCZOS)
    return result


# ─── Background worker ────────────────────────────────────────────────────────
def process_job(job_id: str, image: Image.Image, aspect_ratio: str,
                direction: str, prompt: str, negative_prompt: str):
    try:
        jobs[job_id]["status"] = "processing"
        result = run_outpainting(image, aspect_ratio, direction, prompt, negative_prompt)
        out_path = RESULTS_DIR / f"{job_id}.png"
        result.save(out_path)
        jobs[job_id]["status"] = "done"
        jobs[job_id]["result_url"] = f"/results/{job_id}.png"
        print(f"✅ Job {job_id} done → {out_path}")
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
        print(f"❌ Job {job_id} failed: {e}")


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": pipe is not None,
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "groq_enabled": bool(GROQ_API_KEY),
    }


@app.post("/extend")
async def extend_image(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    aspect_ratio: str = Form("16:9"),
    direction: str    = Form("all"),
    prompt: Optional[str]          = Form(None),
    negative_prompt: Optional[str] = Form(None),
    async_mode: bool  = Form(False),   # set True for async job-based response
):
    """
    Main endpoint — accepts multipart/form-data.
    Frontend sends: image file + aspect_ratio + direction + prompt (optional)
    
    Sync mode (default):  processes immediately, returns { result_url, job_id, metadata }
    Async mode:           returns job_id immediately, poll /jobs/{job_id} for status
    """
    if pipe is None:
        raise HTTPException(503, "Model not loaded yet, try again in a moment")
    if aspect_ratio not in ASPECT_RATIOS:
        raise HTTPException(400, f"Invalid aspect_ratio. Choose from: {list(ASPECT_RATIOS.keys())}")

    # Read and validate image
    contents = await image.read()
    try:
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Could not read image. Send JPG, PNG, or WEBP.")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "pending", "result_url": None, "error": None}

    if async_mode:
        # Fire and forget — frontend polls /jobs/{job_id}
        background_tasks.add_task(
            process_job, job_id, pil_image, aspect_ratio, direction, prompt, negative_prompt
        )
        return JSONResponse({"job_id": job_id, "status": "pending"})
    else:
        # Synchronous — block until done (works for fast GPUs)
        try:
            result = run_outpainting(pil_image, aspect_ratio, direction, prompt, negative_prompt)
            out_path = RESULTS_DIR / f"{job_id}.png"
            result.save(out_path)
            jobs[job_id]["status"] = "done"
            orig_w, orig_h = pil_image.size
            new_w, new_h, _, _ = compute_expansion(orig_w, orig_h, aspect_ratio, direction)
            return JSONResponse({
                "result_url": f"/results/{job_id}.png",
                "job_id": job_id,
                "metadata": {
                    "original_size": [orig_w, orig_h],
                    "result_size":   [new_w, new_h],
                    "aspect_ratio":  aspect_ratio,
                    "direction":     direction,
                }
            })
        except Exception as e:
            raise HTTPException(500, str(e))


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    """Poll async job status."""
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    job = jobs[job_id]
    return {
        "job_id":     job_id,
        "status":     job["status"],          # pending | processing | done | failed
        "result_url": job.get("result_url"),
        "error":      job.get("error"),
    }


@app.get("/results/{job_id}.png")
def get_result(job_id: str):
    """Serve the result image directly."""
    path = RESULTS_DIR / f"{job_id}.png"
    if not path.exists():
        raise HTTPException(404, "Result not found")
    return FileResponse(path, media_type="image/png")
