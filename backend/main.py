"""
FastAPI main application for Legal Outcome Prediction Engine.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from routers import predict, similar, rag, brief

# Load environment variables from .env file
# Try loading from backend directory first, then root
load_dotenv()  # This loads from current directory or parent
load_dotenv(dotenv_path=".env")  # Explicitly try current directory
load_dotenv(dotenv_path="../.env")  # Try parent directory

# Debug: Check if API key is loaded (don't print the actual key)
api_key_loaded = bool(os.getenv("OPENAI_API_KEY"))
print(f"OPENAI_API_KEY loaded: {api_key_loaded}")

app = FastAPI(
    title="Legal Outcome Prediction API",
    description="API for predicting legal case outcomes using LegalBERT and ML models",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
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
    uvicorn.run(app, host="0.0.0.0", port=8000)

    # Confusion matrix
