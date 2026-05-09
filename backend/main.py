"""
FastAPI main application for Legal Outcome Prediction Engine.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from routers import predict, similar, rag, brief

# Load environment variables (.env for local dev; secrets injected directly in production)
load_dotenv()
load_dotenv(dotenv_path=".env")
load_dotenv(dotenv_path="../.env")

api_key_loaded = bool(os.getenv("OPENAI_API_KEY"))
print(f"OPENAI_API_KEY loaded: {api_key_loaded}")

# ── CORS ──────────────────────────────────────────────────────────────────────
# In production set ALLOWED_ORIGINS to a comma-separated list of frontend URLs,
# e.g. "https://your-app.vercel.app,https://your-app.netlify.app"
_default_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

_env_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = (
    [o.strip() for o in _env_origins.split(",") if o.strip()]
    if _env_origins
    else _default_origins
)
print(f"CORS allowed origins: {allowed_origins}")

app = FastAPI(
    title="Legal Outcome Prediction API",
    description="API for predicting legal case outcomes",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(predict.router)
app.include_router(similar.router)
app.include_router(rag.router)
app.include_router(brief.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Legal Outcome Prediction API",
        "version": "1.0.0",
        "endpoints": {
            "predict": "/api/predict/",
            "predict_stream": "/api/predict/stream",
            "similar": "/api/similar/",
            "rag": "/api/rag/",
            "brief": "/api/brief/",
            "brief_stream": "/api/brief/stream"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
