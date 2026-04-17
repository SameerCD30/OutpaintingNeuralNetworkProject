import { Link } from 'react-router-dom';
import { Upload, Crop, Cpu, Sparkles, Zap, ArrowRight } from 'lucide-react';
import './HowItWorks.css';

const steps = [
  {
    number: '01',
    icon: <Upload size={24} />,
    title: 'Upload Your Image',
    desc: 'Drop any JPG, PNG, or WEBP image into the studio. Our system analyzes the content, edges, colors, and textures.',
    detail: 'Supports up to 20MB. No resizing needed — we handle any resolution.',
    color: '#3b82f6',
  },
  {
    number: '02',
    icon: <Crop size={24} />,
    title: 'Choose Aspect Ratio',
    desc: 'Select your target aspect ratio from 8 presets — from square to cinematic widescreen. Preview how the canvas will expand.',
    detail: 'You can also specify which direction (sides, top, bottom) the extension goes.',
    color: '#06b6d4',
  },
  {
    number: '03',
    icon: <Cpu size={24} />,
    title: 'AI Processes & Extends',
    desc: 'Our diffusion model reads the existing content and generates coherent, context-aware pixels to fill the expanded area.',
    detail: 'Powered by FastAPI + your AI model. Typically completes in 5–15 seconds.',
    color: '#8b5cf6',
  },
  {
    number: '04',
    icon: <Sparkles size={24} />,
    title: 'Download the Result',
    desc: 'Your extended image is ready. Download it at full resolution or save it to your gallery via the Spring Boot backend.',
    detail: 'All results stored in your personal gallery for future access.',
    color: '#10b981',
  },
];

const techStack = [
  { label: 'Frontend', tech: 'React + Vite', color: '#3b82f6' },
  { label: 'Orchestration', tech: 'Spring Boot', color: '#06b6d4' },
  { label: 'AI Inference', tech: 'FastAPI + Python', color: '#8b5cf6' },
  { label: 'Routing', tech: 'React Router v6', color: '#f59e0b' },
];

export default function HowItWorks() {
  return (
    <main className="how-page">
      <div className="how-inner">
        <div className="how-header">
          <p className="section-eyebrow">Under the Hood</p>
          <h1 className="how-title">How It Works</h1>
          <p className="how-subtitle">
            ExpandAI uses a full-stack AI pipeline to intelligently extend any image
            — preserving context and style in every pixel.
          </p>
        </div>

        {/* Steps */}
        <div className="steps-list">
          {steps.map((step, i) => (
            <div key={i} className="step-card" style={{ '--step-color': step.color }}>
              <div className="step-number">{step.number}</div>
              <div className="step-content">
                <div className="step-icon" style={{ color: step.color, background: step.color + '15', borderColor: step.color + '30' }}>
                  {step.icon}
                </div>
                <div>
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-desc">{step.desc}</p>
                  <p className="step-detail">{step.detail}</p>
                </div>
              </div>
              {i < steps.length - 1 && <div className="step-connector" />}
            </div>
          ))}
        </div>

        {/* Tech Stack */}
        <div className="tech-section">
          <h2 className="tech-title">Tech Stack</h2>
          <div className="tech-grid">
            {techStack.map((t, i) => (
              <div key={i} className="tech-card">
                <span className="tech-label">{t.label}</span>
                <span className="tech-name" style={{ color: t.color }}>{t.tech}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API Reference */}
        <div className="api-section">
          <h2 className="api-title">Backend API Reference</h2>
          <p className="api-subtitle">
            Configure your backend URLs in <code>.env</code> — the frontend auto-routes to them.
          </p>
          <div className="api-cards">
            <div className="api-card">
              <div className="api-tag fastapi">FastAPI</div>
              <h4>Image Extension</h4>
              <div className="api-endpoint">
                <span className="method post">POST</span>
                <code>/extend</code>
              </div>
              <p>Accepts multipart/form-data with <code>image</code>, <code>aspect_ratio</code>, <code>direction</code>, <code>prompt</code>. Returns <code>result_url</code> (sync) or <code>job_id</code> (async).</p>
              <div className="api-endpoint">
                <span className="method get">GET</span>
                <code>/jobs/&#123;job_id&#125;</code>
              </div>
              <p>Poll async job status. Returns <code>&#123;status, result_url&#125;</code>.</p>
              <div className="api-endpoint">
                <span className="method get">GET</span>
                <code>/health</code>
              </div>
              <p>Health check.</p>
            </div>
            <div className="api-card">
              <div className="api-tag spring">Spring Boot</div>
              <h4>Generation History</h4>
              <div className="api-endpoint">
                <span className="method post">POST</span>
                <code>/api/generations</code>
              </div>
              <p>Save a generation result with metadata.</p>
              <div className="api-endpoint">
                <span className="method get">GET</span>
                <code>/api/generations</code>
              </div>
              <p>Paginated list. Params: <code>page</code>, <code>size</code>.</p>
              <div className="api-endpoint">
                <span className="method delete">DELETE</span>
                <code>/api/generations/&#123;id&#125;</code>
              </div>
              <p>Delete a generation record.</p>
            </div>
          </div>
          <div className="env-block">
            <h4>Environment Variables (.env)</h4>
            <pre>
{`VITE_FASTAPI_URL=http://localhost:8000
VITE_SPRING_URL=http://localhost:8080`}
            </pre>
          </div>
        </div>

        <div className="how-cta">
          <Link to="/studio" className="btn-go">
            <Zap size={18} />
            Try it yourself
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}
