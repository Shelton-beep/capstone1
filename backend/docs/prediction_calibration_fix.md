# Prediction Probability Calibration Fix

## Issue Summary

The model was producing overconfident predictions (99%+ win probability) for:
1. **Short argumentative legal texts** (<500 chars) - unrealistic given training data distribution
2. **Legal briefs** (2000+ chars) - even well-written briefs shouldn't have 100% confidence

Both issues have been addressed with probability calibration.

## Root Cause Analysis

### Training Data Characteristics
- **Win cases**: Average 1,731 characters, median 272 characters
- **Lose cases**: Average 106 characters, median 65 characters
- **Class imbalance**: 96.5% lose, 3.5% win

### Problem
When users provided short argumentative texts (100-300 characters) containing legal keywords like "appealing", "Sixth Amendment", "Apprendi", the model was predicting "win" with extremely high confidence (99%+). This occurred because:

1. The model learned that "win" cases tend to be much longer and more detailed
2. Short argumentative texts containing legal keywords were being misclassified
3. The model lacked probability calibration for out-of-distribution inputs (short texts predicting win)

### Example
**Input text** (239 characters):
```
I'm appealing my sentence because the trial court used dismissed charges as 
sentencing enhancements. There was no jury finding to support those enhancements. 
I argue the sentence violates the Sixth Amendment under Apprendi and its progeny.
```

**Before fix**: 99.93% win probability (overconfident)
**After fix**: 74.97% win probability (calibrated)

## Solution Implemented

### Probability Calibration Function
Added `calibrate_probability_for_text_length()` in `utils/model_loader.py` that:

1. **Caps extremely high confidence** (>95%) regardless of text length:
   - 99.99% → ~96.50% (applies to legal briefs and any high-confidence predictions)
   - 98% → ~95.90%
   - 97% → ~95.60%
   - **Rationale**: No legal case prediction should be 100% certain

2. **Detects short texts** predicting "win":
   - Very short: < 200 characters → 70% confidence reduction
   - Short: < 500 characters → 50% confidence reduction

3. **Applies calibration**:
   - Reduces overconfident probabilities (>90%) more aggressively
   - Maintains probabilities above 50% threshold for label determination
   - Marks predictions as "uncertain" when original confidence >85% on short texts or >90% on any text

4. **Preserves original behavior**:
   - No calibration for "lose" predictions
   - Calibration affects both short texts and high-confidence predictions
   - Calibration only affects probability, not necessarily the label

### Integration
- Calibration is applied in `routers/predict.py` after getting raw probabilities
- Works for both streaming and non-streaming endpoints
- Transparent to users (no API changes)

## Testing Results

| Text Length | Raw Win Prob | Calibrated Prob | Label Change | Notes |
|------------|--------------|-----------------|--------------|-------|
| 239 chars  | 99.93%       | 74.97%         | win → win    | Short text calibration |
| 66 chars   | 10.26%       | 10.26%         | lose → lose  | No calibration needed |
| 119 chars  | 99.97%       | ~75%           | win → win    | Short text calibration |
| 2604 chars | 99.99%       | 96.50%         | win → win    | High-confidence cap (brief) |
| 2000 chars | 98.00%       | 95.90%         | win → win    | High-confidence cap (brief) |

## Limitations & Future Improvements

### Current Limitations
1. **Heuristic-based**: Calibration uses fixed thresholds, not learned from data
2. **Simple reduction**: Linear reduction may not capture all nuances
3. **No retraining**: Model itself wasn't retrained to better handle short texts

### Recommended Future Improvements

1. **Model Retraining**:
   - Add more short "win" case examples to training data
   - Use text length as a feature in the model
   - Apply better class balancing techniques

2. **Advanced Calibration**:
   - Use Platt scaling or isotonic regression for probability calibration
   - Learn calibration parameters from validation set
   - Consider ensemble methods for uncertainty estimation

3. **Input Validation**:
   - Warn users when input text is significantly shorter than training data
   - Suggest providing more context for better predictions
   - Add minimum recommended text length guidance

4. **Uncertainty Quantification**:
   - Return uncertainty flags in API response
   - Provide confidence intervals, not just point estimates
   - Use ensemble predictions for better uncertainty estimates

## Files Modified

1. `backend/utils/model_loader.py`
   - Added `calibrate_probability_for_text_length()` function
   - Updated `predict_outcome()` documentation

2. `backend/routers/predict.py`
   - Integrated calibration in both streaming and non-streaming endpoints
   - Applied calibration after getting raw probabilities

## Usage

The calibration is applied automatically. No changes needed in API calls or frontend code.

## Related Documentation

- `backend/rag_docs/system_limitations.md` - System limitations documentation
- `backend/docs/modeling_report.md` - Model training details
- `backend/notebooks/train_model.ipynb` - Training notebook

