# expand. — AI Image Outpainting

A clean, minimal Vite + React frontend for AI-powered image outpainting.

## Getting Started

```bash
npm install
npm run dev
```

## Project Structure

```
src/
  App.jsx      — Main UI logic
  App.css      — All styles (design tokens + components)
  main.jsx     — React entry point
  index.css    — Global reset
vite.config.js — Vite config with /api proxy to localhost:8000
```

## Connecting Your Backend

In `App.jsx`, find the **API CALL PLACEHOLDER** block inside `handleGetResult`:

```js
// ── API CALL PLACEHOLDER ──────────────────────────────
// Replace this block with your actual backend/AI call.
// Expected: POST /api/outpaint  { file: imageFile, ratio: selectedRatio }
// Expected response: { resultUrl: "https://..." }
// ─────────────────────────────────────────────────────
await new Promise((r) => setTimeout(r, 1800)); // ← remove this
setResult(image);                               // ← replace with API call
```

### Example replacement:

```js
const formData = new FormData();
formData.append("file", imageFile);
formData.append("ratio", selectedRatio);

const res = await fetch("/api/outpaint", {
  method: "POST",
  body: formData,
});
const data = await res.json();
setResult(data.resultUrl);
```

## Features
- Upload image via click or file browser
- Mode toggle: Outpainting (active) / Inpainting (coming soon)
- 6 aspect ratio presets: 1:1, 4:3, 16:9, 21:9, 3:2, 9:16
- Side-by-side Before / After comparison
- Download result button
- Smooth scroll to result on completion
- Fully responsive (mobile-friendly)
