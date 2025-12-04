# System Limitations

## Important Context

**This system predicts outcomes for APPEALED CASES, not trial cases.** All limitations and considerations below apply specifically to appeal case predictions.

## Data Limitations

### Training Data Quality

- Model performance depends on quality and representativeness of training data
- Biases in training data may be reflected in predictions
- Limited to appeal cases available in CourtListener dataset

### Text Cleaning Impact

- Aggressive text cleaning may remove important context
- Tail-scrubbing removes procedural information that might be relevant
- Outcome word removal may affect semantic understanding

### Label Simplification

- Binary classification (win/lose) oversimplifies complex appeal outcomes
- Does not capture nuances like partial reversals or conditional remands
- Unknown appeal outcomes are excluded from training

## Model Limitations

### Embedding Constraints

- LegalBERT embeddings may not capture all legal nuances
- 768 dimensions may be insufficient for complex cases
- Embeddings are static and don't adapt to new legal concepts

### Model Architecture

- Selected model may not be optimal for all case types
- Binary classification cannot handle multi-class outcomes
- No explicit handling of temporal trends or court-specific patterns

### Feature Limitations

- Only uses text embeddings (no structured features)
- Optional metadata (court, jurisdiction, etc.) used for context in explanations but not in model training
- No explicit legal reasoning or citation analysis

## Prediction Limitations

### Confidence Interpretation

- High confidence does not guarantee accuracy
- Model may be overconfident on edge cases
- Confidence scores are relative to training data distribution

### Generalization

- Model trained on specific appeal dataset may not generalize to all appeal cases
- Performance may vary across different appeal case types
- May struggle with novel legal arguments or precedents in appeals

### Temporal Limitations

- Model does not account for evolving legal standards
- Recent legal developments may not be reflected
- Historical patterns may not predict future outcomes

## Explanation Limitations

### GPT-4o-mini Dependencies

- Requires OpenAI API key and internet connection
- API rate limits may affect availability
- Costs associated with API usage
- Explanations may vary slightly between requests (non-deterministic)

### Explanation Accuracy

- GPT-4o-mini explanations are generated and may not always perfectly reflect model internals
- Explanations focus on user-friendly interpretation, not technical details
- Feature importance details are intentionally hidden for clarity

### Fallback Behavior

- If GPT-4o-mini unavailable, template-based explanations are used
- Template explanations are less contextual but still user-friendly
- No technical feature details shown in either case

## Technical Limitations

### Computational Resources

- Embedding generation can be slow for long texts
- Model inference requires sufficient memory
- GPU acceleration recommended but not required
- GPT-4o-mini API calls add latency to explanation generation

### Scalability

- Similarity search scales with dataset size
- RAG retrieval may be slow with large documentation
- Real-time predictions may have latency
- GPT-4o-mini API calls add network latency

### API Dependencies

- Requires OpenAI API key for GPT-4o-mini explanations
- Network connectivity required for API calls
- API availability and rate limits may affect service
- Costs associated with API usage

## Ethical and Legal Limitations

### Not Legal Advice

- Predictions are statistical estimates, not legal advice
- Should not be used as sole basis for legal decisions
- Consult qualified legal professionals for actual cases
- GPT-4o-mini explanations are AI-generated and should be verified

### Bias and Fairness

- Model may reflect biases in training data
- May not perform equally across all case types
- Fairness considerations not explicitly addressed
- GPT-4o-mini may have its own biases in explanation generation

### Accountability

- Model decisions may be difficult to fully explain
- Feature importance provides insights but not complete reasoning
- Black-box nature of some models limits interpretability
- GPT-4o-mini explanations are generated and may not always be perfectly accurate

### Transparency

- Technical details (feature dimensions, embeddings) are intentionally hidden for user-friendliness
- This improves accessibility but reduces technical transparency
- Users cannot inspect exact feature contributions
- GPT-4o-mini reasoning process is not directly inspectable

## Usage Recommendations

### When to Use

- Research and analysis of appeal cases
- Preliminary appeal case assessment
- Finding similar appeal precedents
- Educational purposes
- Getting user-friendly explanations of appeal predictions

### When Not to Use

- As sole basis for legal strategy
- For critical legal decisions
- Without human legal expertise review
- For cases outside training data distribution
- When technical transparency is required

## Improvement Opportunities

### Data

- Expand training dataset
- Include more diverse case types
- Add temporal information
- Include structured metadata in model training

### Model

- Multi-class classification
- Court-specific models
- Temporal modeling
- Multi-modal features

### Explanations

- Fine-tune GPT-4o-mini prompts for better accuracy
- Add explanation confidence scores
- Provide multiple explanation styles
- Allow users to request more technical details

### System

- Real-time learning
- User feedback integration
- Explainability improvements
- Bias mitigation techniques
- Caching for GPT-4o-mini responses
- Local LLM fallback option

## Configuration Requirements

### Environment Variables

- `OPENAI_API_KEY`: Required for GPT-4o-mini explanations
- Set in `.env` file in backend directory
- System gracefully falls back if not set

### Dependencies

- OpenAI Python package (`openai>=1.0.0`)
- FastAPI for API endpoints
- Sentence Transformers for embeddings
- scikit-learn for ML models
- All dependencies listed in `requirements.txt`
