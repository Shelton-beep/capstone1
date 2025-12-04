# Modeling Report

## Model Architecture

### Embedding Layer
- **Model**: LegalBERT (`nlpaueb/legal-bert-base-uncased`)
- **Dimension**: 768
- **Purpose**: Converts legal text into dense vector representations
- **Input**: Cleaned legal opinion text
- **Output**: 768-dimensional embedding vector

### Classification Models Tested

1. **Logistic Regression**
   - Linear classifier with L2 regularization
   - Fast training and inference
   - Interpretable coefficients

2. **Random Forest**
   - Ensemble of decision trees (100 estimators)
   - Handles non-linear relationships
   - Feature importance available

3. **Gradient Boosting**
   - Sequential ensemble method
   - Strong performance on structured data
   - Feature importance available

4. **Support Vector Classifier (SVC)**
   - RBF kernel
   - Good for non-linear classification
   - Probability estimates available

5. **MLP Classifier**
   - Multi-layer perceptron
   - Hidden layer: (256,)
   - Max iterations: 500
   - **Selected as best model** (typically highest accuracy)

### Model Selection

The system automatically selects the best model based on test set accuracy. The model with the highest accuracy is saved as `model.pkl`.

## Training Process

1. **Data Preparation**
   - Load and merge docket and opinion CSVs
   - Clean text (remove outcome words, tail-scrubbing)
   - Create binary labels (win/lose)
   - Drop unknown labels

2. **Embedding Generation**
   - Generate LegalBERT embeddings for all cleaned texts
   - Batch size: 8
   - Progress tracking enabled

3. **Train/Test Split**
   - 80% training, 20% test
   - Stratified split to maintain class distribution
   - Random state: 42 (for reproducibility)

4. **Model Training**
   - Train all 5 models on training set
   - Evaluate on test set
   - Select best model based on accuracy

5. **Model Persistence**
   - Save best model as `model.pkl`
   - Save label encoder as `label_encoder.pkl`
   - Save embeddings as `embeddings.npy`
   - Save clean dataset as `clean_dataset.csv`

## Evaluation Metrics

- **Primary Metric**: Accuracy
- **Additional Metrics**: Classification report (precision, recall, F1-score)
- **Confidence Scores**: Probability estimates from model

## Model Performance

Model performance varies based on the dataset. The system automatically selects the best-performing model. Typical performance characteristics:

- **MLP Classifier**: Often achieves highest accuracy due to non-linear decision boundaries
- **Logistic Regression**: Fast and interpretable, good baseline
- **Random Forest**: Robust to overfitting, provides feature importance
- **Gradient Boosting**: Strong performance, can be slow
- **SVC**: Good for non-linear patterns, slower inference

## Feature Importance

For tree-based models (Random Forest, Gradient Boosting), feature importance is available. For linear models (Logistic Regression), coefficients indicate feature importance. For MLP, we use SHAP values or gradient-based importance.

## Prediction Process

1. Input text is cleaned using the same cleaning pipeline
2. LegalBERT generates embedding (768-dim vector)
3. Trained model predicts class probabilities
4. Label encoder converts numeric prediction to "win" or "lose"
5. Confidence score is the maximum probability

## Limitations

- Model performance depends on training data quality
- Text cleaning may remove important context
- Binary classification (win/lose) may oversimplify outcomes
- Model does not account for temporal trends or court-specific patterns

