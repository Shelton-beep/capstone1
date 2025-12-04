# Feature Documentation

## Input Features

### Text Features

**Primary Feature: Legal Opinion Text**
- **Type**: Text (string)
- **Processing**: 
  - Cleaned to remove outcome-revealing words
  - Tail-scrubbed (last 2000 chars cleaned)
  - Procedural boilerplate removed
- **Embedding**: Converted to 768-dim vector using LegalBERT
- **Usage**: Primary input to classification model

### Metadata Features (Optional)

These features are accepted by the API but currently not used in model training:

**Court**
- **Type**: String
- **Examples**: "scotus", "ca9", "ca2", "nyed"
- **Purpose**: Court identifier (for future model enhancement)

**Jurisdiction**
- **Type**: String
- **Examples**: "federal", "state"
- **Purpose**: Jurisdiction type (for future model enhancement)

**Nature of Suit**
- **Type**: String
- **Examples**: "civil rights", "contract", "tort", "employment"
- **Purpose**: Case type classification (for future model enhancement)

**Year**
- **Type**: Integer
- **Examples**: 2020, 2021, 2024
- **Purpose**: Temporal information (for future model enhancement)

## Derived Features

### Embedding Features
- **Count**: 768 dimensions
- **Source**: LegalBERT model output
- **Type**: Continuous (float)
- **Range**: Typically [-1, 1] after normalization
- **Usage**: Direct input to classification model

### Model Features (Internal)

**Model Weights/Parameters**
- **MLP**: Weight matrices for input→hidden and hidden→output layers
- **Logistic Regression**: Coefficient vector (768-dim)
- **Random Forest**: Tree structures and split conditions
- **Gradient Boosting**: Sequential tree models
- **SVC**: Support vectors and kernel parameters

## Feature Importance

### For Linear Models (Logistic Regression)
- Feature importance = absolute value of coefficients
- Higher absolute coefficient = more important feature
- Positive coefficient favors "win", negative favors "lose"

### For Tree-Based Models (Random Forest, Gradient Boosting)
- Feature importance = mean decrease in impurity
- Calculated as average across all trees
- Higher value = more important for prediction

### For Neural Networks (MLP)
- Feature importance via SHAP values or gradient-based methods
- SHAP: Shapley Additive Explanations
- Gradient: Gradient of output w.r.t. input features

## Top Features Extraction

The system extracts top features using one of these methods:

1. **SHAP Values** (preferred for MLP)
   - Computes SHAP values for each embedding dimension
   - Ranks features by absolute SHAP value
   - Returns top N features with their contributions

2. **Weight Heuristics** (for linear models)
   - Uses model coefficients directly
   - Ranks by absolute coefficient value
   - Returns top N features

3. **Permutation Importance** (for tree models)
   - Measures importance by shuffling features
   - Ranks by performance decrease
   - Returns top N features

## Feature Engineering Notes

- All features are derived from text embeddings
- No manual feature engineering required
- LegalBERT handles semantic feature extraction
- Embedding dimensions capture legal language patterns

## Future Enhancements

Potential features to incorporate:
- Court-specific embeddings
- Temporal features (year, month)
- Case type embeddings
- Jurisdiction embeddings
- Multi-modal features (if available)

