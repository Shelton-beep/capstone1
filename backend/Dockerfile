FROM python:3.10-slim

# Install uv system-wide (as root) so it is on PATH for all users
RUN pip install --no-cache-dir uv

# HF Spaces requires a non-root user with uid 1000
RUN useradd -m -u 1000 user
USER user

ENV HOME=/home/user \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /home/user/app

# Copy dependency spec first for Docker layer caching
COPY --chown=user pyproject.toml uv.lock ./

# Install production dependencies into .venv (at /home/user/app/.venv)
RUN uv sync --frozen --no-dev

# Copy application source, models, and data
COPY --chown=user . .

EXPOSE 7860

# uv run activates the local .venv before launching uvicorn — no path issues
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
