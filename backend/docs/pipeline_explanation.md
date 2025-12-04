# Pipeline Explanation

## Overview

The Legal Outcome Prediction Pipeline processes legal case text and predicts binary outcomes (win/lose) using machine learning.

## Pipeline Stages

### Stage 1: Data Ingestion
- **Input**: CSV files (`courtlistener_dockets_partial.csv`, `opinions_checkpoint.csv`)
- **Process**: Load data into pandas DataFrames
- **Output**: Raw docket and opinion data

### Stage 2: Data Merging
- **Input**: Docket and opinion DataFrames
- **Process**: 
  - Extract `docket_id` from both datasets
  - Merge on `docket_id` using inner join
  - Combine case metadata with opinion text
- **Output**: Unified dataset with case_name, court, opinion_text, outcome

### Stage 3: Text Cleaning
- **Input**: Raw opinion text
- **Process**:
  1. Remove outcome-revealing words (AFFIRMED, REVERSED, etc.)
  2. Apply tail-scrubbing to last 2000 characters
  3. Remove procedural boilerplate patterns
  4. Normalize whitespace
- **Output**: Clean text ready for embedding

### Stage 4: Label Creation
- **Input**: Outcome strings
- **Process**:
  - Map outcomes to binary labels:
    - Win: reversed, granted
    - Lose: affirmed, denied, dismissed, remanded
  - Drop unknown outcomes
- **Output**: Binary labels (win/lose)

### Stage 5: Embedding Generation
- **Input**: Clean text strings
- **Model**: LegalBERT (`nlpaueb/legal-bert-base-uncased`)
- **Process**:
  - Tokenize text
  - Generate contextual embeddings
  - Batch processing (batch_size=8)
- **Output**: 768-dimensional embedding vectors

### Stage 6: Train/Test Split
- **Input**: Embeddings and labels
- **Process**:
  - 80/20 stratified split
  - Random state: 42 (reproducibility)
- **Output**: Training and test sets

### Stage 7: Model Training
- **Input**: Training embeddings and labels
- **Process**:
  - Train multiple models:
    - Logistic Regression
    - Random Forest
    - Gradient Boosting
    - SVC (RBF)
    - MLP Classifier
  - Evaluate on test set
  - Select best model
- **Output**: Trained model, label encoder

### Stage 8: Model Persistence
- **Input**: Best model, encoder, embeddings, dataset
- **Process**: Save to disk
- **Output**: 
  - `model.pkl`
  - `label_encoder.pkl`
  - `embeddings.npy`
  - `clean_dataset.csv`

## Prediction Pipeline (Runtime)

### Step 1: Text Input
- User provides legal opinion text
- Optional metadata: court, jurisdiction, nature_of_suit, year

### Step 2: Text Cleaning
- Apply same cleaning pipeline as training
- Remove outcome words, tail-scrub, remove boilerplate

### Step 3: Embedding Generation
- Use LegalBERT to generate embedding
- Output: 768-dim vector

### Step 4: Model Prediction
- Load trained model
- Predict class probabilities
- Get predicted label and confidence

### Step 5: Feature Importance
- Extract top features using SHAP or weight heuristics
- Rank features by importance
- Return top N features

### Step 6: Explanation Generation
- Generate clean explanation block
- Include prediction, confidence, top features
- Format for user consumption

## Similar Cases Pipeline

### Step 1: Query Embedding
- Generate embedding for user text

### Step 2: Similarity Search
- Load pre-computed embeddings
- Compute cosine similarity
- Rank by similarity score

### Step 3: Result Formatting
- Retrieve top K similar cases
- Extract case metadata
- Format snippets (first 500 chars)
- Return with similarity scores

## RAG Pipeline

### Step 1: Question Processing
- Accept user question
- Generate question embedding

### Step 2: Documentation Retrieval
- Load documentation embeddings (data dictionary, modeling report, etc.)
- Compute similarity with question
- Retrieve top K relevant sections

### Step 3: Answer Generation
- Combine retrieved context
- Generate explanation based on documentation
- Format response

## Error Handling

- **Missing Data**: Drop rows with missing critical fields
- **Empty Text**: Return error for empty input
- **Model Not Found**: Raise FileNotFoundError
- **Prediction Errors**: Return 500 with error message

## Performance Considerations

- **Lazy Loading**: Models loaded on first use
- **Caching**: Embeddings and datasets cached in memory
- **Batch Processing**: Embeddings generated in batches
- **Async Endpoints**: FastAPI async for concurrent requests

## Monitoring

- Log prediction requests
- Track model confidence distribution
- Monitor error rates
- Track response times

