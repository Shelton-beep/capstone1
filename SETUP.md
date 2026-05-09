# Setup Guide

This guide provides detailed setup instructions for the Legal Appeal Outcome Prediction System.

## Quick Start

### Prerequisites Checklist

- [ ] Python 3.10+ installed
- [ ] [uv](https://docs.astral.sh/uv/) installed (Python package manager)
- [ ] Node.js 18+ installed
- [ ] npm installed
- [ ] OpenAI API Key (optional, for GPT features)
- [ ] Git installed

### Install uv

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Or via pip
pip install uv
```

---

### Step-by-Step Setup

#### 1. Clone Repository

```bash
git clone <repository-url>
cd capstone1
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment and install all dependencies (including dev tools)
uv sync --dev

# Activate the virtual environment (optional — uv run does this automatically)
# macOS/Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate
```

> **Note:** `uv sync` automatically creates a `.venv` inside `backend/`, downloads the
> pinned Python version from `.python-version`, and installs every dependency from
> `uv.lock`. No separate `pip install` step is needed.

#### 3. Train Model

```bash
# Launch Jupyter (already installed via dev dependencies)
uv run jupyter notebook

# Open: notebooks/train_model.ipynb
# Run all cells to generate model files
```

This creates:
- `models/model.pkl`
- `models/label_encoder.pkl`
- `models/embeddings.npy`
- `models/clean_dataset.csv`

#### 4. Configure Environment

Create `backend/.env`:

```env
OPENAI_API_KEY=sk-your-key-here
```

#### 5. Start Backend

```bash
cd backend
uv run python main.py
```

Backend runs at `http://localhost:8000`

#### 6. Frontend Setup

```bash
cd frontend
npm install
```

#### 7. Start Frontend

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## Common uv Commands

| Task | Command |
|---|---|
| Install all deps | `uv sync --dev` |
| Install prod deps only | `uv sync` |
| Add a new package | `uv add <package>` |
| Add a dev package | `uv add --dev <package>` |
| Remove a package | `uv remove <package>` |
| Run a script | `uv run python <script.py>` |
| Run any tool | `uv run <tool>` |
| Update lockfile | `uv lock --upgrade` |
| Show installed packages | `uv pip list` |

---

## Verification

1. **Backend Health Check**: Visit `http://localhost:8000/health`
2. **API Docs**: Visit `http://localhost:8000/docs`
3. **Frontend**: Visit `http://localhost:3000`

---

## Troubleshooting

### Backend Issues

**Import Errors**:
- Ensure you ran `uv sync --dev` inside the `backend/` directory
- Re-run: `uv sync --dev`

**Model Not Found**:
- Train model first (see step 3)
- Check `models/` directory exists

**OpenAI API Errors**:
- Verify `.env` file exists in `backend/`
- Check API key is valid
- System works without API key (uses fallbacks)

**uv Not Found**:
- Install uv: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Restart your terminal after installation

### Frontend Issues

**Build Errors**:
- Clear cache: `rm -rf .next node_modules`
- Reinstall: `npm install`

**API Connection Errors**:
- Verify backend is running
- Check `NEXT_PUBLIC_API_URL` in `.env.local`

---

## Next Steps

- Read [README.md](README.md) for full usage instructions
- Check [API Documentation](README.md#api-documentation) for endpoints
- Review [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
