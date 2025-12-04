"""
Legal judgment language utilities.
Converts model predictions (win/lose) to proper legal judgment language.
"""
from typing import Optional


def get_legal_judgment(prediction: str, nature_of_suit: Optional[str] = None) -> str:
    """
    Convert win/lose prediction to proper legal judgment language.
    This system is defendant/appellant-focused.
    Intelligently infers appropriate legal language from ANY nature_of_suit text.

    Accepts ANY nature of suit (contract, tort, civil rights, employment, family law,
    property, criminal, etc.) and intelligently determines the appropriate judgment language.

    Args:
        prediction: 'win' or 'lose'
        nature_of_suit: Any nature of suit text (e.g., 'contract', 'tort', 'civil rights',
                        'employment', 'family law', 'property', 'criminal', 'felony',
                        'personal injury', 'breach of contract', etc.)
                        System intelligently infers case type from the text.

    Returns:
        Legal judgment language string appropriate for the inferred case type
    """
    # Intelligently determine if this is a criminal case from ANY nature_of_suit text
    is_criminal = False
    if nature_of_suit:
        nature_lower = nature_of_suit.lower().strip()
        # Comprehensive keywords that indicate criminal cases
        # These can appear in any nature_of_suit text
        criminal_keywords = [
            'criminal', 'felony', 'misdemeanor', 'prosecution', 'indictment',
            'homicide', 'murder', 'manslaughter', 'assault', 'battery',
            'robbery', 'burglary', 'theft', 'larceny', 'embezzlement',
            'drug', 'narcotics', 'trafficking', 'controlled substance',
            'fraud', 'wire fraud', 'mail fraud', 'bank fraud',
            'rape', 'sexual assault', 'sexual abuse', 'molestation',
            'kidnapping', 'abduction', 'arson', 'weapon', 'firearm', 'gun',
            'violence', 'domestic violence', 'dui', 'dwi', 'owi',
            'drunk driving', 'driving under influence', 'conspiracy',
            'racketeering', 'rico', 'money laundering', 'bribery',
            'perjury', 'obstruction', 'escape', 'prison', 'jail',
            'parole', 'probation', 'sentencing', 'conviction'
        ]
        is_criminal = any(
            keyword in nature_lower for keyword in criminal_keywords)

    if prediction == 'win':
        # Appeal successful - judgment in favor of defendant/appellant
        # This applies to ALL case types (criminal, contract, tort, employment, etc.)
        return "Judgment in Favor of Defendant"
    else:
        # Appeal unsuccessful - judgment against defendant/appellant
        # Intelligently use appropriate opposing party based on inferred case type
        if is_criminal:
            # Criminal cases: opposing party is the government/prosecution
            return "Judgment in Favor of Government"
        else:
            # All other cases (contract, tort, civil rights, employment, family law,
            # property, personal injury, breach of contract, etc.): opposing party is plaintiff
            return "Judgment in Favor of Plaintiff"

