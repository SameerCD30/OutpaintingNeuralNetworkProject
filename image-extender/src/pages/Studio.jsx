import { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, X, Sparkles, Download, RotateCcw, ChevronDown,
  Loader2, CheckCircle, AlertCircle, ImageIcon, Wand2
} from 'lucide-react';
import { useImageExtension, ASPECT_RATIOS, EXTENSION_DIRECTIONS } from '../hooks/useImageExtension';
import './Studio.css';

function StatusBar({ status, jobStatus, progress }) {
  const map = {
    uploading: { icon: <Loader2 size={16} className="spin" />, label: `Uploading… ${progress}%`, color: '#3b82f6' },
    processing: { icon: <Loader2 size={16} className="spin" />, label: jobStatus || 'AI is working its magic…', color: '#8b5cf6' },
    done: { icon: <CheckCircle size={16} />, label: 'Extension complete!', color: '#10b981' },
    error: { icon: <AlertCircle size={16} />, label: 'Something went wrong', color: '#ef4444' },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <div className="status-bar" style={{ borderColor: s.color + '40', background: s.color + '12' }}>
      <span style={{ color: s.color }}>{s.icon}</span>
      <span style={{ color: s.color }}>{s.label}</span>
    </div>
  );
}

function AspectRatioGrid({ selected, onChange }) {
  return (
    <div className="ratio-grid">
      {ASPECT_RATIOS.map((r) => {
        const maxH = 36;
        const maxW = 52;
        const scale = Math.min(maxW / r.w, maxH / r.h);
        const w = Math.round(r.w * scale);
        const h = Math.round(r.h * scale);
        return (
          <button
            key={r.value}
            className={`ratio-btn ${selected === r.value ? 'selected' : ''}`}
            onClick={() => onChange(r.value)}
            title={r.desc}
          >
            <div
              className="ratio-preview-box"
              style={{ width: w, height: h }}
            />
            <span className="ratio-label">{r.label}</span>
            <span className="ratio-desc">{r.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function Studio() {
  const {
    image, preview, aspectRatio, direction, prompt,
    result, status, jobStatus, error, uploadProgress,
    setAspectRatio, setDirection, setPrompt,
    handleImageSelect, clearImage, generate, reset,
  } = useImageExtension();

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) handleImageSelect(accepted[0]);
  }, [handleImageSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  const downloadResult = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result;
    a.download = `extended-${aspectRatio.replace(':', 'x')}.png`;
    a.click();
  };

  const isLoading = status === 'uploading' || status === 'processing';

  return (
    <main className="studio">
      <div className="studio-header">
        <h1 className="studio-title">
          <Wand2 size={28} />
          Image Studio
        </h1>
        <p className="studio-subtitle">Upload an image and expand it to any aspect ratio</p>
      </div>

      <div className="studio-layout">
        {/* Left Panel: Controls */}
        <aside className="control-panel">
          <section className="panel-section">
            <h3 className="panel-label">Upload Image</h3>
            {!preview ? (
              <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'dragging' : ''}`}
              >
                <input {...getInputProps()} />
                <div className="dropzone-content">
                  <div className="dropzone-icon">
                    <Upload size={28} />
                  </div>
                  <p className="dropzone-text">
                    {isDragActive ? 'Drop it here!' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="dropzone-hint">JPG, PNG, WEBP · Max 20MB</p>
                </div>
              </div>
            ) : (
              <div className="image-preview-container">
                <img src={preview} alt="Uploaded" className="image-preview" />
                <button className="clear-btn" onClick={clearImage} title="Remove image">
                  <X size={14} />
                </button>
                <div className="image-name">{image?.name}</div>
              </div>
            )}
          </section>

          <section className="panel-section">
            <h3 className="panel-label">Target Aspect Ratio</h3>
            <AspectRatioGrid selected={aspectRatio} onChange={setAspectRatio} />
          </section>

          <section className="panel-section">
            <h3 className="panel-label">Extension Direction</h3>
            <select
              className="select-input"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              {EXTENSION_DIRECTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </section>

          <section className="panel-section">
            <h3 className="panel-label">Optional Prompt <span className="optional-tag">optional</span></h3>
            <textarea
              className="prompt-input"
              placeholder="Describe what should be added in the extended area… (e.g. 'lush forest', 'city skyline')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </section>

          <div className="action-buttons">
            <button
              className="btn-generate"
              onClick={generate}
              disabled={!image || isLoading}
            >
              {isLoading ? (
                <><Loader2 size={18} className="spin" /> Processing…</>
              ) : (
                <><Sparkles size={18} /> Generate Extension</>
              )}
            </button>
            {(result || status !== 'idle') && (
              <button className="btn-reset" onClick={reset}>
                <RotateCcw size={15} /> Reset
              </button>
            )}
          </div>

          <StatusBar status={status} jobStatus={jobStatus} progress={uploadProgress} />
          {error && <p className="error-text"><AlertCircle size={14} /> {error}</p>}
        </aside>

        {/* Right Panel: Result */}
        <div className="result-panel">
          {!result ? (
            <div className="result-placeholder">
              <div className="placeholder-icon">
                <ImageIcon size={40} />
              </div>
              <h3>Your extended image will appear here</h3>
              <p>Upload an image and click Generate to get started</p>

              {preview && (
                <div className="preview-hint">
                  <div className="preview-hint-img">
                    <img src={preview} alt="preview" />
                  </div>
                  <div className="preview-hint-info">
                    <span>→</span>
                    <div className="preview-hint-target" style={{
                      aspectRatio: aspectRatio.replace(':', '/'),
                    }}>
                      <span>{aspectRatio}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="result-container">
              <div className="result-toolbar">
                <span className="result-badge"><CheckCircle size={13} /> Extension Ready</span>
                <button className="btn-download" onClick={downloadResult}>
                  <Download size={15} /> Download
                </button>
              </div>
              <div className="result-image-wrap">
                <img src={result} alt="Extended result" className="result-image" />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
