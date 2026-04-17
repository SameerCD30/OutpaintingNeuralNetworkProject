import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Menu, X, Zap } from 'lucide-react';
import './Navbar.css';

const navLinks = [
  { label: 'Studio', path: '/studio' },
  { label: 'How It Works', path: '/how-it-works' },
  { label: 'Gallery', path: '/gallery' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner">
          <Link to="/" className="brand">
            <div className="brand-icon">
              <Sparkles size={16} />
            </div>
            <span className="brand-name">ExpandAI</span>
          </Link>

          <div className="nav-links">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.label}
                {location.pathname === link.path && <span className="active-dot" />}
              </Link>
            ))}
          </div>

          <div className="nav-right">
            <Link to="/studio" className="btn-try">
              <Zap size={14} />
              Try Free
            </Link>
            <button
              className="hamburger"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        <div className="mobile-menu-inner">
          <div className="mobile-links">
            {navLinks.map((link, i) => (
              <Link
                key={link.path}
                to={link.path}
                className={`mobile-link ${location.pathname === link.path ? 'active' : ''}`}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
                <span>{link.label}</span>
                <span className="mobile-link-arrow">→</span>
              </Link>
            ))}
          </div>
          <Link to="/studio" className="btn-mobile-cta">
            <Zap size={16} />
            Open Studio — It's Free
          </Link>
        </div>
      </div>

      {open && <div className="mobile-overlay" onClick={() => setOpen(false)} />}
    </>
  );
}
