import { Link } from 'react-router-dom';
import { Sparkles, Zap, Layers, Wand2, ArrowRight, ChevronRight } from 'lucide-react';
import './Home.css';

const features = [
  {
    icon: <Wand2 size={22} />,
    title: 'AI-Powered Extension',
    desc: 'Our diffusion model intelligently extends your image content, matching lighting, texture, and style seamlessly.',
  },
  {
    icon: <Layers size={22} />,
    title: 'Any Aspect Ratio',
    desc: 'From cinematic 21:9 to mobile-first 9:16 — expand your image to any dimension with one click.',
  },
  {
    icon: <Zap size={22} />,
    title: 'Lightning Fast',
    desc: 'Optimized inference pipeline delivers stunning results in seconds, not minutes.',
  },
];

const ratios = ['1:1', '16:9', '4:3', '9:16', '21:9'];

export default function Home() {
  return (
    <main className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">
          <Sparkles size={13} />
          AI Image Extension
        </div>
        <h1 className="hero-title">
          Expand Any Image<br />
          <span className="gradient-text">Beyond Its Borders</span>
        </h1>
        <p className="hero-desc">
          Upload an image, choose your target aspect ratio, and let our AI seamlessly extend
          the canvas — preserving style, lighting, and context perfectly.
        </p>
        <div className="hero-actions">
          <Link to="/studio" className="btn-primary">
            <Zap size={16} />
            Open Studio
          </Link>
          <Link to="/how-it-works" className="btn-ghost">
            How It Works
            <ChevronRight size={16} />
          </Link>
        </div>

        {/* Floating ratio pills */}
        <div className="ratio-pills">
          {ratios.map((r) => (
            <span key={r} className="ratio-pill">{r}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="features-inner">
          <p className="section-eyebrow">Why ExpandAI</p>
          <h2 className="section-title">Everything you need to<br />resize without compromise</h2>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-card">
          <div className="cta-glow" />
          <h2>Ready to expand?</h2>
          <p>No sign-up. No limits. Just upload and extend.</p>
          <Link to="/studio" className="btn-primary large">
            Start Extending
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
