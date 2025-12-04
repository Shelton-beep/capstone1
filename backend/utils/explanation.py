"""
Explanation generation utilities for predictions.
Generates user-friendly explanations using GPT-4o-mini or template fallback.
"""
import os
from typing import List, Optional
from routers.schemas import OutcomeLikelihoods, TopFeature


def generate_explanation(
    label: str,
    confidence: float,
    probability: float,
    outcome_likelihoods: OutcomeLikelihoods,
    top_features: List[TopFeature],
    court: Optional[str],
    jurisdiction: Optional[str],
    nature_of_suit: Optional[str],
    year: Optional[int],
    legal_judgment: str,
    extracted_facts: List[str]
) -> str:
    """
    Generate a clean explanation block for the prediction using GPT-4o-mini.
    Falls back to template-based explanation if GPT is unavailable.

    Args:
        label: Predicted label (win/lose)
        confidence: Model confidence
        probability: Class probability
        outcome_likelihoods: Likelihoods for specific appeal outcomes
        top_features: Top contributing features
        court: Court identifier (optional)
        jurisdiction: Jurisdiction type (optional)
        nature_of_suit: Case type (optional)
        year: Case year (optional)
        legal_judgment: Legal judgment language string

    Returns:
        Formatted explanation string
    """
    # Try to use GPT-4o-mini first
    try:
        from openai import OpenAI

        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            return _generate_explanation_with_gpt(
                label, confidence, probability, outcome_likelihoods, top_features,
                court, jurisdiction, nature_of_suit, year, legal_judgment, extracted_facts
            )
    except ImportError:
        pass
    except Exception as e:
        print(f"GPT explanation failed: {e}, using fallback")

    # Fallback to template-based explanation
    return _generate_explanation_template(
        label, confidence, probability, outcome_likelihoods, top_features,
        court, jurisdiction, nature_of_suit, year, legal_judgment, extracted_facts
    )


