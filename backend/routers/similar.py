"""
Similar cases router for precedent search using cosine similarity.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from utils.embedding import encode_text
from utils.model_loader import load_embeddings, load_dataset

router = APIRouter(prefix="/api/similar", tags=["similar"])

class SimilarRequest(BaseModel):
    text: Optional[str] = Field(None, max_length=50000, description="Legal opinion text")
    facts: Optional[List[str]] = Field(None, description="Extracted case facts for similarity search")
    top_k: Optional[int] = Field(5, ge=1, le=10, description="Number of similar cases to return (1-10)")

class SimilarCase(BaseModel):
    case_name: str
    snippet: str
    similarity: float
    outcome: str = Field(..., description="Case outcome: win or lose")
    original_outcome: Optional[str] = Field(None, description="Original outcome label (e.g., REVERSED, GRANTED, AFFIRMED)")
    full_text: str = Field(..., description="Full case text for popover")
    court: Optional[str] = Field(None, description="Court identifier")
    date_filed: Optional[str] = Field(None, description="Date case was filed")
    docket_id: Optional[str] = Field(None, description="Docket ID")

class SimilarResponse(BaseModel):
    similar_cases: List[SimilarCase]

@router.post("/", response_model=SimilarResponse)
async def find_similar_cases(request: SimilarRequest):
    """
    Find similar legal cases using cosine similarity on embeddings.
    Can search by text or by extracted facts.
    
    Args:
        request: SimilarRequest containing text or facts
        
    Returns:
        SimilarResponse with top 3-5 similar cases containing:
            - case_name: Name of the case
            - snippet: Small snippet from clean_text
            - similarity: Similarity score (0-1)
    """
    try:
        # Input validation - need either text or facts
        if not request.text and not request.facts:
            raise HTTPException(status_code=400, detail="Either text or facts must be provided")
        
        # Prepare query text - use facts if provided, otherwise use text
        if request.facts and len(request.facts) > 0:
            # Combine facts into a query text
            query_text = "\n".join([f"- {fact}" for fact in request.facts])
        else:
            query_text = request.text.strip()
            if len(query_text) == 0:
                raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        if len(query_text) > 50000:
            raise HTTPException(status_code=400, detail="Text exceeds maximum length of 50,000 characters")
        
        # Generate query embedding with error handling
        try:
            query_embedding = encode_text(query_text)
            query_array = np.array(query_embedding).reshape(1, -1)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid input: {str(e)}")
        except RuntimeError as e:
            raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")
        
        # Load pre-computed embeddings and dataset with error handling
        try:
            embeddings = load_embeddings()
            dataset = load_dataset()
        except FileNotFoundError as e:
            raise HTTPException(status_code=503, detail=f"Dataset not available: {str(e)}. Please train the model first.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load dataset: {str(e)}")
        
        # Compute cosine similarity with error handling
        try:
            similarities = cosine_similarity(query_array, embeddings)[0]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Similarity computation failed: {str(e)}")
        
        # Get top K indices based on request parameter (default 5, max 10)
        # Ensure we get exactly the requested number (or as many as available)
        requested_k = request.top_k if request.top_k is not None else 5
        # Cap at 10 max, but also ensure we don't exceed available similarities
        top_k = min(requested_k, len(similarities), 10)
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        # Debug logging
        print(f"Requested {requested_k} precedents, returning {top_k} (available: {len(similarities)})")
        
        # Build response with error handling
        similar_cases = []
        try:
            for idx in top_indices:
                row = dataset.iloc[idx]
                clean_text = row.get('clean_text', '')
                # Extract snippet (first 300 characters)
                snippet = clean_text[:300] + '...' if len(clean_text) > 300 else clean_text
                
                # Get case name - try case_name_y first, then case_name_x, then case_name
                case_name = (
                    row.get('case_name_y') or 
                    row.get('case_name_x') or 
                    row.get('case_name') or 
                    'Unknown'
                )
                # Convert to string and handle NaN
                if pd.isna(case_name):
                    case_name = 'Unknown'
                else:
                    case_name = str(case_name).strip()
                    if not case_name:
                        case_name = 'Unknown'
                
                # Get outcome (win/lose)
                outcome = row.get('winlose', 'unknown')
                if pd.isna(outcome) or not outcome:
                    outcome = 'unknown'
                else:
                    outcome = str(outcome).strip().lower()
                    if outcome not in ['win', 'lose']:
                        outcome = 'unknown'
                
                # Get original outcome label (e.g., REVERSED, GRANTED, AFFIRMED)
                original_outcome = row.get('outcome')
                if pd.isna(original_outcome) or not original_outcome:
                    original_outcome = None
                else:
                    original_outcome = str(original_outcome).strip()
                    if not original_outcome:
                        original_outcome = None
                
                # Get full text
                full_text = clean_text
                
                # Get additional metadata
                court = row.get('court_y') or row.get('court_x')
                if pd.isna(court):
                    court = None
                else:
                    court = str(court).strip()
                    # Extract court name from URL if it's a URL
                    if court and 'courtlistener.com' in court:
                        # Try to extract court identifier
                        if '/courts/' in court:
                            court = court.split('/courts/')[-1].rstrip('/')
                
                date_filed = row.get('date_filed')
                if pd.isna(date_filed):
                    date_filed = None
                else:
                    date_filed = str(date_filed)
                
                docket_id = row.get('docket_id')
                if pd.isna(docket_id):
                    docket_id = None
                else:
                    docket_id = str(docket_id)
                
                case = SimilarCase(
                    case_name=case_name,
                    snippet=snippet,
                    similarity=float(similarities[idx]),
                    outcome=outcome,
                    original_outcome=original_outcome,
                    full_text=full_text,
                    court=court,
                    date_filed=date_filed,
                    docket_id=docket_id
                )
                similar_cases.append(case)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to format results: {str(e)}")
        
        # Verify we're returning the requested number (or as many as available)
        actual_count = len(similar_cases)
        print(f"Returning {actual_count} precedents (requested {requested_k})")
        
        return SimilarResponse(similar_cases=similar_cases)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similarity search error: {str(e)}")
