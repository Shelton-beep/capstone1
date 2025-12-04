"""
Embedding utilities for legal text using LegalBERT with GPU fallback.
"""
from sentence_transformers import SentenceTransformer
from pathlib import Path
import os
import torch

# Global model instance (lazy loading)
_model = None

def get_embedding_model():
    """Get or load the LegalBERT embedding model with GPU fallback."""
    global _model
    if _model is None:
        try:
            # Try to use GPU if available
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
            print(f"Loading LegalBERT model on device: {device}")
            _model = SentenceTransformer(
                'nlpaueb/legal-bert-base-uncased',
                device=device
            )
        except Exception as e:
            print(f"Error loading LegalBERT: {e}")
            # Fallback to CPU
            print("Falling back to CPU")
            try:
                _model = SentenceTransformer('nlpaueb/legal-bert-base-uncased', device='cpu')
            except Exception as e2:
                raise RuntimeError(f"Failed to load LegalBERT model: {e2}")
    return _model

def encode_text(text: str) -> list:
    """
    Encode a single text string into LegalBERT embeddings.
    
    Args:
        text: Legal text to encode (must be non-empty string)
        
    Returns:
        List of embedding values
        
    Raises:
        ValueError: If text is invalid
        RuntimeError: If encoding fails
    """
    # Input validation
    if not isinstance(text, str):
        raise ValueError("Text must be a string")
    
    text = text.strip()
    if len(text) == 0:
        raise ValueError("Text cannot be empty")
    
    # Limit text length to prevent memory issues
    max_length = 10000  # Reasonable limit
    if len(text) > max_length:
        raise ValueError(f"Text exceeds maximum length of {max_length} characters")
    
    # Validate that text is meaningful legal content
    # This is a critical check - even if validation was bypassed earlier,
    # we must ensure we don't generate embeddings for nonsensical input
    try:
        from utils.input_validation import is_valid_legal_text
        text_valid, validation_error = is_valid_legal_text(text, min_length=30)
        if not text_valid:
            raise ValueError(validation_error)
    except ImportError:
        # If validation module not available, log warning but continue
        # (shouldn't happen in production, but handle gracefully)
        import warnings
        warnings.warn("Input validation module not available, skipping validation check")
    
    try:
        model = get_embedding_model()
        embedding = model.encode([text], batch_size=1, show_progress_bar=False)
        return embedding[0].tolist()
    except Exception as e:
        raise RuntimeError(f"Failed to encode text: {str(e)}")

def encode_texts(texts: list, batch_size: int = 8) -> list:
    """
    Encode multiple text strings into LegalBERT embeddings.
    
    Args:
        texts: List of legal texts to encode (must be non-empty list)
        batch_size: Batch size for encoding (1-32)
        
    Returns:
        List of embedding arrays
        
    Raises:
        ValueError: If inputs are invalid
        RuntimeError: If encoding fails
    """
    # Input validation
    if not isinstance(texts, list):
        raise ValueError("Texts must be a list")
    
    if len(texts) == 0:
        raise ValueError("Texts list cannot be empty")
    
    if not isinstance(batch_size, int) or batch_size < 1 or batch_size > 32:
        raise ValueError("batch_size must be an integer between 1 and 32")
    
    # Validate each text - including semantic validation
    validated_texts = []
    try:
        from utils.input_validation import is_valid_legal_text
        use_semantic_validation = True
    except ImportError:
        use_semantic_validation = False
        import warnings
        warnings.warn("Input validation module not available, skipping semantic validation")
    
    for i, text in enumerate(texts):
        if not isinstance(text, str):
            raise ValueError(f"Text at index {i} must be a string")
        text = text.strip()
        if len(text) == 0:
            raise ValueError(f"Text at index {i} cannot be empty")
        if len(text) > 10000:
            raise ValueError(f"Text at index {i} exceeds maximum length")
        
        # Semantic validation for each text
        if use_semantic_validation:
            text_valid, validation_error = is_valid_legal_text(text, min_length=30)
            if not text_valid:
                raise ValueError(f"Text at index {i} is invalid: {validation_error}")
        
        validated_texts.append(text)
    
    try:
        model = get_embedding_model()
        embeddings = model.encode(validated_texts, batch_size=batch_size, show_progress_bar=False)
        return embeddings.tolist()
    except Exception as e:
        raise RuntimeError(f"Failed to encode texts: {str(e)}")
