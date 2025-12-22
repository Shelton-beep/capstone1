"""
Prediction router for legal case outcome prediction.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import List
import numpy as np
import json
import asyncio
from utils.embedding import encode_text
from utils.model_loader import predict_outcome, load_model, get_outcome_likelihoods
from utils.feature_importance import extract_top_features
from utils.legal_judgment import get_legal_judgment
from utils.explanation import generate_explanation
from utils.fact_extraction import extract_case_facts
from utils.input_validation import is_valid_legal_text, validate_facts
from routers.schemas import (
    PredictionRequest,
    PredictionResponse,
    TopFeature,
    OutcomeLikelihoods
)

router = APIRouter(prefix="/api/predict", tags=["prediction"])


def _send_progress(step: str, message: str, data: dict = None):
    """Helper to format progress updates for SSE."""
    payload = {
        "type": "progress",
        "step": step,
        "message": message
    }
    if data:
        payload["data"] = data
    return f"data: {json.dumps(payload)}\n\n"


def _send_result(result: dict):
    """Helper to send final result."""
    payload = {
        "type": "result",
        "data": result
    }
    return f"data: {json.dumps(payload)}\n\n"


def _send_error(error: str):
    """Helper to send error."""
    payload = {
        "type": "error",
        "message": error
    }
    return f"data: {json.dumps(payload)}\n\n"


def _stream_prediction(request: PredictionRequest):
    """Stream prediction process with progress updates."""
    try:
        # Step 1: Input validation
        yield _send_progress("validation", "Validating input text...")

        if not request.text and not request.facts:
            yield _send_error("Either text or facts must be provided")
            return

        # Determine text to use
        if request.facts and len(request.facts) > 0:
            facts_valid, facts_error = validate_facts(request.facts)
            if not facts_valid:
                yield _send_error(facts_error)
                return

            text = "\n".join([f"- {fact}" for fact in request.facts])
            extracted_facts = request.facts

            text_valid, text_error = is_valid_legal_text(text, min_length=30)
            if not text_valid:
                yield _send_error(text_error)
                return
        else:
            text = request.text.strip()
            if len(text) == 0:
                yield _send_error("Text cannot be empty")
                return

            if len(text) > 50000:
                yield _send_error("Text exceeds maximum length of 50,000 characters")
                return

            text_valid, validation_error = is_valid_legal_text(text)
            if not text_valid:
                yield _send_error(validation_error)
                return

            # Step 2: Extract case facts
            yield _send_progress("extracting_facts", "Extracting key case facts...")
            try:
                extracted_facts = extract_case_facts(
                    text, request.nature_of_suit)
                if not extracted_facts:
                    extracted_facts = []
                yield _send_progress("extracting_facts", f"Extracted {len(extracted_facts)} facts", {"facts": extracted_facts})
            except Exception as e:
                print(f"Warning: Fact extraction failed: {e}")
                extracted_facts = []
                yield _send_progress("extracting_facts", "Fact extraction completed with warnings", {"facts": []})

        # Validate optional fields
        if request.year is not None and (request.year < 1900 or request.year > 2100):
            yield _send_error("Year must be between 1900 and 2100")
            return

        # Final validation
        text_valid, final_validation_error = is_valid_legal_text(text)
        if not text_valid:
            yield _send_error(final_validation_error)
            return

        # Step 3: Generate embeddings
        yield _send_progress("generating_embeddings", "Generating text embeddings...")
        try:
            embedding = encode_text(text)
            embedding_array = np.array(embedding)
            yield _send_progress("generating_embeddings", "Embeddings generated successfully")
        except ValueError as e:
            yield _send_error(f"Invalid input: {str(e)}")
            return
        except RuntimeError as e:
            yield _send_error(f"Embedding generation failed: {str(e)}")
            return

        # Step 4: Predict outcome
        yield _send_progress("predicting", "Running prediction model...")
        try:
            label, confidence = predict_outcome(embedding_array)
            yield _send_progress("predicting", "Prediction completed", {
                "label": label,
                "confidence": float(confidence)
            })
        except FileNotFoundError as e:
            yield _send_error(f"Model not available: {str(e)}. Please train the model first.")
            return
        except Exception as e:
            yield _send_error(f"Prediction failed: {str(e)}")
            return

        # Step 5: Get probabilities with calibration
        yield _send_progress("calculating_probabilities", "Calculating outcome probabilities...")
        try:
            model = load_model()
            if len(embedding_array.shape) == 1:
                embedding_array = embedding_array.reshape(1, -1)
            probabilities = model.predict_proba(embedding_array)[0]
            # Always use probability of 'win' (class 1) for defendant's perspective
            # LabelEncoder assigns: 0='lose', 1='win' (alphabetically)
            win_probability = float(probabilities[1])

            # Apply calibration based on text length
            # Training data shows win cases are much longer (avg 1731 chars) than lose cases (avg 106 chars)
            # Short argumentative texts may get overconfident predictions
            from utils.model_loader import calibrate_probability_for_text_length
            text_length = len(text)
            calibrated_prob, is_uncertain = calibrate_probability_for_text_length(
                win_probability, text_length, label
            )

            # Use calibrated probability
            win_probability = calibrated_prob

            # Re-determine label based on calibrated probability threshold (50%)
            # This ensures consistency: if win_probability < 50%, defendant loses
            if win_probability >= 0.5:
                label = 'win'
            else:
                label = 'lose'
            probability = win_probability

            # Update confidence to match calibrated probability
            confidence = probability

            yield _send_progress("calculating_probabilities", "Probabilities calculated", {
                "probability": probability,
                "confidence": confidence
            })
        except Exception as e:
            yield _send_error(f"Probability calculation failed: {str(e)}")
            return

        # Step 6: Extract top features
        yield _send_progress("extracting_features", "Analyzing key features...")
        try:
            top_features_data = extract_top_features(
                model,
                embedding_array,
                top_k=10,
                use_shap=True
            )
            top_features = [TopFeature(**feat) for feat in top_features_data]
            yield _send_progress("extracting_features", f"Extracted {len(top_features)} key features")
        except Exception as e:
            print(f"Warning: Feature extraction failed: {e}")
            top_features = []
            yield _send_progress("extracting_features", "Feature extraction completed with warnings")

        # Step 7: Get outcome likelihoods
        yield _send_progress("calculating_likelihoods", "Calculating outcome likelihoods...")
        try:
            likelihoods_dict = get_outcome_likelihoods(label)
            outcome_likelihoods = OutcomeLikelihoods(**likelihoods_dict)
            yield _send_progress("calculating_likelihoods", "Outcome likelihoods calculated")
        except Exception as e:
            print(f"Warning: Outcome likelihood calculation failed: {e}")
            outcome_likelihoods = OutcomeLikelihoods()
            yield _send_progress("calculating_likelihoods", "Likelihood calculation completed with warnings")

        # Step 8: Get legal judgment
        yield _send_progress("determining_judgment", "Determining legal judgment...")
        legal_judgment = get_legal_judgment(label, request.nature_of_suit)
        yield _send_progress("determining_judgment", "Legal judgment determined", {
            "legal_judgment": legal_judgment
        })

        # Step 9: Generate explanation
        yield _send_progress("generating_explanation", "Generating detailed explanation...")
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
        yield _send_progress("generating_explanation", "Explanation generated")

        # Final result
        result = {
            "prediction": label,
            "legal_judgment": legal_judgment,
            "probability": probability,
            "confidence": confidence,
            "extracted_facts": extracted_facts,
            "outcome_likelihoods": outcome_likelihoods.dict(),
            "top_features": [feat.dict() for feat in top_features],
            "explanation": explanation
        }
        yield _send_result(result)

    except HTTPException as e:
        yield _send_error(e.detail)
    except Exception as e:
        yield _send_error(f"Prediction error: {str(e)}")


@router.post("/stream")
async def predict_case_outcome_stream(request: PredictionRequest):
    """
    Stream prediction process with real-time progress updates.
    Uses Server-Sent Events (SSE) to send progress updates as each step completes.

    Returns:
        StreamingResponse with SSE events containing:
        - progress: Step-by-step progress updates
        - result: Final prediction result
        - error: Error message if something fails
    """
    import asyncio

    async def async_generator():
        """Convert sync generator to async generator for FastAPI StreamingResponse."""
        for item in _stream_prediction(request):
            yield item
            # Small delay to ensure proper streaming
            await asyncio.sleep(0.01)

    return StreamingResponse(
        async_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable buffering in nginx
        }
    )


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
            # Validate facts
            facts_valid, facts_error = validate_facts(request.facts)
            if not facts_valid:
                raise HTTPException(status_code=400, detail=facts_error)

            # Use facts directly - combine into text for embedding
            text = "\n".join([f"- {fact}" for fact in request.facts])
            extracted_facts = request.facts  # Use provided facts

            # Validate combined text from facts
            text_valid, text_error = is_valid_legal_text(text, min_length=30)
            if not text_valid:
                raise HTTPException(status_code=400, detail=text_error)
        else:
            text = request.text.strip()
            if len(text) == 0:
                raise HTTPException(
                    status_code=400, detail="Text cannot be empty")

            if len(text) > 50000:
                raise HTTPException(
                    status_code=400, detail="Text exceeds maximum length of 50,000 characters")

            # Validate that text is meaningful legal content
            text_valid, validation_error = is_valid_legal_text(text)
            if not text_valid:
                raise HTTPException(status_code=400, detail=validation_error)

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

        # CRITICAL: Final validation before generating embeddings
        # Even if other fields (court, jurisdiction, nature_of_suit, year) are provided,
        # the text itself MUST be valid legal content. The model ONLY uses text embeddings,
        # not these other fields, so invalid text will produce meaningless predictions.
        text_valid, final_validation_error = is_valid_legal_text(text)
        if not text_valid:
            raise HTTPException(status_code=400, detail=final_validation_error)

        # Generate embedding with error handling
        # Note: encode_text() also validates internally as a safety check
        try:
            embedding = encode_text(text)
        except ValueError as e:
            # This will catch validation errors from encode_text as well
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

        # Get probabilities with calibration
        try:
            model = load_model()
            if len(embedding_array.shape) == 1:
                embedding_array = embedding_array.reshape(1, -1)
            probabilities = model.predict_proba(embedding_array)[0]
            # Always use probability of 'win' (class 1) for defendant's perspective
            # LabelEncoder assigns: 0='lose', 1='win' (alphabetically)
            win_probability = float(probabilities[1])

            # Apply calibration based on text length
            # Training data shows win cases are much longer (avg 1731 chars) than lose cases (avg 106 chars)
            # Short argumentative texts may get overconfident predictions
            from utils.model_loader import calibrate_probability_for_text_length
            text_length = len(text)
            calibrated_prob, is_uncertain = calibrate_probability_for_text_length(
                win_probability, text_length, label
            )

            # Use calibrated probability
            win_probability = calibrated_prob

            # Re-determine label based on calibrated probability threshold (50%)
            # This ensures consistency: if win_probability < 50%, defendant loses
            if win_probability >= 0.5:
                label = 'win'
            else:
                label = 'lose'
            probability = win_probability

            # Update confidence to match calibrated probability
            confidence = probability
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
