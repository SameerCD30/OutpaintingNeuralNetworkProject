# ExpandAI — AI Image Extension

Full-stack application: React frontend + FastAPI AI backend + Spring Boot REST API + PostgreSQL.

```
expandai/
├── frontend/        Vite + React UI
├── backend/         FastAPI outpainting server (Python)
├── springboot/      Spring Boot generation history API (Java)
└── README.md
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| Python | 3.10+ |
| Java JDK | 21 |
| Maven | 3.9+ |
| PostgreSQL | 15+ |
| CUDA GPU | Recommended (CPU works but is slow) |

---

## 1. PostgreSQL Setup

```sql
CREATE DATABASE expandai;
-- default user: postgres / password: postgres
-- or update springboot/src/main/resources/application.properties
```

---

## 2. FastAPI Backend (AI Model)

```bash
cd backend
pip install -r requirements.txt

# Set your Groq API key (optional — enables auto-prompt generation)
export GROQ_API_KEY=your-groq-api-key
export FRONTEND_URL=http://localhost:5173

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Model downloads automatically on first run (~5 GB for SD v1.5).

**Endpoints:**
- `POST /extend` — run outpainting (multipart: image, aspect_ratio, direction, prompt)
- `GET  /jobs/{id}` — poll async job
- `GET  /results/{id}.png` — download result
- `GET  /health` — health check

---

## 3. Spring Boot Backend (Generation History)

```bash
cd springboot
./mvnw spring-boot-maven-plugin:run
# or
mvn spring-boot:run
```

Edit `src/main/resources/application.properties` to set your DB credentials.

**Endpoints:**
- `POST   /api/generations` — save generation
- `GET    /api/generations?page=0&size=20` — paginated history
- `GET    /api/generations/{id}` — single record
- `DELETE /api/generations/{id}` — delete
- `GET    /actuator/health` — health

---

## 4. Frontend (React + Vite)

```bash
cd frontend
cp .env.example .env
# .env already points to localhost:8000 and localhost:8080

npm install
npm run dev
```

Open http://localhost:5173

---

## How It Works

1. User uploads an image in the Studio page
2. Selects aspect ratio (1:1, 16:9, 9:16, 21:9, etc.) and direction
3. Frontend sends `multipart/form-data` to FastAPI `/extend`
4. FastAPI:
   - Computes new canvas size from aspect ratio + direction
   - Fills edges with stretched border pixels
   - If no prompt → Groq Llama 4 Scout vision model auto-generates prompt
   - Resizes to 512×512, runs Stable Diffusion inpainting
   - Scales result back to target size, saves PNG
5. Frontend displays result + download button
6. Generation metadata saved to PostgreSQL via Spring Boot
7. Gallery page loads history from Spring Boot `/api/generations`

---

## Environment Variables

### Frontend (`frontend/.env`)
```
VITE_FASTAPI_URL=http://localhost:8000
VITE_SPRING_URL=http://localhost:8080
```

### FastAPI (`backend/`)
```
GROQ_API_KEY=your-groq-api-key
FRONTEND_URL=http://localhost:5173
```

### Spring Boot (`application.properties`)
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/expandai
spring.datasource.username=postgres
spring.datasource.password=postgres
```
