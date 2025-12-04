# Setup Guide

This guide provides detailed setup instructions for the Legal Appeal Outcome Prediction System.

## Quick Start

### Prerequisites Checklist

- [ ] Python 3.8+ installed
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] OpenAI API Key (optional, for GPT features)
- [ ] Git installed

### Step-by-Step Setup

#### 1. Clone Repository

```bash
git clone <repository-url>
cd capstone1
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### 3. Train Model

```bash
# Start Jupyter
jupyter notebook

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
python main.py
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

## Verification

1. **Backend Health Check**: Visit `http://localhost:8000/health`
2. **API Docs**: Visit `http://localhost:8000/docs`
3. **Frontend**: Visit `http://localhost:3000`

## Troubleshooting

### Backend Issues

**Import Errors**:
- Ensure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

**Model Not Found**:
- Train model first (see step 3)
- Check `models/` directory exists

**OpenAI API Errors**:
- Verify `.env` file exists in `backend/`
- Check API key is valid
- System works without API key (uses fallbacks)

### Frontend Issues

**Build Errors**:
- Clear cache: `rm -rf .next node_modules`
- Reinstall: `npm install`

**API Connection Errors**:
- Verify backend is running
- Check `NEXT_PUBLIC_API_URL` in `.env.local`

## Next Steps

- Read [README.md](README.md) for usage instructions
- Check [API Documentation](README.md#api-documentation) for endpoints
- Review [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines

