"""
Model loading utilities for the legal outcome prediction system.
"""
import pickle
import numpy as np
from pathlib import Path
from typing import Tuple, Optional

# Global model instances (lazy loading)
_model = None
_label_encoder = None
_embeddings = None
_dataset = None

def get_models_dir() -> Path:
    """Get the models directory path."""
    return Path(__file__).parent.parent / 'models'

def load_model():
    """Load the trained ML model."""
    global _model
    if _model is None:
        model_path = get_models_dir() / 'model.pkl'
        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found: {model_path}")
        with open(model_path, 'rb') as f:
            _model = pickle.load(f)
    return _model

def load_label_encoder():
    """Load the label encoder."""
    global _label_encoder
    if _label_encoder is None:
        encoder_path = get_models_dir() / 'label_encoder.pkl'
        if not encoder_path.exists():
            raise FileNotFoundError(f"Label encoder file not found: {encoder_path}")
        with open(encoder_path, 'rb') as f:
            _label_encoder = pickle.load(f)
    return _label_encoder

def load_embeddings() -> np.ndarray:
    """Load the pre-computed embeddings."""
    global _embeddings
    if _embeddings is None:
        embeddings_path = get_models_dir() / 'embeddings.npy'
        if not embeddings_path.exists():
            raise FileNotFoundError(f"Embeddings file not found: {embeddings_path}")
        _embeddings = np.load(embeddings_path)
    return _embeddings

def load_dataset():
    """Load the clean dataset."""
    global _dataset
    if _dataset is None:
        import pandas as pd
        dataset_path = get_models_dir() / 'clean_dataset.csv'
        if not dataset_path.exists():
            raise FileNotFoundError(f"Dataset file not found: {dataset_path}")
        _dataset = pd.read_csv(dataset_path)
    return _dataset

def calibrate_probability_for_text_length(
    win_probability: float, 
    text_length: int,
    predicted_label: str
) -> Tuple[float, bool]:
    """
    Calibrate probability based on text length and confidence level to account for training data distribution.
    
    Training data shows:
    - Win cases: avg 1731 chars, median 272 chars
    - Lose cases: avg 106 chars, median 65 chars
    
    Issues addressed:
    1. Short texts (< 500 chars) predicting "win" with high confidence may be overconfident
    2. Very high confidence (>95%) predictions are unrealistic - no case is 100% certain
    3. Legal briefs (2000+ chars) can still get overconfident predictions
    
    Args:
        win_probability: Raw win probability from model (0-1)
        text_length: Length of input text in characters
        predicted_label: Predicted label ('win' or 'lose')
        
    Returns:
        Tuple of (calibrated_probability, is_uncertain)
        - calibrated_probability: Adjusted probability accounting for text length and confidence
        - is_uncertain: True if prediction should be treated with caution
    """
    # Thresholds based on training data analysis
    SHORT_TEXT_THRESHOLD = 500  # Below this, texts are considered short
    VERY_SHORT_THRESHOLD = 200  # Below this, texts are very short
    MAX_REALISTIC_CONFIDENCE = 0.95  # Cap on maximum realistic confidence (95%)
    
    # Cap extremely high confidence predictions (>95%) regardless of text length
    # No legal case prediction should be 100% certain
    if win_probability > MAX_REALISTIC_CONFIDENCE:
        # Apply gradual reduction for very high confidence
        # 99% -> 92%, 98% -> 90%, 97% -> 88%, 96% -> 86%, 95%+ -> 95%
        excess = win_probability - MAX_REALISTIC_CONFIDENCE
        reduction = excess * 0.7  # Reduce excess confidence by 70%
        win_probability = MAX_REALISTIC_CONFIDENCE + excess * 0.3
    
    # If predicting "win" on short text with high confidence, reduce confidence further
    if predicted_label == 'win' and text_length < SHORT_TEXT_THRESHOLD:
        # Calculate reduction factor based on how short the text is
        if text_length < VERY_SHORT_THRESHOLD:
            # Very short texts: significant reduction
            reduction_factor = 0.3  # Reduce confidence by 70%
        elif text_length < SHORT_TEXT_THRESHOLD:
            # Short texts: moderate reduction
            reduction_factor = 0.5  # Reduce confidence by 50%
        else:
            reduction_factor = 1.0
        
        # Apply reduction, but keep it above 0.5 if originally above threshold
        if win_probability > 0.9:
            # For very high confidence on short texts, reduce more aggressively
            calibrated = 0.5 + (win_probability - 0.5) * reduction_factor
        else:
            calibrated = win_probability * reduction_factor + (1 - reduction_factor) * 0.5
        
        # Clamp to reasonable range
        calibrated = max(0.5, min(calibrated, win_probability))
        
        # Mark as uncertain if original confidence was very high but text is short
        is_uncertain = win_probability > 0.85 and text_length < SHORT_TEXT_THRESHOLD
        
        return calibrated, is_uncertain
    
    # For "lose" predictions or longer texts, return calibrated probability (may have been capped)
    is_uncertain = win_probability > 0.90  # Mark high confidence as uncertain
    return win_probability, is_uncertain