def _generate_explanation_with_gpt(
    label: str,
    confidence: float,
    probability: float,
    outcome_likelihoods: OutcomeLikelihoods,
    top_features: List[TopFeature],
    court: Optional[str],
    jurisdiction: Optional[str],
    nature_of_suit: Optional[str],
    year: Optional[int],
    legal_judgment: str,
    extracted_facts: List[str]
) -> str:
    """Generate explanation using GPT-4o-mini."""
    try:
        from openai import OpenAI

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # Build user-friendly context string (no technical feature dimensions)
        context_parts = []
        context_parts.append(f"Predicted Legal Judgment: {legal_judgment}")
        context_parts.append(f"Confidence: {confidence:.1%}")
        context_parts.append(f"Probability: {probability:.1%}")
        context_parts.append(
            f"\nNote: This prediction is from the defendant/appellant's perspective. {legal_judgment} means the appeal is {'successful' if label == 'win' else 'unsuccessful'}.")

        # Add extracted case facts
        if extracted_facts:
            context_parts.append("\nExtracted Case Facts:")
            for i, fact in enumerate(extracted_facts[:8], 1):  # Limit to 8 facts
                context_parts.append(f"  {i}. {fact}")

        # Add outcome likelihoods
        context_parts.append(
            "\nOutcome Likelihoods (based on historical data):")
        if label == 'win':
            if outcome_likelihoods.reversed is not None:
                context_parts.append(
                    f"  - Reversed: {outcome_likelihoods.reversed}%")
            if outcome_likelihoods.granted is not None:
                context_parts.append(
                    f"  - Granted: {outcome_likelihoods.granted}%")
        else:
            if outcome_likelihoods.denied is not None:
                context_parts.append(
                    f"  - Denied: {outcome_likelihoods.denied}%")
            if outcome_likelihoods.affirmed is not None:
                context_parts.append(
                    f"  - Affirmed: {outcome_likelihoods.affirmed}%")
            if outcome_likelihoods.dismissed is not None:
                context_parts.append(
                    f"  - Dismissed: {outcome_likelihoods.dismissed}%")
            if outcome_likelihoods.remanded is not None:
                context_parts.append(
                    f"  - Remanded: {outcome_likelihoods.remanded}%")

        if court or jurisdiction or nature_of_suit or year:
            context_parts.append("\nCase Context:")
            if court:
                context_parts.append(f"  Court: {court}")
            if jurisdiction:
                context_parts.append(f"  Jurisdiction: {jurisdiction}")
            if nature_of_suit:
                context_parts.append(f"  Nature of Suit: {nature_of_suit}")
            if year:
                context_parts.append(f"  Year: {year}")

        # Note about contributing factors without showing technical details
        if top_features:
            # Count positive vs negative contributions
            positive_count = sum(
                1 for f in top_features[:5] if f.contribution > 0)
            negative_count = sum(
                1 for f in top_features[:5] if f.contribution < 0)

            if positive_count > negative_count:
                factor_note = f"The model identified {positive_count} key factors that support this prediction."
            elif negative_count > positive_count:
                factor_note = f"The model identified {negative_count} key factors that influenced this prediction."
            else:
                factor_note = "The model identified several key factors that influenced this prediction."

            context_parts.append(f"\n{factor_note}")

        context = "\n".join(context_parts)

        system_prompt = """You are a legal AI assistant that explains machine learning predictions for APPEALED CASE outcomes from the DEFENDANT/APPELLANT's perspective.
IMPORTANT: These are appeal cases, not trial cases. The predictions indicate whether the defendant/appellant's appeal will be successful or unsuccessful.
The system predicts outcomes for the DEFENDANT/APPELLANT side. Use proper legal judgment language appropriate for the nature of suit provided.
The nature_of_suit field can contain ANY type of legal case - contract, tort, civil rights, employment, family law, property, personal injury, breach of contract, criminal, felony, etc. 
The system intelligently infers the appropriate legal judgment language from ANY nature_of_suit text entered by the user.
Adapt your explanations to the specific nature of suit provided - different case types have different legal considerations and terminology.
Provide clear, professional, and insightful explanations that help users understand why the model made this prediction.
Write in plain language that non-technical users can understand. Do NOT mention technical terms like "feature dimensions" or "embeddings".
Focus on what the prediction means for the DEFENDANT/APPELLANT's APPEAL in practical terms. Frame all outcomes in terms of appeal success (reversed/granted) or appeal failure (affirmed/denied/dismissed/remanded).
When explaining outcome likelihoods, provide LEGAL REASONING for why certain outcomes are more likely than others based on appeal law and procedures.
Always use proper legal terminology - never use "win" or "lose", use judgment language like "Judgment in Favor of Defendant" or "Judgment in Favor of Plaintiff/Government" based on the inferred case type."""

        user_prompt = f"""Based on the following prediction results, provide a clear and user-friendly explanation:

{context}

IMPORTANT: This is an APPEAL case from the DEFENDANT/APPELLANT's perspective, not a trial case. Frame your explanation in terms of appeal outcomes for the defendant/appellant.

Please explain in plain language:
1. The KEY CASE FACTS extracted from the text - summarize the most important factual elements that influence this case
2. What this prediction means for the DEFENDANT/APPELLANT's APPEAL - explain what "{legal_judgment}" means in practical terms (successful appeal vs unsuccessful appeal from the defendant/appellant's perspective), and how the extracted facts relate to this prediction
3. What the confidence level tells us (is this a strong or weak prediction)
4. The OUTCOME LIKELIHOODS and provide LEGAL EXPLANATIONS for why certain specific outcomes are more likely than others:
   - Explain what each outcome type means in legal terms (e.g., reversed means the lower court decision was overturned in favor of the defendant/appellant, remanded means sent back for reconsideration, etc.)
   - Provide legal reasoning for why the historical data shows these likelihoods (e.g., why denied might be more common than remanded, or why granted might be more common than reversed)
   - Connect the likelihoods to appeal procedures and legal standards
5. What factors might have influenced this prediction (based on the extracted facts and case context provided)
6. What this might mean for the defendant/appellant and their appeal given the specific facts of their case

Write in a professional but accessible tone. Avoid technical jargon. Focus on helping the user understand what this prediction means for the DEFENDANT/APPELLANT's APPEAL.
NEVER use "win" or "lose" - always use proper legal judgment language like "{legal_judgment}".
Provide meaningful legal context for the outcome likelihoods - explain WHY these percentages make sense from a legal perspective."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=600
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"GPT explanation error: {e}")
        raise


def _generate_explanation_template(
    label: str,
    confidence: float,
    probability: float,
    outcome_likelihoods: OutcomeLikelihoods,
    top_features: List[TopFeature],
    court: Optional[str],
    jurisdiction: Optional[str],
    nature_of_suit: Optional[str],
    year: Optional[int],
    legal_judgment: str,
    extracted_facts: List[str]
) -> str:
    """
    Generate a template-based explanation (fallback).
    """
    explanation_parts = []

    # Main prediction
    explanation_parts.append(f"Predicted Legal Judgment: {legal_judgment}")
    explanation_parts.append(
        f"\nNote: This prediction is from the defendant/appellant's perspective.")
    explanation_parts.append("")

    # Extracted case facts
    if extracted_facts:
        explanation_parts.append("Key Case Facts:")
        for i, fact in enumerate(extracted_facts[:8], 1):
            explanation_parts.append(f"  {i}. {fact}")
        explanation_parts.append("")

    # Confidence and probability
    explanation_parts.append(f"Confidence: {confidence:.1%}")
    explanation_parts.append(f"Probability: {probability:.1%}")
    explanation_parts.append("")

    # Outcome likelihoods
    explanation_parts.append("Outcome Likelihoods (based on historical data):")
    if label == 'win':
        if outcome_likelihoods.reversed is not None:
            explanation_parts.append(
                f"  - Reversed: {outcome_likelihoods.reversed}% (the lower court decision would be overturned)")
        if outcome_likelihoods.granted is not None:
            explanation_parts.append(
                f"  - Granted: {outcome_likelihoods.granted}% (the appeal request would be approved, e.g., certiorari granted)")
    else:
        if outcome_likelihoods.denied is not None:
            explanation_parts.append(
                f"  - Denied: {outcome_likelihoods.denied}% (the appeal request would be rejected)")
        if outcome_likelihoods.affirmed is not None:
            explanation_parts.append(
                f"  - Affirmed: {outcome_likelihoods.affirmed}% (the lower court decision would be upheld)")
        if outcome_likelihoods.dismissed is not None:
            explanation_parts.append(
                f"  - Dismissed: {outcome_likelihoods.dismissed}% (the appeal would be terminated without decision)")
        if outcome_likelihoods.remanded is not None:
            explanation_parts.append(
                f"  - Remanded: {outcome_likelihoods.remanded}% (the case would be sent back to the lower court for reconsideration)")
    explanation_parts.append("")

    # Context information
    if court or jurisdiction or nature_of_suit or year:
        explanation_parts.append("Case Context:")
        if court:
            explanation_parts.append(f"  Court: {court}")
        if jurisdiction:
            explanation_parts.append(f"  Jurisdiction: {jurisdiction}")
        if nature_of_suit:
            explanation_parts.append(f"  Nature of Suit: {nature_of_suit}")
        if year:
            explanation_parts.append(f"  Year: {year}")
        explanation_parts.append("")

    # Note: We don't show technical feature dimensions in the template fallback either
    # to keep it user-friendly

    # Interpretation (for appeal cases)
    if label == 'win':
        explanation_parts.append(
            "Interpretation: The model predicts a successful appeal outcome (win) based on "
            "similarities to appeal cases that were reversed or granted. The legal reasoning "
            "in the provided text aligns with patterns associated with successful appeals."
        )
    else:
        explanation_parts.append(
            "Interpretation: The model predicts an unsuccessful appeal outcome (lose) based on "
            "similarities to appeal cases that were affirmed, denied, dismissed, or remanded. "
            "The legal reasoning in the provided text aligns with patterns associated "
            "with unsuccessful appeals."
        )

    return "\n".join(explanation_parts)

