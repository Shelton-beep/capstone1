"""
Hybrid retrieval for precedent case search.

Combines BM25 (keyword matching) and LegalBERT cosine similarity (semantic
matching) via Reciprocal Rank Fusion (RRF), then optionally re-ranks the
candidate pool with a GPT judge.

Why each component matters for legal text:
- BM25  : Surfaces exact statute citations (e.g. "42 USC 1983"), procedural
          keywords ("summary judgment", "28-day deadline"), and outcome labels
          that embeddings tend to underweight.
- Vector: Captures semantic proximity between similar legal arguments even when
          phrased differently.
- RRF   : Merges the two ranked lists without requiring score normalization.
          k=60 is the standard constant that limits the outsized influence of
          rank-1 hits from either method.
- GPT   : A lightweight cross-encoder substitute — asks the model to pick the
          most legally relevant candidates from the fused pool.
          Optional; falls back silently if the API key is absent.
"""

import os
import re
from typing import List, Tuple

import numpy as np
import pandas as pd
from rank_bm25 import BM25Okapi

# ──────────────────────────────────────────────────────────────────────────────
# BM25 index cache
# ──────────────────────────────────────────────────────────────────────────────

_bm25_index: "BM25Okapi | None" = None
_bm25_dataset_len: int = 0


def _tokenize(text: str) -> List[str]:
    """Lowercase + alphanumeric tokenisation.

    Keeps statute fragments intact (e.g. ``42``, ``usc``, ``1983`` as separate
    tokens so BM25 can score documents containing all three higher).
    """
    return re.findall(r"[a-z0-9]+", text.lower())


def build_bm25_index(dataset: pd.DataFrame) -> BM25Okapi:
    """Return a cached BM25 index built from ``dataset['clean_text']``.

    Rebuilds only when the dataset row count changes (e.g. after retraining).
    Building takes ~1–3 s for 5 k–20 k documents; subsequent calls are instant.
    """
    global _bm25_index, _bm25_dataset_len

    current_len = len(dataset)
    if _bm25_index is not None and _bm25_dataset_len == current_len:
        return _bm25_index

    print(f"Building BM25 index over {current_len} documents …")
    texts = dataset["clean_text"].fillna("").tolist()
    tokenized = [_tokenize(t) for t in texts]
    _bm25_index = BM25Okapi(tokenized)
    _bm25_dataset_len = current_len
    print("BM25 index ready.")
    return _bm25_index


# ──────────────────────────────────────────────────────────────────────────────
# Hybrid search (BM25 + vector → RRF)
# ──────────────────────────────────────────────────────────────────────────────

def hybrid_search(
    query_text: str,
    cosine_scores: np.ndarray,
    dataset: pd.DataFrame,
    top_k: int = 5,
    bm25_weight: float = 0.35,
) -> List[Tuple[int, float]]:
    """Fuse BM25 and vector rankings with Reciprocal Rank Fusion.

    Args:
        query_text:    Raw query string used for BM25 token matching.
        cosine_scores: Pre-computed cosine similarity scores of shape ``(n,)``.
                       Pass the array from ``similar.py`` to avoid recomputing.
        dataset:       DataFrame with a ``clean_text`` column.
        top_k:         Number of results to return.
        bm25_weight:   BM25's share of the fused score (0–1).
                       Remaining weight goes to cosine similarity.
                       Default 0.35 — LegalBERT is the stronger signal; BM25
                       acts as a keyword booster.

    Returns:
        List of ``(row_index, rrf_score)`` tuples sorted by score descending.
    """
    n = len(dataset)
    candidate_pool = min(top_k * 4, n)  # consider 4× candidates before fusing

    # Ranked indices — highest score first
    vector_ranks = np.argsort(cosine_scores)[::-1]

    bm25 = build_bm25_index(dataset)
    bm25_scores = bm25.get_scores(_tokenize(query_text))
    bm25_ranks = np.argsort(bm25_scores)[::-1]

    # Weighted RRF
    K = 60
    vector_weight = 1.0 - bm25_weight
    rrf_scores = np.zeros(n)

    for rank, idx in enumerate(vector_ranks[:candidate_pool]):
        rrf_scores[idx] += vector_weight / (K + rank)

    for rank, idx in enumerate(bm25_ranks[:candidate_pool]):
        rrf_scores[idx] += bm25_weight / (K + rank)

    top_indices = np.argsort(rrf_scores)[::-1][:top_k]
    return [(int(idx), float(rrf_scores[idx])) for idx in top_indices]


# ──────────────────────────────────────────────────────────────────────────────
# Optional GPT reranker
# ──────────────────────────────────────────────────────────────────────────────

def rerank_with_gpt(
    query_text: str,
    candidates: List[dict],
    top_k: int,
) -> List[dict]:
    """Re-rank ``candidates`` with GPT-4o-mini as a lightweight cross-encoder.

    Asks the model to return the indices of the ``top_k`` most legally relevant
    cases. Falls back to the original hybrid order if:
    - ``OPENAI_API_KEY`` is not set
    - The candidate pool is already ≤ ``top_k``
    - The API call fails for any reason

    Args:
        query_text:  The query case text or joined facts string.
        candidates:  List of case dicts (must contain ``case_name``,
                     ``snippet``, ``outcome``, ``original_outcome``).
        top_k:       Number of results to return.

    Returns:
        Re-ranked list of at most ``top_k`` case dicts.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or len(candidates) <= top_k:
        return candidates[:top_k]

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        lines = []
        for i, case in enumerate(candidates):
            outcome_label = case.get("original_outcome") or case.get("outcome", "")
            snippet = (case.get("snippet") or "")[:150]
            lines.append(
                f"{i + 1}. [{case.get('case_name', 'Unknown')} | {outcome_label}] {snippet}"
            )
        candidates_text = "\n".join(lines)

        query_preview = query_text[:600]

        prompt = (
            "You are a legal research assistant. Rank the following precedent cases "
            "by relevance to the appeal case query below.\n\n"
            f"QUERY:\n{query_preview}\n\n"
            f"CANDIDATES:\n{candidates_text}\n\n"
            f"Return ONLY a comma-separated list of the {top_k} most relevant case "
            "numbers in order (e.g. \"3,1,5\"). No explanation."
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=40,
        )

        raw = response.choices[0].message.content.strip()

        selected = []
        seen: set = set()
        for token in raw.replace(" ", "").split(","):
            try:
                zero_idx = int(token) - 1
                if 0 <= zero_idx < len(candidates) and zero_idx not in seen:
                    selected.append(candidates[zero_idx])
                    seen.add(zero_idx)
            except ValueError:
                continue

        # Fill any remaining slots from the original hybrid order
        for i, case in enumerate(candidates):
            if len(selected) >= top_k:
                break
            if i not in seen:
                selected.append(case)
                seen.add(i)

        return selected[:top_k]

    except Exception as exc:
        print(f"GPT reranker skipped ({exc}); using hybrid order.")
        return candidates[:top_k]
