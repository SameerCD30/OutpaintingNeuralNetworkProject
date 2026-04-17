import { useState, useCallback } from 'react';
import { extendImage, pollJobUntilDone } from '../services/api';

export const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1', desc: 'Square', icon: '⬛', w: 1, h: 1 },
  { label: '4:3', value: '4:3', desc: 'Standard', icon: '🖥️', w: 4, h: 3 },
  { label: '16:9', value: '16:9', desc: 'Widescreen', icon: '📺', w: 16, h: 9 },
  { label: '9:16', value: '9:16', desc: 'Portrait', icon: '📱', w: 9, h: 16 },
  { label: '21:9', value: '21:9', desc: 'Cinematic', icon: '🎬', w: 21, h: 9 },
  { label: '3:4', value: '3:4', desc: 'Portrait HD', icon: '🖼️', w: 3, h: 4 },
  { label: '3:2', value: '3:2', desc: 'Classic', icon: '📷', w: 3, h: 2 },
  { label: '2:3', value: '2:3', desc: 'Tall', icon: '🗒️', w: 2, h: 3 },
];

export const EXTENSION_DIRECTIONS = [
  { label: 'All Sides', value: 'all' },
  { label: 'Left & Right', value: 'horizontal' },
  { label: 'Top & Bottom', value: 'vertical' },
  { label: 'Right Only', value: 'right' },
  { label: 'Left Only', value: 'left' },
  { label: 'Top Only', value: 'top' },
  { label: 'Bottom Only', value: 'bottom' },
];

export function useImageExtension() {
  const [image, setImage] = useState(null);           // File object
  const [preview, setPreview] = useState(null);       // Object URL for display
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [direction, setDirection] = useState('all');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);         // Result image URL
  const [status, setStatus] = useState('idle');       // idle | uploading | processing | done | error
  const [jobStatus, setJobStatus] = useState('');
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImageSelect = useCallback((file) => {
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setStatus('idle');
    setError(null);
  }, [preview]);

  const clearImage = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
    setResult(null);
    setStatus('idle');
    setError(null);
    setUploadProgress(0);
  }, [preview]);

  const generate = async () => {
  if (!image) return;

  setStatus("uploading");
  setUploadProgress(0);

  try {
    const formData = new FormData();
    formData.append("image", image);
    formData.append("aspectRatio", aspectRatio);
    formData.append("direction", direction);
    formData.append("prompt", prompt);

  
    const res = await fetch("http://localhost:8000/extend", {
      method: "POST",
      body: formData,
    });

    const { jobId } = await res.json();

    setStatus("processing");

    const interval = setInterval(async () => {
      const statusRes = await fetch(`/status/${jobId}`);
      const data = await statusRes.json();

      setJobStatus(data.status);

      if (data.status === "done") {
        clearInterval(interval);
        setResult(data.result);
        setStatus("done");
      }

      if (data.status === "error") {
        clearInterval(interval);
        setError(data.error || "Processing failed");
        setStatus("error");
      }
    }, 2000);

  } catch (err) {
    setError(err.message);
    setStatus("error");
  }
};

  const reset = useCallback(() => {
    clearImage();
    setAspectRatio('16:9');
    setDirection('all');
    setPrompt('');
    setJobStatus('');
  }, [clearImage]);

  return {
    // State
    image, preview, aspectRatio, direction, prompt,
    result, status, jobStatus, error, uploadProgress,
    // Setters
    setAspectRatio, setDirection, setPrompt,
    // Actions
    handleImageSelect, clearImage, generate, reset,
  };
}
