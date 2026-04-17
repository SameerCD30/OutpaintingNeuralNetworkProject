# ExpandAI — FastAPI Outpainting Server

Wraps your `Outpainting_Pipeline.ipynb` as a production-ready REST API.

## Setup

```bash
cd fastapi_server
pip install -r requirements.txt
```

Set your Groq API key (optional — enables auto-prompt generation):
```bash
export GROQ_API_KEY=your-key-here
export FRONTEND_URL=http://localhost:5173   # your React dev server
```

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## API Endpoints

### `POST /extend` — Main outpainting endpoint

**Form fields:**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `image` | file | ✅ | — | JPG / PNG / WEBP |
| `aspect_ratio` | string | ✅ | `16:9` | One of: `1:1`, `4:3`, `16:9`, `9:16`, `21:9`, `3:4`, `3:2`, `2:3` |
| `direction` | string | — | `all` | `all`, `horizontal`, `vertical`, `left`, `right`, `top`, `bottom` |
| `prompt` | string | — | auto | Leave empty → Groq auto-generates from image |
| `negative_prompt` | string | — | auto | Same |
| `async_mode` | bool | — | `false` | `true` = returns job_id immediately, poll `/jobs/{id}` |

**Sync response** (default):
```json
{
  "result_url": "/results/abc123.png",
  "job_id": "abc123",
  "metadata": {
    "original_size": [800, 600],
    "result_size": [1067, 600],
    "aspect_ratio": "16:9",
    "direction": "all"
  }
}
```

**Async response** (`async_mode=true`):
```json
{ "job_id": "abc123", "status": "pending" }
```

---

### `GET /jobs/{job_id}` — Poll async job

```json
{
  "job_id": "abc123",
  "status": "done",        // pending | processing | done | failed
  "result_url": "/results/abc123.png",
  "error": null
}
```

### `GET /results/{job_id}.png` — Download result image

### `GET /health` — Health check

```json
{ "status": "ok", "model_loaded": true, "device": "cuda", "groq_enabled": true }
```

---

## How prompt generation works

1. If you pass a `prompt` → it's used directly
2. If `prompt` is empty and `GROQ_API_KEY` is set → Groq's Llama 4 Scout vision model analyzes your image and auto-generates a photorealistic prompt (exactly like your notebook)
3. If neither → a generic fallback prompt is used

## Frontend `.env`

```
VITE_FASTAPI_URL=http://localhost:8000
VITE_SPRING_URL=http://localhost:8080
```
