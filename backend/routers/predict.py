"""
Prediction router for legal case outcome prediction.
"""
from fastapi import APIRouter, HTTPException
from typing import List
import numpy as np
from utils.embedding import encode_text
from utils.model_loader import predict_outcome, load_model, get_outcome_likelihoods
from utils.feature_importance import extract_top_features
from utils.legal_judgment import get_legal_judgment
from utils.explanation import generate_explanation
from utils.fact_extraction import extract_case_facts
from routers.schemas import (
    PredictionRequest,
    PredictionResponse,
    TopFeature,
    OutcomeLikelihoods
)

router = APIRouter(prefix="/api/predict", tags=["prediction"])


@router.post("/", response_model=PredictionResponse)
async def predict_case_outcome(request: PredictionRequest):
    """
    Predict the outcome of a legal case based on opinion text.

    Args:
        request: PredictionRequest containing:
            - text: Legal opinion text (required)
            - court: Court identifier (optional, e.g., "scotus")
            - jurisdiction: Jurisdiction type (optional, e.g., "federal")
            - nature_of_suit: Case type (optional, e.g., "civil rights")
            - year: Case year (optional, e.g., 2024)

    Returns:
        PredictionResponse with:
            - prediction: Predicted label (win/lose)
            - legal_judgment: Proper legal judgment language
            - probability: Class probability
            - confidence: Model confidence score
            - outcome_likelihoods: Likelihoods for specific appeal outcomes
            - top_features: Top contributing features
            - explanation: Clean explanation block
    """
    try:
        # Input validation - need either text or facts
        if not request.text and not request.facts:
            raise HTTPException(
                status_code=400, detail="Either text or facts must be provided")

        # Determine text to use - if facts provided, combine them; otherwise use text
        if request.facts and len(request.facts) > 0:
            # Use facts directly - combine into text for embedding
            text = "\n".join([f"- {fact}" for fact in request.facts])
            extracted_facts = request.facts  # Use provided facts
        else:
            text = request.text.strip()
            if len(text) == 0:
                raise HTTPException(
                    status_code=400, detail="Text cannot be empty")

            if len(text) > 50000:
                raise HTTPException(
                    status_code=400, detail="Text exceeds maximum length of 50,000 characters")

            # Extract case facts from the text
            try:
                extracted_facts = extract_case_facts(
                    text, request.nature_of_suit)
                # Always ensure we have a list (even if empty)
                if not extracted_facts:
                    extracted_facts = []
                print(
                    f"Extracted {len(extracted_facts)} facts: {extracted_facts}")
            except Exception as e:
                print(f"Warning: Fact extraction failed: {e}")
                import traceback
                traceback.print_exc()
                extracted_facts = []

        # Validate optional fields
        if request.year is not None and (request.year < 1900 or request.year > 2100):
            raise HTTPException(
                status_code=400, detail="Year must be between 1900 and 2100")

        # Generate embedding with error handling
        try:
            embedding = encode_text(text)
        except ValueError as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid input: {str(e)}")
        except RuntimeError as e:
            raise HTTPException(
                status_code=500, detail=f"Embedding generation failed: {str(e)}")
        embedding_array = np.array(embedding)

        # Predict outcome with error handling
        try:
            label, confidence = predict_outcome(embedding_array)
        except FileNotFoundError as e:
            raise HTTPException(
                status_code=503, detail=f"Model not available: {str(e)}. Please train the model first.")
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Prediction failed: {str(e)}")

        # Get probabilities
        try:
            model = load_model()
            if len(embedding_array.shape) == 1:
                embedding_array = embedding_array.reshape(1, -1)
            probabilities = model.predict_proba(embedding_array)[0]
            probability = float(
                probabilities[1] if label == 'win' else probabilities[0])
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Probability calculation failed: {str(e)}")

        # Extract top features with error handling
        try:
            top_features_data = extract_top_features(
                model,
                embedding_array,
                top_k=10,
                use_shap=True
            )
            top_features = [TopFeature(**feat) for feat in top_features_data]
        except Exception as e:
            # If feature extraction fails, continue without features
            print(f"Warning: Feature extraction failed: {e}")
            top_features = []

        # Get outcome likelihoods based on predicted label
        try:
            likelihoods_dict = get_outcome_likelihoods(label)
            outcome_likelihoods = OutcomeLikelihoods(**likelihoods_dict)
        except Exception as e:
            print(f"Warning: Outcome likelihood calculation failed: {e}")
            outcome_likelihoods = OutcomeLikelihoods()

        # Convert to legal judgment language (infers case type from nature_of_suit)
        legal_judgment = get_legal_judgment(
            label,
            request.nature_of_suit
        )

        # Generate clean explanation block (includes facts)
        explanation = generate_explanation(
            label,
            confidence,
            probability,
            outcome_likelihoods,
            top_features,
            request.court,
            request.jurisdiction,
            request.nature_of_suit,
            request.year,
            legal_judgment,
            extracted_facts
        )

        return PredictionResponse(
            prediction=label,
            legal_judgment=legal_judgment,
            probability=probability,
            confidence=confidence,
            extracted_facts=extracted_facts,
            outcome_likelihoods=outcome_likelihoods,
            top_features=top_features,
            explanation=explanation
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Prediction error: {str(e)}")
