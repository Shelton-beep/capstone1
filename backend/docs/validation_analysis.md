# Input Validation Analysis and Fixes

## Analysis of Training Notebook (`train_model.ipynb`)

### Model Input Features

After analyzing the training notebook, the model uses **ONLY text embeddings** as input features:

1. **Primary Feature**: LegalBERT embeddings of `clean_text` (legal opinion text)
   - Dimension: 768 (LegalBERT base)
   - Generated from: `nlpaueb/legal-bert-base-uncased`

2. **NOT Used as Features**:
   - `court` - Only used for context in explanations
   - `jurisdiction` - Only used for context in explanations  
   - `nature_of_suit` - Only used for context in explanations and fact extraction
   - `year` - Only used for context in explanations

### Key Finding

**The model prediction is based SOLELY on the text content.** Even if other fields (court, jurisdiction, nature_of_suit, year) are provided, they do NOT influence the prediction. Therefore, **invalid or nonsensical text will produce meaningless predictions**, regardless of other fields.

## Validation Layers Implemented

To ensure invalid inputs are caught even if other fields are provided, we've implemented **multiple validation layers**:

### Layer 1: Initial Validation (`predict.py` lines 79-81)
- Validates text before any processing
- Catches mathematical expressions, short text, non-legal content
- Raises HTTPException if invalid

### Layer 2: Pre-Embedding Validation (`predict.py` lines 103-105)
- **NEW**: Final validation check right before embedding generation
- Ensures text is valid even if earlier validation was somehow bypassed
- Critical because embeddings are the ONLY input to the model

### Layer 3: Embedding Function Validation (`embedding.py` lines 61-73)
- **NEW**: Validation inside `encode_text()` function
- Acts as a safety net - even if validation is bypassed at API level
- Prevents generation of embeddings for invalid text

### Layer 4: Fact Extraction Validation (`fact_extraction.py` lines 21-28)
- Validates text before calling GPT
- Prevents GPT from hallucinating facts based on `nature_of_suit` alone
- Returns empty list if text is invalid

## Changes Made

### 1. `backend/utils/embedding.py`
- Added semantic validation to `encode_text()` function
- Added semantic validation to `encode_texts()` function
- Ensures embeddings are only generated for valid legal text

### 2. `backend/routers/predict.py`
- Added final validation check before embedding generation (line 103-105)
- Added comment explaining that model ONLY uses text embeddings
- Ensures validation happens even if other fields are provided

### 3. `backend/utils/fact_extraction.py` (Previously fixed)
- Added validation before GPT calls
- Updated GPT prompt to not invent facts
- Added post-extraction validation

## Validation Flow

```
User Input ("1+1" + court + jurisdiction + nature_of_suit + year)
    ↓
Layer 1: Initial Validation (predict.py:79-81)
    ├─ Invalid → HTTPException 400 (STOP)
    └─ Valid → Continue
    ↓
Layer 2: Pre-Embedding Validation (predict.py:103-105)
    ├─ Invalid → HTTPException 400 (STOP)
    └─ Valid → Continue
    ↓
Layer 3: Embedding Function Validation (embedding.py:61-73)
    ├─ Invalid → ValueError (STOP)
    └─ Valid → Generate Embeddings
    ↓
Layer 4: Model Prediction (model_loader.py)
    └─ Uses ONLY embeddings (other fields ignored)
```

## Testing

To test validation:

```python
# Test invalid input
text = "1+1"
nature_of_suit = "civil rights"  # This won't help!

# Should fail at Layer 1
from utils.input_validation import is_valid_legal_text
valid, error = is_valid_legal_text(text)
# Result: valid=False, error="mathematical expression..."

# Should fail at Layer 3 if somehow reaches embedding
from utils.embedding import encode_text
try:
    embedding = encode_text(text)
except ValueError as e:
    # Error: "mathematical expression..."
```

## Important Notes

1. **Model Architecture**: The model uses ONLY text embeddings. Other fields are for context only.

2. **Validation is Critical**: Invalid text will produce meaningless embeddings and predictions, regardless of other fields.

3. **Multiple Layers**: Validation happens at multiple points to ensure robustness.

4. **User Experience**: Clear error messages guide users to provide valid legal text.

5. **No Bypass**: Even if validation is bypassed at one layer, subsequent layers will catch invalid input.

## Conclusion

The system now has **defense in depth** - multiple validation layers ensure that invalid inputs like "1+1" are caught before:
- Embeddings are generated
- Predictions are made
- Facts are extracted
- Similar cases are searched

This ensures the model only processes meaningful legal content, maintaining prediction quality and preventing hallucinated facts.

