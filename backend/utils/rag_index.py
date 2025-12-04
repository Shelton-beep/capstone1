"""
RAG index utilities for documentation-based retrieval.
"""
import os
from pathlib import Path
from typing import List, Dict, Tuple
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import re
import torch

# Global instances
_embedding_model = None
_documentation_chunks = None
_documentation_embeddings = None

def get_rag_docs_dir() -> Path:
    """Get the RAG documentation directory path."""
    return Path(__file__).parent.parent / 'rag_docs'

def get_embedding_model():
    """Get or load the embedding model for RAG with GPU fallback."""
    global _embedding_model
    if _embedding_model is None:
        try:
            # Try to use GPU if available
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
            print(f"Loading embedding model on device: {device}")
            
            # Use LegalBERT for consistency with main model
            _embedding_model = SentenceTransformer(
                'nlpaueb/legal-bert-base-uncased',
                device=device
            )
        except Exception as e:
            print(f"Error loading LegalBERT, falling back to general model: {e}")
            try:
                # Fallback to general model
                device = 'cuda' if torch.cuda.is_available() else 'cpu'
                _embedding_model = SentenceTransformer(
                    'all-MiniLM-L6-v2',
                    device=device
                )
            except Exception as e2:
                print(f"Error loading fallback model: {e2}")
                raise RuntimeError("Failed to load any embedding model")
    return _embedding_model

def load_documentation() -> Tuple[List[Dict], np.ndarray]:
    """
    Load and chunk documentation files, generate embeddings.
    
    Returns:
        Tuple of (chunks, embeddings)
        chunks: List of dicts with 'source', 'content', 'section'
        embeddings: numpy array of embeddings
    """
    global _documentation_chunks, _documentation_embeddings
    
    if _documentation_chunks is not None and _documentation_embeddings is not None:
        return _documentation_chunks, _documentation_embeddings
    
    docs_dir = get_rag_docs_dir()
    chunks = []
    
    # Documentation files to load (from rag_docs/)
    doc_files = [
        'data_dictionary.md',
        'modeling_report.md',
        'explanation_guide.md',
        'system_limitations.md'
    ]
    
    # Load and chunk each file
    for doc_file in doc_files:
        file_path = docs_dir / doc_file
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Split into chunks (by sections or paragraphs)
                file_chunks = _chunk_text(content, source=doc_file)
                chunks.extend(file_chunks)
            except Exception as e:
                print(f"Warning: Failed to load {doc_file}: {e}")
                continue
        else:
            print(f"Warning: Documentation file not found: {file_path}")
    
    if len(chunks) == 0:
        raise RuntimeError("No documentation chunks loaded. Check rag_docs/ directory.")
    
    # Generate embeddings
    try:
        model = get_embedding_model()
        texts = [chunk['content'] for chunk in chunks]
        embeddings = model.encode(texts, batch_size=8, show_progress_bar=False)
        
        _documentation_chunks = chunks
        _documentation_embeddings = embeddings
    except Exception as e:
        raise RuntimeError(f"Failed to generate embeddings: {e}")
    
    return chunks, embeddings


def _chunk_text(text: str, source: str, chunk_size: int = 500) -> List[Dict]:
    """
    Split text into chunks for RAG.
    
    Args:
        text: Text to chunk
        source: Source file name
        chunk_size: Target chunk size in characters
        
    Returns:
        List of chunk dicts
    """
    chunks = []
    
    # Split by markdown headers first
    sections = re.split(r'\n(#{1,3}\s+.+?)\n', text)
    
    current_section = None
    current_content = []
    
    for i, section in enumerate(sections):
        if i % 2 == 0:  # Content
            if section.strip():
                current_content.append(section.strip())
        else:  # Header
            # Save previous section if exists
            if current_section and current_content:
                content = '\n'.join(current_content)
                if len(content) > chunk_size:
                    # Further split large sections
                    sub_chunks = _split_large_chunk(content, chunk_size)
                    for j, sub_chunk in enumerate(sub_chunks):
                        chunks.append({
                            'source': source,
                            'section': current_section,
                            'content': sub_chunk,
                            'chunk_index': j
                        })
                else:
                    chunks.append({
                        'source': source,
                        'section': current_section,
                        'content': content,
                        'chunk_index': 0
                    })
                current_content = []
            current_section = section.strip('#').strip()
            current_content.append(section)
    
    # Handle last section
    if current_section and current_content:
        content = '\n'.join(current_content)
        if len(content) > chunk_size:
            sub_chunks = _split_large_chunk(content, chunk_size)
            for j, sub_chunk in enumerate(sub_chunks):
                chunks.append({
                    'source': source,
                    'section': current_section,
                    'content': sub_chunk,
                    'chunk_index': j
                })
        else:
            chunks.append({
                'source': source,
                'section': current_section,
                'content': content,
                'chunk_index': 0
            })
    
    # If no sections found, split by paragraphs
    if not chunks:
        paragraphs = text.split('\n\n')
        current_chunk = []
        current_length = 0
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            if current_length + len(para) > chunk_size and current_chunk:
                chunks.append({
                    'source': source,
                    'section': 'Introduction',
                    'content': '\n\n'.join(current_chunk),
                    'chunk_index': len(chunks)
                })
                current_chunk = [para]
                current_length = len(para)
            else:
                current_chunk.append(para)
                current_length += len(para) + 2
        
        if current_chunk:
            chunks.append({
                'source': source,
                'section': 'Introduction',
                'content': '\n\n'.join(current_chunk),
                'chunk_index': len(chunks)
            })
    
    return chunks


def _split_large_chunk(text: str, chunk_size: int) -> List[str]:
    """Split a large chunk into smaller chunks."""
    chunks = []
    paragraphs = text.split('\n\n')
    current_chunk = []
    current_length = 0
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        
        if current_length + len(para) > chunk_size and current_chunk:
            chunks.append('\n\n'.join(current_chunk))
            current_chunk = [para]
            current_length = len(para)
        else:
            current_chunk.append(para)
            current_length += len(para) + 2
    
    if current_chunk:
        chunks.append('\n\n'.join(current_chunk))
    
    return chunks


def retrieve_relevant_docs(question: str, top_k: int = 3) -> List[Dict]:
    """
    Retrieve relevant documentation chunks for a question.
    
    Args:
        question: User question (must be non-empty)
        top_k: Number of chunks to retrieve (1-10)
        
    Returns:
        List of relevant chunk dicts with similarity scores
    """
    # Input validation
    if not question or not isinstance(question, str):
        raise ValueError("Question must be a non-empty string")
    
    question = question.strip()
    if len(question) == 0:
        raise ValueError("Question cannot be empty")
    
    if top_k < 1 or top_k > 10:
        raise ValueError("top_k must be between 1 and 10")
    
    try:
        chunks, embeddings = load_documentation()
    except Exception as e:
        raise RuntimeError(f"Failed to load documentation: {e}")
    
    if len(chunks) == 0:
        return []
    
    try:
        # Generate question embedding
        model = get_embedding_model()
        question_embedding = model.encode([question], show_progress_bar=False)[0]
        question_array = np.array(question_embedding).reshape(1, -1)
        
        # Compute similarities
        similarities = cosine_similarity(question_array, embeddings)[0]
        
        # Get top_k indices
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        # Build results
        results = []
        for idx in top_indices:
            chunk = chunks[idx].copy()
            chunk['similarity'] = float(similarities[idx])
            results.append(chunk)
        
        return results
    except Exception as e:
        raise RuntimeError(f"Failed to retrieve documents: {e}")
