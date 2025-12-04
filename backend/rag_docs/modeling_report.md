# Modeling Report - ML Pipeline Summary

## Pipeline Overview

The Legal Outcome Prediction System uses a machine learning pipeline to predict binary APPEAL case outcomes (win/lose) from legal opinion text. **This system predicts outcomes for appealed cases, not trial cases.** The system includes AI-powered explanation generation using GPT-4o-mini for user-friendly interpretations.

## Stage 1: Data Preparation

### Data Sources
- **CourtListener Dockets**: Case metadata (case_name, court, dates, docket numbers)
- **Opinions**: Legal opinion text and outcomes

### Data Merging
- Merge dockets and opinions on `docket_id`
- Result: Unified dataset with case metadata and opinion text

### Text Cleaning
1. **Outcome Word Removal**: Remove AFFIRMED, REVERSED, VACATED, REMANDED, GRANTED, DISMISSED, DENIED
2. **Tail-Scrubbing**: Clean last 2000 characters to remove procedural boilerplate
3. **Pattern Removal**: Remove phrases like:
   - "Judgment vacated, and remanded..."
   - "Certiorari granted..."
   - "The petition for rehearing is denied..."
4. **Whitespace Normalization**: Clean up extra spaces

### Label Creation (Appeal Outcomes)
- **Win**: Successful appeals (reversed, granted)
- **Lose**: Unsuccessful appeals (affirmed, denied, dismissed, remanded)
- **Unknown**: Dropped from dataset

## Stage 2: Embedding Generation

### Model
- **LegalBERT**: `nlpaueb/legal-bert-base-uncased`
- **Dimension**: 768 features
- **Method**: SentenceTransformer encoding
- **Batch Size**: 8 (for training), 1 (for inference)
- **Device**: GPU if available, CPU fallback

### Process
- Input: Cleaned legal text
- Output: 768-dimensional embedding vector
- Captures semantic meaning of legal language

## Stage 3: Model Training

### Models Tested
1. **Logistic Regression**: Linear classifier, fast, interpretable
2. **Random Forest**: 100 trees, robust, feature importance
3. **Gradient Boosting**: Sequential ensemble, strong performance
4. **SVC (RBF)**: Support Vector Classifier with RBF kernel
5. **MLP Classifier**: Neural network, hidden layer (256,), typically best

### Training Process
- **Split**: 80% training, 20% test (stratified)
- **Random State**: 42 (reproducibility)
- **Evaluation**: Accuracy on test set
- **Selection**: Best model automatically selected

### Model Persistence
- `model.pkl`: Best trained model
- `label_encoder.pkl`: Label to numeric mapping
- `embeddings.npy`: Pre-computed training embeddings
- `clean_dataset.csv`: Final processed dataset

## Stage 4: Prediction Pipeline

### Runtime Process
1. User provides legal opinion text (and optional metadata)
2. Text cleaning (same as training)
3. LegalBERT embedding generation
4. Model prediction (probabilities)
5. Label decoding (win/lose)
6. Feature importance extraction (SHAP or heuristics) - **Internal use only**
7. **AI-Powered Explanation Generation**:
   - Uses GPT-4o-mini to generate natural language explanations
   - Considers prediction, confidence, probability, and case context
   - Provides user-friendly interpretation without technical jargon
   - Falls back to template-based explanation if GPT unavailable

### Feature Importance (Internal)
- **SHAP Values**: For MLP and complex models
- **Coefficients**: For linear models
- **Feature Importances**: For tree-based models
- **Top Features**: Ranked by contribution to prediction
- **Note**: Feature details are used internally but NOT exposed to users in explanations

### Explanation Generation

#### GPT-4o-mini Integration
- **Model**: OpenAI GPT-4o-mini
- **Purpose**: Generate natural, user-friendly explanations
- **Input**: 
  - Predicted appeal outcome (WIN/LOSE)
  - Confidence and probability scores
  - Case context (court, jurisdiction, nature of suit, year)
  - General pattern information (without technical feature details)
- **Output**: Plain language explanation that:
  - Explains what the prediction means in practical terms for the appeal
  - Interprets the confidence level
  - Discusses factors that influenced the prediction
  - Provides insights about what this might mean for the appeal
- **Appeal Context**: All explanations are framed in terms of appeal success or failure
- **Configuration**: Requires `OPENAI_API_KEY` environment variable
- **Fallback**: Template-based explanation if GPT unavailable

#### User-Friendly Design
- **No Technical Jargon**: Explanations avoid terms like "feature dimensions", "embeddings", "contribution scores"
- **Accessible Language**: Written for non-technical users
- **Contextual**: Incorporates case-specific context when provided
- **Actionable**: Provides meaningful insights for users

## Performance Characteristics

- Model performance varies by dataset size and quality
- MLP Classifier typically achieves highest accuracy
- Embeddings capture legal semantic patterns
- Binary classification simplifies complex outcomes
- GPT-4o-mini provides clear, natural explanations

## API Endpoints

### POST /api/predict/
- **Input**: Legal opinion text + optional metadata (court, jurisdiction, nature_of_suit, year)
- **Output**: 
  - Prediction (win/lose)
  - Probability and confidence scores
  - AI-generated explanation (GPT-4o-mini)
  - Top features (internal, not shown in explanation)
- **Explanation**: User-friendly, natural language generated by GPT-4o-mini

### POST /api/similar/
- **Input**: Legal opinion text
- **Output**: Top 3-5 similar cases with:
  - Case name
  - Text snippet
  - Similarity score

### POST /api/rag/
- **Input**: Question about the system
- **Output**: 
  - Answer generated by GPT-4o-mini based on retrieved documentation
  - Retrieved documentation chunks with citations
- **Technology**: RAG (Retrieval-Augmented Generation) with GPT-4o-mini

## Limitations

- Performance depends on training data quality
- Text cleaning may remove important context
- Binary classification oversimplifies outcomes
- Does not account for temporal trends
- Court-specific patterns not explicitly modeled
- GPT-4o-mini explanations require API key and internet connection
- Explanations are generated and may vary slightly between requests
