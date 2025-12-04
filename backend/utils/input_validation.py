"""
Input validation utilities for legal text.
Detects invalid, nonsensical, or non-legal inputs.
"""
import re
from typing import Tuple, Optional


def is_valid_legal_text(text: str, min_length: int = 50) -> Tuple[bool, Optional[str]]:
    """
    Validate that input text is meaningful legal text.
    
    Args:
        text: Input text to validate
        min_length: Minimum length for valid legal text
        
    Returns:
        Tuple of (is_valid, error_message)
        - is_valid: True if text appears to be valid legal text
        - error_message: None if valid, error message if invalid
    """
    if not text or not text.strip():
        return False, "Please enter legal text or case narrative. The input cannot be empty."
    
    text = text.strip()
    
    # Check for mathematical expressions FIRST (before length check)
    # This catches cases like "1+1" even if short
    math_patterns = [
        r'^\d+\s*[+\-*/]\s*\d+\s*$',  # Only math expression: 1+1, 2-3, 4*5, 6/2
        r'^\d+\s*=\s*\d+\s*$',  # Only equation: 1=1, 2=2
        r'^\d+\s*[+\-*/]\s*\d+',  # Math at start: 1+1, 2-3
    ]
    for pattern in math_patterns:
        if re.match(pattern, text):
            return False, "The input appears to be a mathematical expression rather than legal text. Please provide a case narrative, legal opinion, or description of the legal matter."
    
    # Check if text is primarily mathematical (contains math but little else)
    if len(text) < 100:
        math_chars = len(re.findall(r'[\d+\-*/=]', text))
        if math_chars > len(text.replace(' ', '')) * 0.4:  # More than 40% math characters
            return False, "The input appears to be a mathematical expression rather than legal text. Please provide a case narrative, legal opinion, or description of the legal matter."
    
    # Check minimum length
    if len(text) < min_length:
        return False, f"Legal text must be at least {min_length} characters. Please provide a more detailed case narrative or legal opinion text."
    
    # Check for only numbers or symbols
    if re.match(r'^[\d\s+\-*/=.,;:!?()]+$', text):
        return False, "The input contains only numbers and symbols. Please provide actual legal text describing a case or legal matter."
    
    # Check for repeated single characters or patterns (e.g., "aaaa", "1111")
    if len(set(text.replace(' ', ''))) <= 2 and len(text.replace(' ', '')) > 5:
        return False, "The input appears to be repetitive characters rather than meaningful legal text. Please provide a case narrative or legal opinion."
    
    # Check for common legal keywords/phrases (heuristic for legal text)
    legal_keywords = [
        'court', 'judge', 'plaintiff', 'defendant', 'appellant', 'appellee',
        'case', 'lawsuit', 'legal', 'law', 'statute', 'regulation',
        'evidence', 'testimony', 'witness', 'jury', 'trial', 'appeal',
        'ruling', 'judgment', 'decision', 'opinion', 'brief', 'motion',
        'claim', 'allegation', 'accused', 'charged', 'convicted', 'guilty',
        'damages', 'injury', 'violation', 'rights', 'contract', 'agreement',
        'property', 'employment', 'discrimination', 'civil', 'criminal'
    ]
    
    text_lower = text.lower()
    legal_keyword_count = sum(1 for keyword in legal_keywords if keyword in text_lower)
    
    # If text is long enough but has very few legal keywords, it might not be legal text
    if len(text) > 100 and legal_keyword_count < 2:
        return False, "The input does not appear to contain legal content. Please provide a case narrative, legal opinion text, or description of a legal matter."
    
    # Check for common non-legal patterns
    non_legal_patterns = [
        r'^test\s*$',  # Just "test"
        r'^hello\s*$',  # Just "hello"
        r'^[a-z]\s*$',  # Single letter
        r'^\d+\s*$',  # Only numbers
    ]
    for pattern in non_legal_patterns:
        if re.match(pattern, text, re.IGNORECASE):
            return False, "The input does not appear to be legal text. Please provide a case narrative or legal opinion."
    
    return True, None


def validate_facts(facts: list) -> Tuple[bool, Optional[str]]:
    """
    Validate that extracted facts make sense.
    
    Args:
        facts: List of extracted facts
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not facts or len(facts) == 0:
        return True, None  # Empty facts are okay (user can add manually)
    
    # Check if facts seem nonsensical
    # If all facts are very short or don't contain legal keywords, they might be invalid
    legal_keywords = [
        'court', 'judge', 'plaintiff', 'defendant', 'appellant', 'appellee',
        'case', 'legal', 'law', 'evidence', 'trial', 'appeal', 'ruling',
        'accused', 'charged', 'violation', 'rights'
    ]
    
    valid_facts = 0
    for fact in facts:
        fact_lower = fact.lower()
        if len(fact) > 20 and any(keyword in fact_lower for keyword in legal_keywords):
            valid_facts += 1
    
    # If we have facts but none seem valid, warn
    if len(facts) > 0 and valid_facts == 0:
        return False, "The extracted facts do not appear to be valid legal content. Please provide meaningful legal text or case narrative."
    
    return True, None

