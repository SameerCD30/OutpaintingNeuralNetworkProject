"""
ExpandAI — FastAPI Outpainting Server
Based on Outpainting_Pipeline.ipynb

Run:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import io
import base64
import uuid
import os
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

# Config
MODEL_ID        = "runwayml/stable-diffusion-inpainting"
RESULTS_DIR     = Path("results")
RESULTS_DIR.mkdir(exist_ok=True)
GROQ_API_KEY    = os.getenv("GROQ_API_KEY", "")
FRONTEND_URL    = os.getenv("FRONTEND_URL", "http://localhost:5173")

ASPECT_RATIOS = {
    "1:1":  (1,  1),
    "4:3":  (4,  3),
    "16:9": (16, 9),
    "9:16": (9,  16),
    "21:9": (21, 9),
    "3:4":  (3,  4),
    "3:2":  (3,  2),
    "2:3":  (2,  3),
}

# Job store: { job_id: { status, result_url, error } }
jobs: dict[str, dict] = {}
pipe = None


# Startup: load model 
@asynccontextmanager
async def lifespan(app: FastAPI):
    global pipe
    print("⏳ Loading Stable Diffusion inpainting model…")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype  = torch.float16 if device == "cuda" else torch.float32
    pipe = StableDiffusionInpaintPipeline.from_pretrained(MODEL_ID, torch_dtype=dtype)
    pipe = pipe.to(device)
    pipe.safety_checker = None
    print(f"✅ Model ready on {device.upper()}")
    yield


app = FastAPI(title="ExpandAI Outpainting API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:3000", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


#Canvas helpers 
def compute_expansion(orig_w: int, orig_h: int, aspect_ratio: str, direction: str):
    """Return (new_w, new_h, offset_x, offset_y)."""
    ar_w, ar_h = ASPECT_RATIOS[aspect_ratio]
    target_ar  = ar_w / ar_h

    if direction in ("vertical", "top", "bottom"):
        new_w = orig_w
        new_h = max(orig_h, int(round(orig_w / target_ar)))
    else:                                           #horizontal/all/left/right
        new_h = orig_h
        new_w = max(orig_w, int(round(orig_h * target_ar)))

    if   direction == "right":      offset_x, offset_y = 0,                0
    elif direction == "left":       offset_x, offset_y = new_w - orig_w,   0
    elif direction == "bottom":     offset_x, offset_y = 0,                0
    elif direction == "top":        offset_x, offset_y = 0,                new_h - orig_h
    elif direction == "horizontal": offset_x, offset_y = (new_w - orig_w)//2, 0
    elif direction == "vertical":   offset_x, offset_y = 0, (new_h - orig_h)//2
    else:                           offset_x, offset_y = (new_w - orig_w)//2, (new_h - orig_h)//2

    return new_w, new_h, offset_x, offset_y


def build_canvas_and_mask(image: Image.Image, new_w, new_h, off_x, off_y):
    """Edge-stretch fill (from notebook) + binary mask."""
    orig_w, orig_h = image.size
    canvas = Image.new("RGB", (new_w, new_h))

    # Fill edges with stretched border pixels
    if off_x > 0:
        canvas.paste(image.crop((0, 0, 1, orig_h)).resize((off_x, orig_h)), (0, off_y))
    rx = off_x + orig_w
    if rx < new_w:
        canvas.paste(image.crop((orig_w-1, 0, orig_w, orig_h)).resize((new_w-rx, orig_h)), (rx, off_y))
    if off_y > 0:
        canvas.paste(image.crop((0, 0, orig_w, 1)).resize((orig_w, off_y)), (off_x, 0))
    by = off_y + orig_h
    if by < new_h:
        canvas.paste(image.crop((0, orig_h-1, orig_w, orig_h)).resize((orig_w, new_h-by)), (off_x, by))

    # Corners (fill with nearest edge pixel)
    if off_x > 0 and off_y > 0:
        corner_color = image.getpixel((0, 0))
        for cx in range(off_x):
            for cy in range(off_y):
                canvas.putpixel((cx, cy), corner_color)
    if rx < new_w and off_y > 0:
        corner_color = image.getpixel((orig_w-1, 0))
        for cx in range(rx, new_w):
            for cy in range(off_y):
                canvas.putpixel((cx, cy), corner_color)
    if off_x > 0 and by < new_h:
        corner_color = image.getpixel((0, orig_h-1))
        for cx in range(off_x):
            for cy in range(by, new_h):
                canvas.putpixel((cx, cy), corner_color)
    if rx < new_w and by < new_h:
        corner_color = image.getpixel((orig_w-1, orig_h-1))
        for cx in range(rx, new_w):
            for cy in range(by, new_h):
                canvas.putpixel((cx, cy), corner_color)

    # Paste original
    canvas.paste(image, (off_x, off_y))

    # White mask = region to generate
    mask = np.ones((new_h, new_w), dtype=np.uint8) * 255
    mask[off_y:off_y+orig_h, off_x:off_x+orig_w] = 0

    return canvas, Image.fromarray(mask)


def get_groq_prompt(image: Image.Image) -> tuple[str, str]:
    client = groq.Groq(api_key=GROQ_API_KEY)

    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    b64 = base64.b64encode(buf.getvalue()).decode()

    resp = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                {"type": "text", "text": (
                    "I am doing outpainting — extending image edges with Stable Diffusion inpainting. "
                    "Analyze the image carefully and generate:\n"
                    "1. A detailed photorealistic positive prompt (scene, lighting, colors, style, quality tags).\n"
                    "2. A negative prompt listing things to avoid.\n\n"
                    "Respond ONLY in this exact format:\n"
                    "POSITIVE: <positive prompt>\n"
                    "NEGATIVE: <negative prompt>"
                )}
            ]
        }],
        max_tokens=512,
    )

    positive, negative = "", ""
    for line in resp.choices[0].message.content.strip().splitlines():
        if line.startswith("POSITIVE:"): positive = line.replace("POSITIVE:", "").strip()
        if line.startswith("NEGATIVE:"): negative = line.replace("NEGATIVE:", "").strip()

    return (
        positive or "photorealistic scene, highly detailed, 8k, natural lighting, sharp focus",
        negative or "blurry, low quality, distorted, watermark, text, bad anatomy, ugly",
    )


# ── Core outpainting ──────────────────────────────────────────────────────────
def run_outpainting(
    image: Image.Image,
    aspect_ratio: str,
    direction: str,
    prompt: Optional[str],
    negative_prompt: Optional[str],
) -> tuple[Image.Image, dict]:

    orig_w, orig_h = image.size
    new_w, new_h, off_x, off_y = compute_expansion(orig_w, orig_h, aspect_ratio, direction)
    canvas, mask = build_canvas_and_mask(image, new_w, new_h, off_x, off_y)

    # Auto-generate prompt via Groq if not provided
    if not prompt:
        if GROQ_API_KEY:
            try:
                prompt, negative_prompt = get_groq_prompt(image)
                print(f"  Groq → {prompt[:80]}…")
            except Exception as e:
                print(f"  Groq failed ({e}), using fallback")
                prompt = "photorealistic scene, highly detailed, 8k, natural lighting"
                negative_prompt = "blurry, low quality, distorted, watermark, text"
        else:
            prompt = "photorealistic scene, highly detailed, 8k, natural lighting"
            negative_prompt = negative_prompt or "blurry, low quality, distorted, watermark, text"

    # Resize to 512×512 (SD v1.5 requirement)
    canvas_512 = canvas.resize((512, 512))
    mask_512   = mask.resize((512, 512), Image.NEAREST)

    result_512 = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        image=canvas_512,
        mask_image=mask_512,
        num_inference_steps=50,
        guidance_scale=8.5,
        strength=0.99,
    ).images[0]

    # Scale back to actual target size
    result = result_512.resize((new_w, new_h), Image.LANCZOS)

    meta = {
        "original_size": [orig_w, orig_h],
        "result_size":   [new_w, new_h],
        "aspect_ratio":  aspect_ratio,
        "direction":     direction,
        "prompt":        prompt,
    }
    return result, meta


# ── Background job worker ─────────────────────────────────────────────────────
def process_job(job_id, image, aspect_ratio, direction, prompt, negative_prompt):
    try:
        jobs[job_id]["status"] = "processing"
        result, meta = run_outpainting(image, aspect_ratio, direction, prompt, negative_prompt)
        path = RESULTS_DIR / f"{job_id}.png"
        result.save(path)
        jobs[job_id]["status"]     = "done"
        jobs[job_id]["result_url"] = f"/results/{job_id}.png"
        jobs[job_id]["metadata"]   = meta
        print(f"✅ Job {job_id} done")
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"]  = str(e)
        print(f"❌ Job {job_id} failed: {e}")


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":       "ok",
        "model_loaded": pipe is not None,
        "device":       "cuda" if torch.cuda.is_available() else "cpu",
        "groq_enabled": bool(GROQ_API_KEY),
    }


@app.post("/extend")
async def extend_image(
    background_tasks: BackgroundTasks,
    image:           UploadFile      = File(...),
    aspect_ratio:    str             = Form("16:9"),
    direction:       str             = Form("all"),
    prompt:          Optional[str]   = Form(None),
    negative_prompt: Optional[str]   = Form(None),
    async_mode:      bool            = Form(False),
):
    if pipe is None:
        raise HTTPException(503, "Model not loaded yet, try again shortly")
    if aspect_ratio not in ASPECT_RATIOS:
        raise HTTPException(400, f"Invalid aspect_ratio. Valid: {list(ASPECT_RATIOS.keys())}")

    contents = await image.read()
    try:
        pil = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Cannot read image. Send JPG, PNG, or WEBP.")

    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "pending", "result_url": None, "error": None, "metadata": None}

    if async_mode:
        background_tasks.add_task(process_job, job_id, pil, aspect_ratio, direction, prompt, negative_prompt)
        return JSONResponse({"job_id": job_id, "status": "pending"})

    # Synchronous path
    try:
        result, meta = run_outpainting(pil, aspect_ratio, direction, prompt, negative_prompt)
        path = RESULTS_DIR / f"{job_id}.png"
        result.save(path)
        jobs[job_id]["status"]     = "done"
        jobs[job_id]["result_url"] = f"/results/{job_id}.png"
        jobs[job_id]["metadata"]   = meta
        return JSONResponse({
            "result_url": f"/results/{job_id}.png",
            "job_id":     job_id,
            "metadata":   meta,
        })
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "Job not found")
    j = jobs[job_id]
    return {"job_id": job_id, "status": j["status"], "result_url": j.get("result_url"), "error": j.get("error"), "metadata": j.get("metadata")}


@app.get("/results/{job_id}.png")
def serve_result(job_id: str):
    path = RESULTS_DIR / f"{job_id}.png"
    if not path.exists():
        raise HTTPException(404, "Result not found")
    return FileResponse(path, media_type="image/png")
