# Legal Appeal Outcome Prediction System

<div align="center">

**An AI-powered system for predicting appeal case outcomes and generating compelling legal briefs**

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![uv](https://img.shields.io/badge/uv-package%20manager-DE5FE9.svg)](https://docs.astral.sh/uv/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.0-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Educational-yellow.svg)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Model Training](#model-training)
- [Development](#development)
- [Deployment](#deployment)
- [Limitations & Disclaimers](#limitations--disclaimers)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

The **Legal Appeal Outcome Prediction System** is a comprehensive, production-ready application that predicts the likelihood of success for appealed legal cases from the **defendant/appellant's perspective**. The system uses advanced machine learning (LegalBERT embeddings + MLP Classifier) to analyze legal text and provides:

- **Binary outcome predictions** (win/lose) with confidence scores
- **Outcome likelihood analysis** for specific appeal results (reversed, granted, affirmed, denied, dismissed, remanded)
- **Similar precedent case discovery** using cosine similarity
- **AI-generated legal briefs** based on case facts and winning precedents
- **Brief-based prediction simulation** to measure improvement in case strength
- **Fact extraction and editing** capabilities for iterative refinement

> **Important**: This system predicts outcomes for **appealed cases**, not trial cases. Predictions are based on historical appeal case data and should not be considered legal advice.

---

## ✨ Key Features

### 1. **Appeal Outcome Prediction**

- Predicts appeal success/failure using LegalBERT embeddings
- **Win** = Successful appeal (reversed, granted)
- **Lose** = Unsuccessful appeal (affirmed, denied, dismissed, remanded)
- Provides probability scores and confidence metrics
- Shows likelihood percentages for specific appeal outcomes

### 2. **Case Fact Extraction & Management**

- Automatically extracts key factual elements from legal text using GPT-4o-mini
- Editable fact list for user refinement
- Re-prediction based on edited facts
- Facts-driven similarity search for precedents

### 3. **Similar Precedent Discovery**

- **Hybrid retrieval pipeline**: BM25 keyword search + LegalBERT vector search fused via Reciprocal Rank Fusion (RRF)
- BM25 surfaces exact statute citations, procedural keywords, and outcome signals that embeddings underweight
- LegalBERT captures semantic similarity between legally analogous arguments
- Optional GPT-4o-mini reranker selects the most legally decisive precedents from the fused candidate pool
- Searchable by full text or extracted facts
- Configurable number of precedents (1-10)
- Displays original outcome labels (REVERSED, GRANTED, AFFIRMED, etc.)
- Shows case snippets, similarity scores, and metadata

### 4. **AI-Generated Legal Briefs**

- Generates compelling appellate briefs based on case facts
- Uses only winning precedents (defendant/appellant prevailed)
- Professional legal formatting and structure
- **Improvement feature**: Regenerate briefs with user instructions
- Download as PDF or Word document (RTF format)
- Properly formatted without markdown characters

### 5. **Brief-Based Prediction Simulation**

- Simulate prediction outcomes using generated legal briefs
- Compare original vs brief-based predictions
- Calculate improvement in defendant's chances
- Visual change analysis with color-coded indicators
- Explains why brief improves/decreases chances

### 6. **Intelligent Legal Judgment Language**

- Converts technical "win/lose" predictions to proper legal terminology
- Automatically infers case type (criminal vs civil) from nature of suit
- Displays: "Judgment in Favor of Defendant" or "Judgment in Favor of Plaintiff/Government"
- Supports any nature of suit (contract, tort, civil rights, employment, etc.)

### 7. **RAG-Powered Explanations**

- Natural language explanations using GPT-4o-mini
- Retrieval-Augmented Generation (RAG) for documentation-based answers
- Defendant/appellant-focused explanations
- Incorporates outcome likelihoods with legal reasoning
- Fallback to template-based explanations if GPT unavailable

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Prediction  │  │   Results    │  │   Brief      │     │
│  │    Form      │→ │    Page      │→ │  Generator   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST API
┌───────────────────────▼─────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Predict    │  │   Similar    │  │    Brief     │     │
│  │   Router     │  │    Router    │  │   Router     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│  ┌──────▼─────────────────▼──────────────────▼──────┐      │
│  │              Utility Modules                      │      │
│  │  • Fact Extraction  • Legal Judgment              │      │
│  │  • Explanation Gen  • Model Loader                │      │
│  │  • Embedding Gen    • Feature Importance          │      │
│  └──────┬───────────────────────────────────────────┘      │
│         │                                                    │
│  ┌──────▼───────────────────────────────────────────┐       │
│  │         ML Pipeline                               │       │
│  │  LegalBERT → Embeddings → MLP Classifier          │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → Legal text or case facts
2. **Text Processing** → Fact extraction (GPT-4o-mini) + Embedding generation (LegalBERT)
3. **Prediction** → MLP Classifier → Win/Lose + Confidence
4. **Enhancement** → Legal judgment conversion + Outcome likelihoods
5. **Explanation** → GPT-4o-mini generates natural language explanation
6. **Similar Cases** → Cosine similarity search on embeddings
7. **Brief Generation** → GPT-4o-mini creates legal brief from facts + precedents

---

## 🛠️ Technology Stack

### Backend

- **Framework**: FastAPI 0.104+
- **ML/NLP**:
  - LegalBERT (`nlpaueb/legal-bert-base-uncased`) via `sentence-transformers`
  - scikit-learn (MLP Classifier, preprocessing)
  - PyTorch 2.1.0
  - Transformers 4.35.0
- **Hybrid Retrieval**:
  - BM25 (`rank-bm25`) for keyword/statute matching
  - Reciprocal Rank Fusion (RRF) to merge BM25 + vector rankings
  - GPT-4o-mini reranker for final legal relevance scoring (optional)
- **AI/LLM**: OpenAI GPT-4o-mini (for explanations, fact extraction, brief generation, reranking)
- **Data Processing**: pandas, numpy
- **API**: Pydantic (validation), uvicorn (ASGI server)
- **Environment**: python-dotenv

### Frontend

- **Framework**: Next.js 14.0 (React 18.2)
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS 3.4
- **UI Components**:
  - ShadCN UI
  - Radix UI (Dialog, Label, Slot)
- **Markdown**: react-markdown
- **PDF Generation**: jsPDF 3.0.4
- **Icons**: lucide-react

### Development Tools

- **Notebooks**: Jupyter, ipykernel
- **Visualization**: matplotlib, seaborn
- **Model Interpretation**: SHAP

---

## 📦 Prerequisites

- **Python**: 3.10 or higher
- **uv**: Python package manager — [install guide](https://docs.astral.sh/uv/getting-started/installation/)
- **Node.js**: 18.0 or higher
- **npm**
- **OpenAI API Key** (optional, for GPT features)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd capstone1
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install all dependencies and create virtual environment
uv sync --dev
```

> `uv sync` reads `pyproject.toml` + `uv.lock`, auto-installs the correct Python
> version, and creates `.venv` — no separate `pip install` step required.

### 3. Model Training

Before running predictions, you need to train the model:

```bash
cd backend

# Launch Jupyter (installed as a dev dependency)
uv run jupyter notebook

# Open and run: notebooks/train_model.ipynb
# This will generate:
# - models/model.pkl (trained classifier)
# - models/label_encoder.pkl (label encoder)
# - models/embeddings.npy (precomputed embeddings)
# - models/clean_dataset.csv (cleaned dataset)
```

### 4. Environment Configuration

Create a `.env` file in the `backend/` directory:

```bash
# backend/.env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

> **Note**: The system works without `OPENAI_API_KEY`, but GPT-powered features (explanations, fact extraction, brief generation) will use fallback methods.

### 5. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Or with yarn
yarn install
```

---

## ⚙️ Configuration

### Backend Configuration

**Environment Variables** (`backend/.env`):

```env
OPENAI_API_KEY=sk-...  # Required for GPT features (optional)
```

**API Configuration** (`backend/main.py`):

- Default port: `8000`
- CORS origins: `localhost:3000`, `localhost:3001`
- Adjust in `main.py` if needed

### Frontend Configuration

**API URL** (`frontend/lib/api.ts`):

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` for production:

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

---

## 💻 Usage

### Starting the Backend

```bash
cd backend
uv run python main.py
```

The API will be available at `http://localhost:8000`

- API Docs: `http://localhost:8000/docs` (Swagger UI)
- Health Check: `http://localhost:8000/health`

### Starting the Frontend

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`

### Using the Application

1. **Navigate to Prediction Page**: `/predict`
2. **Enter Legal Text**: Paste your legal opinion text or case narrative
3. **Optional Metadata**: Add court, jurisdiction, nature of suit, year
4. **Submit**: Click "Predict Outcome"
5. **View Results**:
   - Prediction (legal judgment)
   - Probability and confidence
   - Outcome likelihoods
   - Extracted facts (editable)
   - Explanation
   - Similar precedents
6. **Generate Brief**: Click "Generate Legal Brief" in facts section
7. **Simulate Prediction**: Click "Simulate Prediction" to see brief's impact
8. **Download**: Export brief as PDF or Word document

---

## 📚 API Documentation

### Base URL

```
http://localhost:8000
```

### Endpoints

#### 1. **POST `/api/predict/`**

Predict appeal case outcome from legal text or facts.

**Request Body:**

```json
{
  "text": "Legal opinion text...", // Optional if facts provided
  "facts": ["Fact 1", "Fact 2"], // Optional if text provided
  "court": "scotus", // Optional
  "jurisdiction": "federal", // Optional
  "nature_of_suit": "criminal", // Optional
  "year": 2024 // Optional
}
```

**Response:**

```json
{
  "prediction": "win",
  "legal_judgment": "Judgment in Favor of Defendant",
  "probability": 0.85,
  "confidence": 0.87,
  "extracted_facts": [
    "Defendant/appellant is accused of...",
    "Trial court ruled against..."
  ],
  "outcome_likelihoods": {
    "reversed": 45.2,
    "granted": 12.8,
    "affirmed": 25.1,
    "denied": 10.5,
    "dismissed": 4.2,
    "remanded": 2.2
  },
  "top_features": [...],
  "explanation": "Based on the case facts..."
}
```

#### 2. **POST `/api/similar/`**

Find similar appeal cases using cosine similarity.

**Request Body:**

```json
{
  "text": "Legal text...", // Optional if facts provided
  "facts": ["Fact 1", "Fact 2"], // Optional if text provided
  "top_k": 5 // Optional, default: 5, max: 10
}
```

**Response:**

```json
{
  "similar_cases": [
    {
      "case_name": "Smith v. Jones",
      "snippet": "Case text snippet...",
      "similarity": 0.92,
      "outcome": "win",
      "original_outcome": "REVERSED",
      "full_text": "Full case text...",
      "court": "scotus",
      "date_filed": "2020-01-15",
      "docket_id": "12345"
    }
  ]
}
```

#### 3. **POST `/api/brief/`**

Generate legal brief based on case facts and precedents.

**Request Body:**

```json
{
  "facts": ["Fact 1", "Fact 2"],
  "similar_cases": [...],           // Optional
  "nature_of_suit": "criminal",      // Optional
  "legal_judgment": "...",           // Optional
  "improvement_instructions": "...", // Optional (for regeneration)
  "existing_brief": "..."           // Optional (for regeneration)
}
```

**Response:**

```json
{
  "brief": "Legal brief text in markdown format...",
  "case_citations": ["Case Name (REVERSED)", "Another Case (GRANTED)"]
}
```

#### 4. **POST `/api/rag/`**

Answer questions about the system using RAG.

**Request Body:**

```json
{
  "question": "How does the prediction model work?"
}
```

**Response:**

```json
{
  "answer": "The prediction model uses LegalBERT embeddings...",
  "retrieved_docs": [...]
}
```

#### 5. **GET `/health`**

Health check endpoint.

**Response:**

```json
{
  "status": "healthy"
}
```

---

## 📁 Project Structure

```
capstone1/
├── backend/
│   ├── data/                          # Raw data files
│   │   ├── opinions_checkpoint.csv
│   │   └── courtlistener_dockets_partial.csv
│   ├── models/                        # Trained models (generated)
│   │   ├── model.pkl                  # MLP Classifier
│   │   ├── label_encoder.pkl          # Label encoder
│   │   ├── embeddings.npy             # Precomputed embeddings
│   │   └── clean_dataset.csv          # Cleaned dataset
│   ├── notebooks/
│   │   └── train_model.ipynb          # Model training notebook
│   ├── routers/                       # API route handlers
│   │   ├── predict.py                 # Prediction endpoint
│   │   ├── similar.py                 # Similar cases endpoint
│   │   ├── rag.py                     # RAG endpoint
│   │   ├── brief.py                   # Legal brief generation
│   │   └── schemas.py                 # Pydantic models
│   ├── utils/                         # Utility modules
│   │   ├── embedding.py               # LegalBERT embedding utilities
│   │   ├── model_loader.py            # Model loading & prediction
│   │   ├── hybrid_retrieval.py        # BM25 + RRF + GPT reranker
│   │   ├── fact_extraction.py         # GPT-based fact extraction
│   │   ├── legal_judgment.py          # Legal judgment language conversion
│   │   ├── explanation.py             # GPT-based explanation generation
│   │   ├── feature_importance.py      # Feature importance extraction
│   │   └── rag_index.py               # RAG document indexing
│   ├── rag_docs/                      # RAG documentation
│   │   ├── explanation_guide.md
│   │   ├── modeling_report.md
│   │   ├── data_dictionary.md
│   │   ├── system_limitations.md
│   │   └── CHANGELOG.md
│   ├── main.py                        # FastAPI application entry point
│   ├── pyproject.toml                 # Project metadata & dependencies (uv)
│   ├── uv.lock                        # Pinned dependency lockfile (uv)
│   ├── .python-version                # Python version pin for uv
│   ├── requirements.txt               # Legacy pip reference (do not use)
│   └── .env                           # Environment variables (create this)
│
└── frontend/
    ├── app/                           # Next.js app directory
    │   ├── page.tsx                   # Landing page
    │   ├── layout.tsx                 # Root layout
    │   ├── predict/
    │   │   ├── page.tsx               # Prediction form page
    │   │   └── result/
    │   │       └── page.tsx           # Results display page
    │   └── components/                # React components
    │       ├── Form.tsx               # Prediction input form
    │       ├── ResultCard.tsx         # Prediction result display
    │       ├── PrecedentCard.tsx      # Similar case card
    │       └── ui/                    # ShadCN UI components
    │           ├── button.tsx
    │           ├── card.tsx
    │           ├── dialog.tsx
    │           └── ...
    ├── lib/                           # Utility libraries
    │   ├── api.ts                     # API client functions
    │   └── utils.ts                   # Helper functions
    ├── styles/
    │   └── globals.css                # Global styles
    ├── package.json                   # Node.js dependencies
    ├── tailwind.config.js             # Tailwind configuration
    ├── tsconfig.json                  # TypeScript configuration
    └── next.config.js                 # Next.js configuration
```

---

## 🧪 Model Training

The model training process is documented in `backend/notebooks/train_model.ipynb`.

### Training Pipeline

1. **Data Loading**: Merges docket and opinion CSVs
2. **Text Cleaning**:
   - Removes outcome-revealing words (AFFIRMED, REVERSED, etc.)
   - Tail-scrubbing (removes last 2000 chars of procedural boilerplate)
   - Pattern removal
3. **Label Creation**: Binary win/lose labels from appeal outcomes
4. **Embedding Generation**: LegalBERT embeddings (768 dimensions)
5. **Model Training**: Trains and compares:
   - Logistic Regression
   - Random Forest
   - Gradient Boosting
   - SVC (RBF)
   - MLP Classifier (typically best)
6. **Model Selection**: Automatically selects best model
7. **Artifact Saving**: Saves model, encoder, embeddings, dataset

### Running Training

```bash
cd backend
uv run jupyter notebook notebooks/train_model.ipynb
# Run all cells
```

---

## 🔧 Development

### Backend Development

```bash
cd backend
uv sync --dev             # Install / sync all dependencies
uv run python main.py     # Run development server
```

**Code Structure:**

- **Routers**: API endpoint handlers (`routers/`)
- **Utils**: Reusable utility functions (`utils/`)
- **Schemas**: Pydantic models for validation (`routers/schemas.py`)

### Frontend Development

```bash
cd frontend
npm run dev              # Development server
npm run build            # Production build
npm run start            # Production server
npm run lint             # Lint code
```

**Code Structure:**

- **Pages**: Next.js pages (`app/`)
- **Components**: Reusable React components (`app/components/`)
- **API Client**: API communication (`lib/api.ts`)

### Code Style

- **Backend**: Follow PEP 8 (Python style guide)
- **Frontend**: ESLint + TypeScript strict mode
- **Type Hints**: Use type hints in Python
- **Documentation**: Docstrings for all functions

---

## 🚢 Deployment

### Backend Deployment

1. **Production Server**:

   ```bash
   uv run uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. **Environment Variables**: Set `OPENAI_API_KEY` in production environment

3. **Model Files**: Ensure `models/` directory is accessible

### Frontend Deployment

1. **Build**:

   ```bash
   npm run build
   ```

2. **Environment**: Set `NEXT_PUBLIC_API_URL` to production API URL

3. **Deploy**: Deploy `out/` directory to hosting service (Vercel, Netlify, etc.)

### Docker (Optional)

Create `Dockerfile` for containerized deployment:

```dockerfile
# Backend Dockerfile
FROM python:3.10-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --no-dev --frozen
COPY backend/ .
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## ⚠️ Limitations & Disclaimers

### Important Disclaimers

- **Not Legal Advice**: This system provides statistical predictions, not legal advice
- **Appeal Cases Only**: Predictions are for appealed cases, not trial cases
- **Educational Purpose**: For research and educational purposes only
- **No Guarantees**: Predictions are estimates based on historical data

### Technical Limitations

- **Data Quality**: Performance depends on training data quality
- **Binary Classification**: Oversimplifies complex legal outcomes
- **Text Cleaning**: May remove important context
- **Static Model**: Doesn't adapt to new legal concepts automatically
- **GPT Dependencies**: Requires OpenAI API key for full functionality

See `backend/rag_docs/system_limitations.md` for detailed limitations.

---

## 🤝 Contributing

This is a capstone project. For questions, issues, or contributions:

1. Review the codebase structure
2. Follow existing code style
3. Add tests for new features
4. Update documentation
5. Submit pull requests with clear descriptions

---

## 📄 License

This project is for educational purposes.

---

## 👥 Authors

- **Project Maintainer**: [Your Name]
- **Institution**: [Your Institution]
- **Year**: 2024

---

## 🙏 Acknowledgments

- **LegalBERT**: Pre-trained legal language model
- **CourtListener**: Legal case data
- **OpenAI**: GPT-4o-mini for explanations and brief generation
- **FastAPI**: Modern Python web framework
- **Next.js**: React framework
- **ShadCN UI**: UI component library

---

## 📞 Support

For issues, questions, or feature requests, please open an issue in the repository.

## 📝 Additional Documentation

- **[SETUP.md](SETUP.md)**: Detailed setup and troubleshooting guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Contribution guidelines
- **Backend Documentation**: See `backend/rag_docs/` for system documentation

## 🔒 Security Notes

- **Never commit `.env` files** - They contain sensitive API keys
- **Review `.gitignore`** - Ensure sensitive files are excluded
- **Use environment variables** - Store secrets in environment, not code

## 📦 Large Files

This repository may contain large model files (`.pkl`, `.npy`) and data files (`.csv`).

**Options:**

1. **Use Git LFS** (recommended): Configured via `.gitattributes`
2. **Exclude from Git**: Uncomment relevant lines in `.gitignore`
3. **Host separately**: Store models/data in cloud storage

To use Git LFS:

```bash
git lfs install
git lfs track "*.pkl"
git lfs track "*.npy"
git lfs track "*.csv"
```

---

<div align="center">

**Built with ❤️ for legal research and education**

</div>
