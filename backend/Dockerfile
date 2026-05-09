# ── Build stage ────────────────────────────────────────────────────────────────
FROM python:3.10-slim AS builder

WORKDIR /build

# Install uv (fast Python package manager)
RUN pip install --no-cache-dir uv

# Copy dependency spec and lockfile first for layer caching
COPY pyproject.toml uv.lock ./

# Install production deps into an isolated venv
RUN uv sync --frozen --no-dev

# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM python:3.10-slim

# HF Spaces requires a non-root user with uid 1000
RUN useradd -m -u 1000 user
USER user

ENV HOME=/home/user \
    PATH=/home/user/.local/bin:/build/.venv/bin:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /home/user/app

# Copy the venv from builder
COPY --from=builder --chown=user /build/.venv /home/user/.venv
ENV PATH="/home/user/.venv/bin:$PATH"

# Copy application source, models, and data
COPY --chown=user . .

# HF Spaces default port
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
