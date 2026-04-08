import { useState, useRef, useEffect } from "react";
import "./App.css";

const ASPECT_RATIOS = [
  { label: "1:1", value: "1:1", desc: "Square" },
  { label: "4:3", value: "4:3", desc: "Classic" },
  { label: "16:9", value: "16:9", desc: "Widescreen" },
  { label: "21:9", value: "21:9", desc: "Ultrawide" },
  { label: "3:2", value: "3:2", desc: "Photo" },
  { label: "9:16", value: "9:16", desc: "Portrait" },
];

export default function App() {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [mode, setMode] = useState(null); // 'inpaint' | 'outpaint'
  const [selectedRatio, setSelectedRatio] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const resultRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImage(url);
    setSelectedRatio(null);
    setResult(null);
    setMode(null);
  };

  const handleGetResult = async () => {
    if (!imageFile || !selectedRatio) return;
    setLoading(true);
    setResult(null);

    // ── API CALL PLACEHOLDER ──────────────────────────────────────────
    // Replace this block with your actual backend/AI call.
    // Expected: POST /api/outpaint  { file: imageFile, ratio: selectedRatio }
    // Expected response: { resultUrl: "https://..." }
    // ─────────────────────────────────────────────────────────────────
    await new Promise((r) => setTimeout(r, 1800)); // simulate latency
    setResult(image); // placeholder: echo original image as result
    // ─────────────────────────────────────────────────────────────────

    setLoading(false);
  };

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = "outpainted-result.png";
    a.click();
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <span className="logo">expand<em>.</em></span>
          <span className="tagline">AI Image Outpainting</span>
        </div>
      </header>

      {/* Two-column workspace */}
      <main className="main">
        <div className="workspace">

          {/* LEFT — Upload */}
          <section className="upload-section">
            <div
              className={`upload-zone ${image ? "has-image" : ""}`}
              onClick={() => !image && fileInputRef.current.click()}
            >
              {image ? (
                <img src={image} alt="Uploaded" className="preview-img" />
              ) : (
                <div className="upload-prompt">
                  <div className="upload-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="upload-title">Drop your image here</p>
                  <p className="upload-sub">or click to browse</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />
            </div>
            {image && (
              <button className="change-btn" onClick={() => fileInputRef.current.click()}>
                Change Image
              </button>
            )}
          </section>

          {/* RIGHT — Controls */}
          <aside className="controls-panel">

            {/* Mode Selector — always visible once image loaded, dimmed before */}
            <div className={`control-block ${!image ? "control-block--dim" : ""}`}>
              <p className="section-label">Mode</p>
              <div className="mode-buttons">
                <button
                  className={`mode-btn ${mode === "inpaint" ? "active" : ""} disabled-mode`}
                  disabled
                  title="Coming soon"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12h8M12 8v8" />
                  </svg>
                  Inpainting
                  <span className="soon-badge">Soon</span>
                </button>
                <button
                  className={`mode-btn ${mode === "outpaint" ? "active" : ""}`}
                  onClick={() => { if (image) { setMode("outpaint"); setSelectedRatio(null); setResult(null); } }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" strokeOpacity="0.4" />
                  </svg>
                  Outpainting
                </button>
              </div>
            </div>

            {/* Ratio Picker */}
            <div className={`control-block ${mode !== "outpaint" ? "control-block--dim" : ""}`}>
              <p className="section-label">Aspect Ratio</p>
              <div className="ratio-grid">
                {ASPECT_RATIOS.map((r) => (
                  <button
                    key={r.value}
                    className={`ratio-btn ${selectedRatio === r.value ? "selected" : ""}`}
                    onClick={() => { if (mode === "outpaint") { setSelectedRatio(r.value); setResult(null); } }}
                  >
                    <RatioVisual ratio={r.value} />
                    <span className="ratio-label">{r.label}</span>
                    <span className="ratio-desc">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Get Result */}
            <div className="control-block action-block">
              <button
                className={`get-result-btn ${loading ? "loading" : ""}`}
                onClick={handleGetResult}
                disabled={loading || !selectedRatio || mode !== "outpaint"}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Extending image…
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    Get Result
                  </>
                )}
              </button>
            </div>

          </aside>
        </div>
      </main>

      {/* Comparison Result */}
      {result && (
        <section className="result-section" ref={resultRef}>
          <div className="result-inner">
            <div className="result-header">
              <h2 className="result-title">Comparison</h2>
              <span className="result-ratio">{selectedRatio} · Outpainted</span>
            </div>
            <div className="compare-box">
              <div className="compare-panel">
                <span className="panel-label">Original</span>
                <img src={image} alt="Original" className="compare-img" />
              </div>
              <div className="compare-divider">
                <div className="divider-line" />
                <div className="divider-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3l4-1 4 1M8 21l4 1 4-1" />
                    <line x1="12" y1="2" x2="12" y2="22" />
                  </svg>
                </div>
                <div className="divider-line" />
              </div>
              <div className="compare-panel result-panel">
                <span className="panel-label">Result</span>
                <img src={result} alt="Result" className="compare-img" />
                <button className="download-btn" onClick={handleDownload}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="footer">
        <span>expand. — AI-powered image outpainting</span>
      </footer>
    </div>
  );
}

function RatioVisual({ ratio }) {
  const map = {
    "1:1": [1, 1], "4:3": [4, 3], "16:9": [16, 9],
    "21:9": [21, 9], "3:2": [3, 2], "9:16": [9, 16],
  };
  const [w, h] = map[ratio] || [1, 1];
  const max = 32;
  const scale = Math.max(w, h);
  const bw = Math.round((w / scale) * max);
  const bh = Math.round((h / scale) * max);
  return (
    <div className="ratio-visual" style={{ width: bw, height: bh }} />
  );
}
