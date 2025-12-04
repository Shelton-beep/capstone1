"""
Fact extraction utilities for legal case text.
Extracts key case facts using GPT-4o-mini.
"""
import os
from typing import List, Optional


def extract_case_facts(text: str, nature_of_suit: Optional[str] = None) -> List[str]:
    """
    Extract key case facts from legal opinion text using GPT-4o-mini.
    Falls back to simple extraction if GPT is not available.
    
    Args:
        text: Legal opinion text
        nature_of_suit: Optional nature of suit to provide context
        
    Returns:
        List of extracted case facts as strings
    """
    # Validate input text before extracting facts
    try:
        from utils.input_validation import is_valid_legal_text
        text_valid, validation_error = is_valid_legal_text(text, min_length=30)
        if not text_valid:
            print(f"Warning: Invalid input text for fact extraction: {validation_error}")
            # Return empty list instead of extracting invalid facts
            return []
    except ImportError:
        # If validation module not available, continue (shouldn't happen)
        pass
    
    try:
        from openai import OpenAI
        from dotenv import load_dotenv
        
        # Ensure .env is loaded (in case it wasn't loaded at startup)
        load_dotenv()
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            # Also check for common typos
            api_key = os.getenv("OPEN_API_KEY") or os.getenv("OPENAI_KEY")
            if not api_key:
                # Don't use fallback if text is invalid - return empty list
                print("Warning: OPENAI_API_KEY not set")
                print(f"Available env vars with 'OPEN': {[k for k in os.environ.keys() if 'OPEN' in k.upper()]}")
                # Check if text is valid before using fallback
                try:
                    from utils.input_validation import is_valid_legal_text
                    if not is_valid_legal_text(text, min_length=30)[0]:
                        print("Text is invalid, returning empty list instead of fallback extraction")
                        return []
                except ImportError:
                    pass
                return extract_case_facts_simple(text, nature_of_suit)
            else:
                print(f"Warning: Found API key with alternative name, using it")
        else:
            print(f"OPENAI_API_KEY found, length: {len(api_key)}")
        
        client = OpenAI(api_key=api_key)
        
        # Build context for fact extraction
        context = f"""Extract the key factual elements from the following legal case text.
This is an APPEAL case, so focus on:
- The underlying allegations/charges (what the defendant/appellant is accused of)
- The trial court's decision/ruling (what happened at trial)
- Key evidence or lack thereof (what evidence exists or is missing)
- Legal claims or defenses raised
- Parties involved (defendant/appellant, plaintiff/appellee, government, etc.)
- Nature of the case (criminal vs civil, type of offense/claim)
- Any procedural issues or errors alleged

Return ONLY a bulleted list of facts, one fact per line, starting with "- ".
Be concise but specific. Extract 5-10 key facts that are relevant to the appeal outcome."""

        if nature_of_suit:
            context += f"\n\nNature of suit: {nature_of_suit}. Consider this when extracting relevant facts, BUT ONLY extract facts that are actually present in the legal case text below. Do NOT invent facts based solely on the nature of suit."

        user_prompt = f"""{context}

Legal case text:
{text[:8000]}"""  # Limit to 8000 chars to avoid token limits

        # Additional validation: If text is too short or doesn't contain legal content, don't call GPT
        # This prevents GPT from hallucinating facts based on nature_of_suit alone
        if len(text.strip()) < 30:
            print(f"Warning: Text too short ({len(text.strip())} chars) for fact extraction, returning empty list")
            return []

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a legal assistant that extracts key factual elements from legal case texts, specifically for APPEAL cases. Focus on facts relevant to the appeal outcome. Return only the facts in bullet format, one fact per line starting with '- '. IMPORTANT: Only extract facts that are explicitly stated in the legal case text provided. Do NOT invent or assume facts based on the nature of suit alone. If the text is too short, nonsensical, or doesn't contain meaningful legal content, return an empty list or 'No facts could be extracted from the provided text.'"},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            facts_text = response.choices[0].message.content.strip()
            print(f"GPT response received, length: {len(facts_text)}")
        except Exception as gpt_error:
            print(f"GPT API call failed: {gpt_error}")
            # Don't fall back to simple extraction if text is invalid - return empty list
            return []
        
        # Parse bullet points into list
        facts = []
        for line in facts_text.split('\n'):
            line = line.strip()
            if line.startswith('-') or line.startswith('•') or line.startswith('*'):
                # Remove bullet marker and clean
                fact = line.lstrip('-•*').strip()
                if fact:
                    facts.append(fact)
            elif line and not line.startswith('#') and len(line) > 10:  # Ignore markdown headers and very short lines
                # Sometimes GPT returns numbered lists or plain text
                # Remove numbers if present
                fact = line.lstrip('0123456789. ').strip()
                if fact:
                    facts.append(fact)
        
        # Validate extracted facts - if text was invalid, don't return hallucinated facts
        if facts:
            # Double-check: if original text was invalid, don't return facts
            try:
                from utils.input_validation import is_valid_legal_text
                if not is_valid_legal_text(text, min_length=30)[0]:
                    print("Warning: Text was invalid, discarding extracted facts to prevent hallucination")
                    return []
            except ImportError:
                pass  # If validation not available, proceed with facts
            
            return facts[:10]  # Limit to 10 facts max
        else:
            # If parsing failed, don't fall back - return empty list
            print("Warning: GPT fact extraction returned no parseable facts")
            return []
        
    except ImportError:
        print("Warning: OpenAI library not installed, using fallback fact extraction")
        return extract_case_facts_simple(text, nature_of_suit)
    except Exception as e:
        print(f"Fact extraction error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        # Fall back to simple extraction on error
        return extract_case_facts_simple(text, nature_of_suit)


def extract_case_facts_simple(text: str, nature_of_suit: Optional[str] = None) -> List[str]:
    """
    Simple fallback fact extraction using keyword-based approach.
    Used when GPT is not available.
    
    Args:
        text: Legal opinion text
        nature_of_suit: Optional nature of suit to provide context
        
    Returns:
        List of extracted case facts as strings
    """
    facts = []
    text_lower = text.lower()
    
    print(f"Running fallback fact extraction on text: {text[:100]}...")
    
    # Extract key information using pattern matching
    # Look for accusations/charges
    if any(word in text_lower for word in ['accused', 'charged', 'alleged', 'allegation']):
        # Try to find what they're accused of
        if 'rape' in text_lower:
            facts.append("Defendant/appellant is accused of rape")
        elif 'assault' in text_lower:
            facts.append("Defendant/appellant is accused of assault")
        elif 'murder' in text_lower:
            facts.append("Defendant/appellant is accused of murder")
        elif 'theft' in text_lower or 'steal' in text_lower:
            facts.append("Defendant/appellant is accused of theft")
        elif 'fraud' in text_lower:
            facts.append("Defendant/appellant is accused of fraud")
        else:
            facts.append("Defendant/appellant faces criminal charges")
    
    # Look for trial outcome
    if any(phrase in text_lower for phrase in ['ruled against', 'found guilty', 'convicted', 'case ruled']):
        facts.append("Trial court ruled against the defendant/appellant")
    elif any(phrase in text_lower for phrase in ['found not guilty', 'acquitted', 'ruled in favor']):
        facts.append("Trial court ruled in favor of the defendant/appellant")
    
    # Look for evidence issues
    if any(phrase in text_lower for phrase in ['no evidence', 'lack of evidence', 'no substantive evidence', 'insufficient evidence']):
        facts.append("There is no substantive evidence or insufficient evidence to support the accusations")
    elif 'evidence' in text_lower:
        facts.append("Evidence issues are present in the case")
    
    # Look for appeal context
    if any(word in text_lower for word in ['appeal', 'appealing', 'appellant', 'appellee']):
        facts.append("This is an appeal case")
    
    # Determine case type
    if any(word in text_lower for word in ['criminal', 'rape', 'murder', 'assault', 'theft', 'felony', 'misdemeanor']):
        facts.append("This is a criminal case")
    elif any(word in text_lower for word in ['civil', 'lawsuit', 'plaintiff', 'damages', 'contract']):
        facts.append("This is a civil case")
    
    # Add nature of suit if provided
    if nature_of_suit:
        facts.append(f"Nature of suit: {nature_of_suit}")
    
    # If we couldn't extract much, at least provide a basic fact
    if len(facts) == 0:
        # Extract first sentence or key phrase as a fact
        sentences = text.split('.')
        if sentences:
            first_sentence = sentences[0].strip()
            if len(first_sentence) > 20 and len(first_sentence) < 200:
                facts.append(first_sentence)
    
    print(f"Fallback extraction returned {len(facts)} facts: {facts}")
    return facts[:10]  # Limit to 10 facts

