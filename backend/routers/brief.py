"""
Legal brief generation router.
Generates compelling legal arguments based on case facts and similar precedents.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import json
import asyncio

router = APIRouter(prefix="/api/brief", tags=["brief"])


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


class BriefRequest(BaseModel):
    facts: List[str] = Field(..., description="Case facts extracted from legal text")
    similar_cases: Optional[List[dict]] = Field(None, description="Similar precedent cases")
    nature_of_suit: Optional[str] = Field(None, description="Nature of suit")
    legal_judgment: Optional[str] = Field(None, description="Predicted legal judgment")
    improvement_instructions: Optional[str] = Field(None, description="User instructions for improving/regenerating the brief")
    existing_brief: Optional[str] = Field(None, description="Existing brief to improve")


class BriefResponse(BaseModel):
    brief: str
    case_citations: List[str] = Field(default_factory=list, description="Citations from similar cases used")


def generate_legal_brief(
    facts: List[str],
    similar_cases: Optional[List[dict]] = None,
    nature_of_suit: Optional[str] = None,
    legal_judgment: Optional[str] = None,
    improvement_instructions: Optional[str] = None,
    existing_brief: Optional[str] = None
) -> tuple[str, List[str]]:
    """
    Generate a compelling legal brief/argument based on case facts and similar precedents.
    
    Args:
        facts: List of case facts
        similar_cases: List of similar precedent cases (preferably where defendant won)
        nature_of_suit: Nature of the suit
        legal_judgment: Predicted legal judgment
        
    Returns:
        Tuple of (brief_text, case_citations)
    """
    try:
        from openai import OpenAI
        from dotenv import load_dotenv
        
        load_dotenv()
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set")
        
        client = OpenAI(api_key=api_key)
        
        # Filter similar cases to only include those where defendant won (outcome='win')
        winning_precedents = []
        case_citations = []
        
        if similar_cases:
            for case in similar_cases:
                # Only include cases where defendant/appellant won
                if case.get('outcome') == 'win':
                    winning_precedents.append(case)
                    case_name = case.get('case_name', 'Unknown Case')
                    original_outcome = case.get('original_outcome', '')
                    if case_name != 'Unknown Case':
                        citation = f"{case_name}"
                        if original_outcome:
                            citation += f" ({original_outcome})"
                        case_citations.append(citation)
        
        # Build context for brief generation
        facts_text = "\n".join([f"{i+1}. {fact}" for i, fact in enumerate(facts)])
        
        precedents_context = ""
        if winning_precedents:
            precedents_context = "\n\nRELEVANT PRECEDENTS WHERE DEFENDANT/APPELLANT PREVAILED:\n"
            for i, case in enumerate(winning_precedents[:5], 1):  # Limit to top 5 winning cases
                case_name = case.get('case_name', 'Unknown Case')
                original_outcome = case.get('original_outcome', '')
                snippet = case.get('snippet', '')[:200]  # First 200 chars
                
                precedents_context += f"\n{i}. {case_name}"
                if original_outcome:
                    precedents_context += f" (Outcome: {original_outcome})"
                if snippet:
                    precedents_context += f"\n   Relevant excerpt: {snippet}...\n"
        
        # Determine if this is an improvement/regeneration request
        is_improvement = improvement_instructions and existing_brief
        
        if is_improvement:
            system_prompt = """You are an experienced appellate attorney improving a legal brief for the defendant/appellant.
Your task is to intelligently understand the user's improvement instructions and regenerate the brief accordingly:
1. Analyze the user's instructions carefully - they may want to add, remove, modify, or emphasize certain aspects
2. Keep ALL facts that are already in the brief (unless explicitly asked to remove)
3. Do NOT add new facts unless explicitly requested by the user
4. Implement the requested changes while maintaining the brief's structure and legal quality
5. Preserve strong legal arguments and citations unless asked to change them
6. Use proper legal language and formatting throughout

When interpreting user instructions:
- "Add" or "include" means add new content
- "Remove" or "delete" means remove specified content
- "Emphasize" or "highlight" means make certain points stronger
- "Change" or "modify" means alter existing content
- "Improve" or "strengthen" means enhance the argument
- If instructions are vague, infer the most reasonable interpretation that strengthens the brief"""
            
            user_prompt = f"""Improve and regenerate the following legal brief based on the user's instructions.

USER'S IMPROVEMENT INSTRUCTIONS:
{improvement_instructions}

EXISTING BRIEF:
{existing_brief}

CASE FACTS (for reference - use only if relevant to improvements):
{facts_text}
{precedents_context if precedents_context else ''}

{"Nature of Suit: " + nature_of_suit if nature_of_suit else ""}
{"Predicted Outcome: " + legal_judgment if legal_judgment else ""}

Please:
1. Carefully analyze the user's instructions
2. Regenerate the brief implementing the requested changes
3. Maintain the brief's professional structure and formatting
4. Keep all relevant facts and arguments unless explicitly asked to remove
5. Strengthen the brief according to the instructions
6. Ensure the improved brief is compelling and well-structured"""
        else:
            system_prompt = """You are an experienced appellate attorney drafting a compelling legal brief for the defendant/appellant.
