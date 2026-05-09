---
title: Legal Appeal Prediction API
emoji: ⚖️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Legal Appeal Prediction API

FastAPI backend for the Legal Appeal Outcome Prediction system.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/predict/` | Predict appeal outcome |
| POST | `/api/predict/stream` | Streaming prediction with explanation |
| POST | `/api/similar/` | Find similar precedent cases |
| POST | `/api/brief/stream` | Generate appellate brief |
| POST | `/api/rag/` | RAG-based Q&A |
| GET | `/health` | Health check |

## Required Secret

Set `OPENAI_API_KEY` in your Space's **Settings → Variables and secrets**.

## Allowed Origins

Set `ALLOWED_ORIGINS` in Space secrets to a comma-separated list of your
frontend URLs, e.g.:

```
https://your-app.vercel.app,https://your-app.netlify.app
```

If not set, only `localhost:3000` is allowed (development mode).
