import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Images, Trash2, Download, Loader2, AlertCircle, Plus } from 'lucide-react';
import { getGenerations, deleteGeneration } from '../services/api';
import './Gallery.css';

// Placeholder items shown when backend isn't connected yet
const PLACEHOLDER_ITEMS = [
  { id: 1, original: null, result: null, aspectRatio: '16:9', createdAt: new Date().toISOString(), placeholder: true },
  { id: 2, original: null, result: null, aspectRatio: '1:1', createdAt: new Date().toISOString(), placeholder: true },
  { id: 3, original: null, result: null, aspectRatio: '9:16', createdAt: new Date().toISOString(), placeholder: true },
  { id: 4, original: null, result: null, aspectRatio: '21:9', createdAt: new Date().toISOString(), placeholder: true },
];

function GalleryCard({ item, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Remove this generation?')) return;
    setDeleting(true);
    try {
      await onDelete(item.id);
    } catch {
      setDeleting(false);
    }
  };

  const handleDownload = () => {
    if (!item.result) return;
    const a = document.createElement('a');
    a.href = item.result;
    a.download = `expanded-${item.aspectRatio.replace(':', 'x')}.png`;
    a.click();
  };

  if (item.placeholder) {
    return (
      <div className="gallery-card placeholder-card">
        <div className="card-img-wrap skeleton" />
        <div className="card-footer">
          <span className="card-ratio skeleton-text" style={{ width: 40 }} />
          <span className="card-date skeleton-text" style={{ width: 80 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-card">
      <div className="card-img-wrap">
        <img src={item.result || item.original} alt={`Generation ${item.id}`} />
        <div className="card-overlay">
          <button className="card-action-btn" onClick={handleDownload} title="Download">
            <Download size={15} />
          </button>
          <button
            className="card-action-btn danger"
            onClick={handleDelete}
            disabled={deleting}
            title="Delete"
          >
            {deleting ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
          </button>
        </div>
      </div>
      <div className="card-footer">
        <span className="card-ratio">{item.aspectRatio}</span>
        <span className="card-date">{new Date(item.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [backendReady, setBackendReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getGenerations(page, 20);
        setItems(data.content || data);
        setHasMore(data.totalPages ? page < data.totalPages - 1 : false);
        setBackendReady(true);
      } catch (err) {
        // Backend not connected yet — show placeholder UI
        setBackendReady(false);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page]);

  const handleDelete = async (id) => {
    await deleteGeneration(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <main className="gallery-page">
      <div className="gallery-header">
        <div className="gallery-title-row">
          <h1 className="gallery-title">
            <Images size={26} /> Gallery
          </h1>
          <Link to="/studio" className="btn-new">
            <Plus size={15} /> New Extension
          </Link>
        </div>
        <p className="gallery-subtitle">Your AI-generated image extensions</p>
      </div>

      {loading && (
        <div className="gallery-grid">
          {PLACEHOLDER_ITEMS.map((item) => (
            <GalleryCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {!loading && !backendReady && (
        <div className="gallery-empty">
          <div className="empty-icon"><AlertCircle size={36} /></div>
          <h3>Backend not connected</h3>
          <p>
            The Spring Boot backend at <code>VITE_SPRING_URL</code> isn't reachable yet.<br />
            Once connected, your generation history will appear here.
          </p>
          <Link to="/studio" className="btn-primary-sm">Start Creating</Link>
        </div>
      )}

      {!loading && backendReady && items.length === 0 && (
        <div className="gallery-empty">
          <div className="empty-icon"><Images size={40} /></div>
          <h3>No generations yet</h3>
          <p>Your extended images will be saved here automatically.</p>
          <Link to="/studio" className="btn-primary-sm">Open Studio</Link>
        </div>
      )}

      {!loading && backendReady && items.length > 0 && (
        <>
          <div className="gallery-grid">
            {items.map((item) => (
              <GalleryCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
          {hasMore && (
            <div className="load-more">
              <button className="btn-load-more" onClick={() => setPage((p) => p + 1)}>
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