Your task is to create a strong, argumentative legal brief that:
1. Uses ONLY the facts provided - do not invent or assume any facts not explicitly stated
2. Cites and relies on the provided precedents where defendant/appellant prevailed
3. Uses proper legal language, standard legal brief formatting, and professional legal argumentation
4. Structures the argument logically with clear headings
5. Makes a compelling case for why the appeal should be granted/reversed in favor of the defendant/appellant
6. Follows standard appellate brief structure: Statement of Facts, Argument, Conclusion

Format the brief professionally with:
- Clear section headings
- Numbered arguments where appropriate
- Citations to precedents
- Strong, persuasive language
- Legal reasoning and analysis"""

            user_prompt = f"""Generate a compelling appellate brief for the defendant/appellant based on the following:

CASE FACTS (USE ONLY THESE FACTS - DO NOT ADD OR INVENT ANY FACTS):
{facts_text}
{precedents_context if precedents_context else ''}

{"Nature of Suit: " + nature_of_suit if nature_of_suit else ""}
{"Predicted Outcome: " + legal_judgment if legal_judgment else ""}

Create a strong legal brief that:
1. Presents the facts accurately (only from the list above)
2. Makes compelling legal arguments for reversal/granting the appeal
3. Cites the provided precedents to support the arguments
4. Uses proper legal language and formatting
5. Concludes with a strong request for relief

Structure the brief with clear sections:
- Introduction/Statement of the Case
- Statement of Facts (based only on the facts provided)
- Argument (with subheadings for each legal point)
- Conclusion and Request for Relief"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        brief_text = response.choices[0].message.content.strip()
        return brief_text, case_citations
        
    except ImportError:
        raise HTTPException(status_code=503, detail="OpenAI library not available")
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Brief generation failed: {str(e)}")


def _stream_brief_generation(request: BriefRequest):
    """Stream brief generation process with progress updates."""
    try:
        # Validation
        yield _send_progress("validation", "Validating brief request...")
        
        if not request.facts or len(request.facts) == 0:
            yield _send_error("Facts are required")
            return
        
        # Determine operation type
        is_improvement = request.improvement_instructions and request.existing_brief
        
        if is_improvement:
            yield _send_progress("preparing", "Preparing to improve legal brief...")
        else:
            yield _send_progress("preparing", "Preparing to generate legal brief...")
        
        # Filter winning precedents
        yield _send_progress("filtering_precedents", "Filtering relevant precedents...")
        winning_precedents = []
        case_citations = []
        
        if request.similar_cases:
            for case in request.similar_cases:
                if case.get('outcome') == 'win':
                    winning_precedents.append(case)
                    case_name = case.get('case_name', 'Unknown Case')
                    original_outcome = case.get('original_outcome', '')
                    if case_name != 'Unknown Case':
                        citation = f"{case_name}"
                        if original_outcome:
                            citation += f" ({original_outcome})"
                        case_citations.append(citation)
        
        yield _send_progress("filtering_precedents", f"Found {len(winning_precedents)} relevant precedents", {
            "precedents_count": len(winning_precedents)
        })
        
        # Generate brief
        if is_improvement:
            yield _send_progress("generating", "Improving legal brief based on your instructions...")
        else:
            yield _send_progress("generating", "Generating compelling legal brief...")
        
        brief, citations = generate_legal_brief(
            facts=request.facts,
            similar_cases=request.similar_cases,
            nature_of_suit=request.nature_of_suit,
            legal_judgment=request.legal_judgment,
            improvement_instructions=request.improvement_instructions,
            existing_brief=request.existing_brief
        )
        
        yield _send_progress("generating", "Brief generation completed")
        
        # Final result
        result = {
            "brief": brief,
            "case_citations": citations
        }
        yield _send_result(result)
        
    except HTTPException as e:
        yield _send_error(e.detail)
    except Exception as e:
        yield _send_error(f"Brief generation error: {str(e)}")


@router.post("/stream")
async def generate_brief_stream(request: BriefRequest):
    """
    Stream brief generation process with real-time progress updates.
    Uses Server-Sent Events (SSE) to send progress updates as brief is generated.
    
    Returns:
        StreamingResponse with SSE events containing:
        - progress: Step-by-step progress updates
        - result: Final brief and citations
        - error: Error message if something fails
    """
    async def async_generator():
        """Convert sync generator to async generator for FastAPI StreamingResponse."""
        for item in _stream_brief_generation(request):
            yield item
            await asyncio.sleep(0.01)
    
    return StreamingResponse(
        async_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/", response_model=BriefResponse)
async def generate_brief(request: BriefRequest):
    """
    Generate a compelling legal brief based on case facts and similar precedents.
    
    Args:
        request: BriefRequest containing facts and similar cases
        
    Returns:
        BriefResponse with generated brief and case citations
    """
    try:
        if not request.facts or len(request.facts) == 0:
            raise HTTPException(status_code=400, detail="Facts are required")
        
        brief, citations = generate_legal_brief(
            facts=request.facts,
            similar_cases=request.similar_cases,
            nature_of_suit=request.nature_of_suit,
            legal_judgment=request.legal_judgment,
            improvement_instructions=request.improvement_instructions,
            existing_brief=request.existing_brief
        )
        
        return BriefResponse(
            brief=brief,
            case_citations=citations
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Brief generation error: {str(e)}")

