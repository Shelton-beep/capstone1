"""
Feature importance extraction utilities using SHAP or weight heuristics.
"""
import numpy as np
from typing import List, Tuple, Dict
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC

def extract_top_features(
    model, 
    embedding: np.ndarray, 
    top_k: int = 10,
    use_shap: bool = True
) -> List[Dict[str, float]]:
    """
    Extract top features using SHAP or weight heuristics.
    
    Args:
        model: Trained model
        embedding: Input embedding (1D or 2D array)
        top_k: Number of top features to return
        use_shap: Whether to use SHAP (if available) or fall back to heuristics
        
    Returns:
        List of dicts with 'dimension', 'importance', and 'contribution'
    """
    # Ensure embedding is 2D
    if len(embedding.shape) == 1:
        embedding = embedding.reshape(1, -1)
    
    # Try SHAP first if requested and available
    if use_shap:
        try:
            import shap
            # Create SHAP explainer
            if isinstance(model, MLPClassifier):
                # For neural networks, use KernelExplainer or DeepExplainer
                try:
                    explainer = shap.KernelExplainer(model.predict_proba, embedding)
                    shap_values = explainer.shap_values(embedding)
                    # Handle multi-class output
                    if isinstance(shap_values, list):
                        shap_values = shap_values[1]  # Use positive class
                    shap_values = shap_values[0]  # Get first sample
                except:
                    # Fall back to heuristics
                    return _extract_using_heuristics(model, embedding, top_k)
            else:
                # For other models, use LinearExplainer or KernelExplainer
                try:
                    explainer = shap.LinearExplainer(model, embedding)
                    shap_values = explainer.shap_values(embedding)
                    if isinstance(shap_values, list):
                        shap_values = shap_values[1]
                    shap_values = shap_values[0]
                except:
                    return _extract_using_heuristics(model, embedding, top_k)
            
            # Get top features by absolute SHAP value
            abs_shap = np.abs(shap_values)
            top_indices = np.argsort(abs_shap)[::-1][:top_k]
            
            features = []
            for idx in top_indices:
                features.append({
                    'dimension': int(idx),
                    'importance': float(abs_shap[idx]),
                    'contribution': float(shap_values[idx])
                })
            return features
        except ImportError:
            # SHAP not available, use heuristics
            return _extract_using_heuristics(model, embedding, top_k)
        except Exception:
            # SHAP failed, use heuristics
            return _extract_using_heuristics(model, embedding, top_k)
    else:
        return _extract_using_heuristics(model, embedding, top_k)


def _extract_using_heuristics(
    model, 
    embedding: np.ndarray, 
    top_k: int
) -> List[Dict[str, float]]:
    """
    Extract top features using model-specific heuristics.
    
    Args:
        model: Trained model
        embedding: Input embedding (2D array)
        top_k: Number of top features to return
        
    Returns:
        List of dicts with 'dimension', 'importance', and 'contribution'
    """
    features = []
    
    # Logistic Regression: use coefficients
    if isinstance(model, LogisticRegression):
        coef = model.coef_[0]  # Get coefficients for first (or only) class
        abs_coef = np.abs(coef)
        top_indices = np.argsort(abs_coef)[::-1][:top_k]
        
        for idx in top_indices:
            features.append({
                'dimension': int(idx),
                'importance': float(abs_coef[idx]),
                'contribution': float(coef[idx])
            })
    
    # Random Forest or Gradient Boosting: use feature importances
    elif isinstance(model, (RandomForestClassifier, GradientBoostingClassifier)):
        importances = model.feature_importances_
        top_indices = np.argsort(importances)[::-1][:top_k]
        
        for idx in top_indices:
            # For tree models, estimate contribution using permutation
            contribution = _estimate_contribution(model, embedding, idx)
            features.append({
                'dimension': int(idx),
                'importance': float(importances[idx]),
                'contribution': float(contribution)
            })
    
    # MLP: use gradient-based importance
    elif isinstance(model, MLPClassifier):
        # Use weights from first layer
        weights = model.coefs_[0]  # Input to hidden layer weights
        # Average absolute weights across hidden units
        avg_weights = np.mean(np.abs(weights), axis=1)
        top_indices = np.argsort(avg_weights)[::-1][:top_k]
        
        for idx in top_indices:
            # Estimate contribution using gradient
            contribution = _estimate_mlp_contribution(model, embedding, idx)
            features.append({
                'dimension': int(idx),
                'importance': float(avg_weights[idx]),
                'contribution': float(contribution)
            })
    
    # SVC: use support vector weights (approximation)
    elif isinstance(model, SVC):
        # For SVC, use dual coefficients as approximation
        if hasattr(model, 'dual_coef_') and model.dual_coef_.shape[0] > 0:
            # Approximate using support vectors
            coef = np.abs(model.dual_coef_[0])
            if len(coef) > 0:
                # Map to feature space (simplified)
                avg_importance = np.mean(np.abs(model.support_vectors_), axis=0)
                top_indices = np.argsort(avg_importance)[::-1][:top_k]
                
                for idx in top_indices:
                    features.append({
                        'dimension': int(idx),
                        'importance': float(avg_importance[idx]),
                        'contribution': float(avg_importance[idx] * np.sign(model.dual_coef_[0][0]) if len(model.dual_coef_[0]) > 0 else 0.0)
                    })
        else:
            # Fallback: use uniform importance
            for idx in range(min(top_k, embedding.shape[1])):
                features.append({
                    'dimension': idx,
                    'importance': 1.0 / embedding.shape[1],
                    'contribution': 0.0
                })
    else:
        # Unknown model type: return uniform importance
        for idx in range(min(top_k, embedding.shape[1])):
            features.append({
                'dimension': idx,
                'importance': 1.0 / embedding.shape[1],
                'contribution': 0.0
            })
    
    return features


def _estimate_contribution(model, embedding: np.ndarray, feature_idx: int) -> float:
    """
    Estimate feature contribution using permutation method.
    
    Args:
        model: Trained model
        embedding: Input embedding
        feature_idx: Feature index to estimate
        
    Returns:
        Estimated contribution
    """
    # Get baseline prediction
    baseline_prob = model.predict_proba(embedding)[0]
    
    # Permute feature
    permuted_embedding = embedding.copy()
    permuted_embedding[0, feature_idx] = 0.0  # Zero out feature
    
    # Get prediction with permuted feature
    permuted_prob = model.predict_proba(permuted_embedding)[0]
    
    # Contribution is the difference
    contribution = baseline_prob[1] - permuted_prob[1]  # Positive class
    
    return contribution


def _estimate_mlp_contribution(model: MLPClassifier, embedding: np.ndarray, feature_idx: int) -> float:
    """
    Estimate MLP feature contribution using gradient approximation.
    
    Args:
        model: Trained MLP model
        embedding: Input embedding
        feature_idx: Feature index to estimate
        
    Returns:
        Estimated contribution
    """
    # Simple approximation: use weight from input to first hidden layer
    if len(model.coefs_) > 0:
        weights = model.coefs_[0][feature_idx, :]  # Weights from this feature to all hidden units
        # Average weight magnitude
        avg_weight = np.mean(weights)
        return float(avg_weight * embedding[0, feature_idx])
    return 0.0