def predict_outcome(embedding: np.ndarray) -> Tuple[str, float]:
    """
    Predict outcome for a given embedding.
    
    Args:
        embedding: LegalBERT embedding array
        
    Returns:
        Tuple of (predicted_label, confidence_score)
        Note: This returns raw model confidence. For calibrated probabilities,
        use calibrate_probability_for_text_length() separately.
    """
    model = load_model()
    label_encoder = load_label_encoder()
    
    # Reshape if needed
    if len(embedding.shape) == 1:
        embedding = embedding.reshape(1, -1)
    
    # Predict
    prediction = model.predict(embedding)[0]
    probabilities = model.predict_proba(embedding)[0]
    
    # Get label
    label = label_encoder.inverse_transform([prediction])[0]
    confidence = float(max(probabilities))
    
    return label, confidence


def get_outcome_likelihoods(predicted_label: str) -> dict:
    """
    Get likelihood of specific outcomes based on predicted win/lose label.
    Uses historical distribution from training data.
    
    Args:
        predicted_label: 'win' or 'lose'
        
    Returns:
        Dictionary mapping outcome types to likelihood percentages
    """
    dataset = load_dataset()
    
    if predicted_label == 'win':
        # For win cases, calculate distribution of reversed vs granted
        win_cases = dataset[dataset['winlose'] == 'win']
        if len(win_cases) == 0:
            return {'reversed': 0.0, 'granted': 0.0}
        
        outcome_counts = win_cases['outcome'].value_counts()
        total = len(win_cases)
        
        reversed_count = outcome_counts.get('reversed', 0) + outcome_counts.get('REVERSED', 0)
        granted_count = outcome_counts.get('granted', 0) + outcome_counts.get('GRANTED', 0)
        
        return {
            'reversed': float(round((reversed_count / total) * 100, 1)),
            'granted': float(round((granted_count / total) * 100, 1))
        }
    else:
        # For lose cases, calculate distribution of affirmed, denied, dismissed, remanded
        lose_cases = dataset[dataset['winlose'] == 'lose']
        if len(lose_cases) == 0:
            return {'affirmed': 0.0, 'denied': 0.0, 'dismissed': 0.0, 'remanded': 0.0}
        
        outcome_counts = lose_cases['outcome'].value_counts()
        total = len(lose_cases)
        
        # Normalize case-insensitive
        affirmed_count = outcome_counts.get('affirmed', 0) + outcome_counts.get('AFFIRMED', 0)
        denied_count = outcome_counts.get('denied', 0) + outcome_counts.get('DENIED', 0)
        dismissed_count = outcome_counts.get('dismissed', 0) + outcome_counts.get('DISMISSED', 0)
        remanded_count = outcome_counts.get('remanded', 0) + outcome_counts.get('REMANDED', 0)
        
        return {
            'affirmed': float(round((affirmed_count / total) * 100, 1)),
            'denied': float(round((denied_count / total) * 100, 1)),
            'dismissed': float(round((dismissed_count / total) * 100, 1)),
            'remanded': float(round((remanded_count / total) * 100, 1))
        }

