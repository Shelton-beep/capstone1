"""
RAG (Retrieval-Augmented Generation) router for documentation-based explanations.
Uses GPT-4o-mini to generate answers from retrieved documentation.
NO HALLUCINATION - Answers must cite retrieved docs only.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
import os
from utils.rag_index import retrieve_relevant_docs

router = APIRouter(prefix="/api/rag", tags=["rag"])


class RAGRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000,
                          description="User question")


class RetrievedDoc(BaseModel):
    source: str
    section: str
    content: str
    similarity: float


class RAGResponse(BaseModel):
    answer: str
    retrieved_docs: List[RetrievedDoc]


def _generate_answer_with_gpt(question: str, docs: List[dict]) -> str:
    """
    Generate answer using GPT-4o-mini based on retrieved documentation.

    Args:
        question: User question
        docs: Retrieved documentation chunks

    Returns:
        Generated answer string
    """
    try:
        from openai import OpenAI

        # Initialize OpenAI client
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            # Fallback to documentation-only answer if no API key
            return _generate_answer_from_docs_only(question, docs)

        client = OpenAI(api_key=api_key)

        # Build context from retrieved documents
        context_parts = []
        for doc in docs:
            source = doc['source'].replace('.md', '').replace('_', ' ').title()
            section = doc.get('section', '')
            content = doc['content']

            context_parts.append(f"[From {source}")
            if section:
                context_parts.append(f", Section: {section}")
            context_parts.append(f"]\n{content}\n")

        context = "\n".join(context_parts)

        # Create prompt that enforces citation of retrieved docs
        system_prompt = """You are a helpful assistant that answers questions about a legal outcome prediction system. 
You MUST only use information from the provided documentation context. 
Do NOT make up or infer information that is not explicitly stated in the documentation.
Always cite which document and section your information comes from.
If the documentation doesn't contain enough information to answer the question, say so clearly."""

        user_prompt = f"""Based on the following documentation, answer this question: {question}

Documentation Context:
{context}

Remember: Only use information from the documentation above. Cite your sources."""

        # Call GPT-4o-mini
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,  # Lower temperature for more factual responses
            max_tokens=1000
        )

        answer = response.choices[0].message.content.strip()

        # Add citation note
        answer += "\n\n*This answer is based on the retrieved documentation above.*"

        return answer

    except ImportError:
        # OpenAI not installed, fall back to docs-only
        return _generate_answer_from_docs_only(question, docs)
    except Exception as e:
        # If GPT call fails, fall back to docs-only
        print(
            f"GPT-4o-mini error: {e}, falling back to documentation-only answer")
        return _generate_answer_from_docs_only(question, docs)


def _generate_answer_from_docs_only(question: str, docs: List[dict]) -> str:
    """
    Generate an answer ONLY from retrieved documentation (fallback).
    NO HALLUCINATION - Only uses information present in the docs.

    Args:
        question: User question
        docs: Retrieved documentation chunks

    Returns:
        Answer string that cites only the retrieved documentation
    """
    # Build answer with explicit citations
    answer_parts = []
    answer_parts.append("Based on the retrieved documentation:\n")

    # Group docs by source
    sources_used = {}
    for doc in docs:
        source = doc['source'].replace('.md', '').replace('_', ' ').title()
        if source not in sources_used:
            sources_used[source] = []
        sources_used[source].append(doc)

    # Answer based on retrieved content only
    for source, source_docs in sources_used.items():
        answer_parts.append(f"\n**From {source}:**")

        for doc in source_docs:
            section = doc.get('section', '')
            content = doc['content']

            # Extract relevant information from content
            # Only use what's actually in the document
            if section:
                answer_parts.append(f"\n{section}:")

            # Use the content directly (no generation, no hallucination)
            # Truncate if too long, but use actual content
            if len(content) > 500:
                answer_parts.append(f"{content[:500]}...")
            else:
                answer_parts.append(content)

    # Add citation note
    answer_parts.append(
        "\n\n*This answer is based solely on the retrieved documentation above.*")

    return "\n".join(answer_parts)


@router.post("/", response_model=RAGResponse)
async def explain_with_rag(request: RAGRequest):
    """
    Answer questions using RAG by retrieving relevant documentation and generating
    explanations with GPT-4o-mini.
    NO HALLUCINATION - Only uses information from retrieved documents.

    Args:
        request: RAGRequest containing a question

    Returns:
        RAGResponse with answer and retrieved documentation

    Raises:
        HTTPException: For validation errors or retrieval failures
    """
    try:
        # Input validation (Pydantic handles basic validation, but add explicit checks)
        if not request.question or len(request.question.strip()) == 0:
            raise HTTPException(
                status_code=400, detail="Question cannot be empty")

        question = request.question.strip()
        if len(question) > 1000:
            raise HTTPException(
                status_code=400, detail="Question exceeds maximum length of 1000 characters")

        # Retrieve relevant documentation
        try:
            relevant_docs = retrieve_relevant_docs(question, top_k=3)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except RuntimeError as e:
            raise HTTPException(
                status_code=500, detail=f"Documentation retrieval failed: {str(e)}")

        if not relevant_docs:
            return RAGResponse(
                answer=(
                    "I couldn't find relevant documentation to answer your question. "
                    "Please try rephrasing your question or ask about:\n"
                    "- Data dictionary (columns and fields)\n"
                    "- Modeling pipeline and approach\n"
                    "- How predictions are interpreted\n"
                    "- System limitations"
                ),
                retrieved_docs=[]
            )

        # Generate answer using GPT-4o-mini (with fallback to docs-only)
        answer = _generate_answer_with_gpt(question, relevant_docs)

        # Format retrieved docs
        retrieved_docs_formatted = [
            RetrievedDoc(
                source=doc['source'],
                section=doc.get('section', 'Unknown'),
                content=doc['content'],
                similarity=doc['similarity']
            )
            for doc in relevant_docs
        ]

        return RAGResponse(
            answer=answer,
            retrieved_docs=retrieved_docs_formatted
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG error: {str(e)}")
