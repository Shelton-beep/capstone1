"""
Pydantic schemas for prediction API endpoints.
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class PredictionRequest(BaseModel):
    text: Optional[str] = Field(None, max_length=50000,
                                description="Legal opinion text")
    facts: Optional[List[str]] = Field(
        None, description="Extracted case facts (alternative to text)")
    court: Optional[str] = Field(
        None, max_length=100, description="Court identifier")
    jurisdiction: Optional[str] = Field(
        None, max_length=50, description="Jurisdiction type")
    nature_of_suit: Optional[str] = Field(
        None, max_length=200, description="Nature of suit (e.g., 'civil rights', 'contract', 'criminal', 'felony', etc.)")
    year: Optional[int] = Field(
        None, ge=1900, le=2100, description="Case year")


class TopFeature(BaseModel):
    dimension: int
    importance: float
    contribution: float


class OutcomeLikelihoods(BaseModel):
    """Likelihood percentages for specific appeal outcomes"""
    reversed: Optional[float] = None
    granted: Optional[float] = None
    affirmed: Optional[float] = None
    denied: Optional[float] = None
    dismissed: Optional[float] = None
    remanded: Optional[float] = None


class PredictionResponse(BaseModel):
    prediction: str  # Internal: still 'win' or 'lose' for model compatibility
    legal_judgment: str  # User-facing: proper legal language
    probability: float
    confidence: float
    extracted_facts: List[str]  # Key case facts extracted from the text
    outcome_likelihoods: OutcomeLikelihoods
    # Keep for internal use, but not shown in user-facing explanation
    top_features: List[TopFeature]
    explanation: str
