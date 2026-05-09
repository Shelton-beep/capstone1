# Cross-Encoder Reranker — Production Upgrade Guide

## Current state

The system uses `rerank_with_gpt()` in `utils/hybrid_retrieval.py` as the final
reranking step after BM25 + cosine RRF fusion. GPT-4o-mini receives a numbered
list of candidate cases and picks the most legally relevant ones.

**Why this is fine for a demo:**
- No extra model weight to load
- Leverages GPT's legal reasoning
- Zero new dependencies

**Why you'd replace it in production:**
- ~500 ms added latency per search (API round-trip)
- Costs money per query
- Non-deterministic even at temperature=0
- Breaks without internet access / API key

---

## What a cross-encoder is

A **cross-encoder** takes `(query, document)` concatenated as a single input and
outputs one relevance score. Because both texts are processed together (not as
separate embeddings), the model captures fine-grained token-level interactions —
"how much does *this specific query* match *this specific document*?"

This is fundamentally more accurate than:
- Bi-encoders (LegalBERT cosine similarity) — texts encoded independently, no
  cross-attention between them
- GPT list prompting — GPT isn't trained to rank; it's improvising

---

## Recommended model

```
cross-encoder/ms-marco-MiniLM-L-6-v2
```

- **Size**: ~80 MB (tiny, loads in < 1 s)
- **Task**: Trained on MS MARCO passage ranking (query-document relevance)
- **Speed**: ~5–10 ms per pair on CPU, suitable for reranking 15–30 candidates
- **Package**: `sentence-transformers` — already in `pyproject.toml`

For a legal-domain boost (optional, more accurate):
```
cross-encoder/ms-marco-electra-base   # larger, slower, better
```

---

## Implementation — drop-in swap

Open `utils/hybrid_retrieval.py` and replace `rerank_with_gpt` with the
following. The function signature and return type are identical, so `similar.py`
needs zero changes.

```python
from sentence_transformers import CrossEncoder

# Module-level cache — loaded once on first call
_cross_encoder: "CrossEncoder | None" = None


def _get_cross_encoder() -> CrossEncoder:
    global _cross_encoder
    if _cross_encoder is None:
        print("Loading cross-encoder model …")
        _cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        print("Cross-encoder ready.")
    return _cross_encoder


def rerank_with_cross_encoder(
    query_text: str,
    candidates: list[dict],
    top_k: int,
) -> list[dict]:
    """Re-rank candidates using a cross-encoder relevance model.

    Drop-in replacement for rerank_with_gpt().
    Falls back to original order if the model fails to load.

    Args:
        query_text:  Raw query string (text or joined facts).
        candidates:  List of case dicts (must have 'snippet' key).
        top_k:       Number of results to return.

    Returns:
        Re-ranked list of at most top_k case dicts.
    """
    if len(candidates) <= top_k:
        return candidates

    try:
        model = _get_cross_encoder()

        # Score each (query, snippet) pair
        # Use snippet (300 chars) not full_text to keep inference fast
        pairs = [(query_text[:512], c.get("snippet", "")[:300]) for c in candidates]
        scores = model.predict(pairs)

        ranked = sorted(zip(scores, candidates), key=lambda x: x[0], reverse=True)
        return [c for _, c in ranked[:top_k]]

    except Exception as exc:
        print(f"Cross-encoder reranker failed ({exc}); using hybrid order.")
        return candidates[:top_k]
```

Then in `similar.py` change the one import line:

```python
# Before
from utils.hybrid_retrieval import hybrid_search, rerank_with_gpt

# After
from utils.hybrid_retrieval import hybrid_search, rerank_with_cross_encoder as rerank_with_gpt
```

That single alias means the rest of `similar.py` is untouched.

---

## Adding the dependency

```bash
cd backend
uv add sentence-transformers   # already present — no action needed
```

`sentence-transformers` is already in `pyproject.toml` (used for LegalBERT
embeddings). `CrossEncoder` ships in the same package.

---

## Performance comparison

| Method | Latency | Cost | Accuracy | Offline |
|---|---|---|---|---|
| Pure cosine (old) | ~0 ms | free | baseline | yes |
| Hybrid RRF (current) | ~5 ms | free | +better | yes |
| GPT reranker (current) | ~500 ms | ~$0.001/call | +good | no |
| Cross-encoder (this guide) | ~20–50 ms | free | +best | yes |

---

## Optional: fine-tune on your own legal data

If you want the cross-encoder to understand legal win/lose outcomes specifically,
you can fine-tune on your `clean_dataset.csv`:

```python
from sentence_transformers.cross_encoder import CrossEncoder
from sentence_transformers.cross_encoder.evaluation import CERerankingEvaluator

model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", num_labels=1)

# Training pairs: (query_facts, relevant_case_text, label=1.0 or 0.0)
# label=1.0 → case is a good precedent for this query
# label=0.0 → case is not relevant

model.fit(
    train_dataloader=train_loader,
    epochs=3,
    warmup_steps=100,
    output_path="models/cross_encoder_legal"
)
```

A fine-tuned model of this size would outperform even GPT-4o on your specific
legal domain — but requires ~500–1000 labeled (query, precedent) pairs.

---

## When to make the switch

| Scenario | Recommendation |
|---|---|
| Demo / coursework | Keep GPT reranker |
| No OpenAI key available | Switch to cross-encoder now |
| Deploying offline / on-premise | Switch to cross-encoder |
| High query volume (>100/day) | Switch to cross-encoder (cost) |
| Maximum accuracy required | Fine-tune cross-encoder on legal data |
