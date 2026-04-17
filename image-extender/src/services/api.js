import axios from 'axios';

// ─── Base URLs ────────────────────────────────────────────────
// Spring Boot backend (orchestration, metadata, history)
const SPRING_BASE = import.meta.env.VITE_SPRING_URL || 'http://localhost:8080';

// FastAPI backend (AI model inference)
const FASTAPI_BASE = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

// ─── Axios Instances ──────────────────────────────────────────
const springClient = axios.create({
  baseURL: SPRING_BASE,
  timeout: 120_000, // 2 min for long operations
});

const fastapiClient = axios.create({
  baseURL: FASTAPI_BASE,
  timeout: 120_000,
});

// ─── Interceptors (add auth headers if needed later) ──────────
const attachInterceptors = (client) => {
  client.interceptors.request.use((config) => {
    // Add auth token here if you add auth later:
    // const token = localStorage.getItem('token');
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const msg = err.response?.data?.message || err.response?.data?.detail || err.message;
      return Promise.reject(new Error(msg));
    }
  );
};

attachInterceptors(springClient);
attachInterceptors(fastapiClient);

// ─── Image Extension API ──────────────────────────────────────

/**
 * Send image + aspect ratio to FastAPI for AI extension.
 * FastAPI endpoint: POST /extend
 * Expected response: { result_url: string, job_id: string }
 * 
 * @param {File} imageFile - The uploaded image file
 * @param {string} aspectRatio - e.g. "16:9", "1:1", "4:3", "9:16", "21:9"
 * @param {Object} options - Additional options (direction, prompt, etc.)
 * @returns {Promise<{ resultUrl: string, jobId: string }>}
 */
export async function extendImage(imageFile, aspectRatio, options = {}) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('aspect_ratio', aspectRatio);
  if (options.direction) formData.append('direction', options.direction);
  if (options.prompt) formData.append('prompt', options.prompt);
  if (options.strength !== undefined) formData.append('strength', options.strength);

  const response = await fastapiClient.post('/extend', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: options.onUploadProgress,
  });

  return {
    resultUrl: response.data.result_url,
    jobId: response.data.job_id,
    metadata: response.data.metadata || {},
  };
}

/**
 * Check status of an async extension job (if your FastAPI uses async processing).
 * FastAPI endpoint: GET /jobs/{jobId}
 * Expected response: { status: "pending"|"processing"|"done"|"failed", result_url?: string }
 */
export async function checkJobStatus(jobId) {
  const response = await fastapiClient.get(`/jobs/${jobId}`);
  return response.data;
}

/**
 * Poll a job until completion.
 * @param {string} jobId
 * @param {Function} onProgress - called with status updates
 * @returns {Promise<string>} result_url
 */
export async function pollJobUntilDone(jobId, onProgress, intervalMs = 2000, maxWaitMs = 120000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      if (Date.now() - start > maxWaitMs) {
        clearInterval(interval);
        reject(new Error('Job timed out'));
        return;
      }
      try {
        const data = await checkJobStatus(jobId);
        onProgress?.(data.status);
        if (data.status === 'done') {
          clearInterval(interval);
          resolve(data.result_url);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          reject(new Error(data.error || 'Job failed'));
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, intervalMs);
  });
}

// ─── Spring Boot API ──────────────────────────────────────────

/**
 * Save a generation result to history (Spring Boot).
 * POST /api/generations
 */
export async function saveGeneration(payload) {
  const response = await springClient.post('/api/generations', payload);
  return response.data;
}

/**
 * Get generation history (Spring Boot).
 * GET /api/generations?page=0&size=20
 */
export async function getGenerations(page = 0, size = 20) {
  const response = await springClient.get('/api/generations', {
    params: { page, size },
  });
  return response.data; // { content: [], totalPages, totalElements }
}

/**
 * Delete a generation (Spring Boot).
 * DELETE /api/generations/:id
 */
export async function deleteGeneration(id) {
  const response = await springClient.delete(`/api/generations/${id}`);
  return response.data;
}

/**
 * Health check for both backends.
 */
export async function checkHealth() {
  const results = await Promise.allSettled([
    fastapiClient.get('/health'),
    springClient.get('/actuator/health'),
  ]);
  return {
    fastapi: results[0].status === 'fulfilled',
    spring: results[1].status === 'fulfilled',
  };
}

export { springClient, fastapiClient };
