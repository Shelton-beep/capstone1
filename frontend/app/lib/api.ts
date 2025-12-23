/**
 * API client for Legal Outcome Prediction backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PredictionRequest {
  text: string;
  court?: string;
  jurisdiction?: string;
  nature_of_suit?: string;
  year?: number;
}

export interface TopFeature {
  dimension: number;
  importance: number;
  contribution: number;
}

export interface OutcomeLikelihoods {
  reversed?: number;
  granted?: number;
  affirmed?: number;
  denied?: number;
  dismissed?: number;
  remanded?: number;
}

export interface PredictionResponse {
  prediction: string; // Internal: 'win' or 'lose'
  legal_judgment: string; // User-facing: proper legal language
  probability: number;
  confidence: number;
  extracted_facts: string[]; // Key case facts extracted from the text
  outcome_likelihoods: OutcomeLikelihoods;
  top_features: TopFeature[];
  explanation: string;
}

export interface SimilarCase {
  case_name: string;
  snippet: string;
  similarity: number;
  outcome: string; // win or lose
  original_outcome?: string; // Original outcome label (e.g., REVERSED, GRANTED, AFFIRMED)
  full_text: string; // Full case text
  court?: string;
  date_filed?: string;
  docket_id?: string;
}

export interface SimilarRequest {
  text?: string;
  facts?: string[];
  top_k?: number; // Number of similar cases to return (1-10)
}

export interface SimilarResponse {
  similar_cases: SimilarCase[];
}

export interface BriefRequest {
  facts: string[];
  similar_cases?: SimilarCase[];
  nature_of_suit?: string;
  legal_judgment?: string;
  improvement_instructions?: string;
  existing_brief?: string;
}

export interface BriefResponse {
  brief: string;
  case_citations: string[];
}

export async function generateBrief(
  facts: string[],
  similarCases?: SimilarCase[],
  natureOfSuit?: string,
  legalJudgment?: string,
  improvementInstructions?: string,
  existingBrief?: string,
  onProgress?: ProgressCallback
): Promise<BriefResponse> {
  const requestBody: BriefRequest = {
    facts,
    similar_cases: similarCases,
    nature_of_suit: natureOfSuit,
    legal_judgment: legalJudgment,
    improvement_instructions: improvementInstructions,
    existing_brief: existingBrief,
  };

  // Use streaming endpoint if progress callback is provided
  if (onProgress) {
    return generateBriefStream(requestBody, onProgress);
  }
  
  // Fallback to regular endpoint
  const response = await fetch(`${API_BASE_URL}/api/brief/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Brief generation failed");
  }

  return response.json();
}

async function generateBriefStream(
  requestBody: BriefRequest,
  onProgress: ProgressCallback
): Promise<BriefResponse> {
  const response = await fetch(`${API_BASE_URL}/api/brief/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Brief generation failed");
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new Promise((resolve, reject) => {
    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "error") {
                reject(new Error(data.message || "Brief generation failed"));
                return;
              } else if (data.type === "result") {
                resolve(data.data as BriefResponse);
                return;
              } else if (data.type === "progress") {
                onProgress(data as ProgressUpdate);
              }
            }
          }
        }
      } catch (error) {
        reject(error);
      }
    };

    processStream();
  });
}

export interface RetrievedDoc {
  source: string;
  section: string;
  content: string;
  similarity: number;
}

export interface RAGRequest {
  question: string;
}

export interface RAGResponse {
  answer: string;
  retrieved_docs: RetrievedDoc[];
}

export interface ProgressUpdate {
  type: "progress" | "result" | "error";
  step?: string;
  message?: string;
  data?: any;
}

export type ProgressCallback = (update: ProgressUpdate) => void;

export async function predictCase(
  text?: string,
  court?: string,
  jurisdiction?: string,
  nature_of_suit?: string,
  year?: number,
  facts?: string[],
  onProgress?: ProgressCallback
): Promise<PredictionResponse> {
  const requestBody: any = {
    court,
    jurisdiction,
    nature_of_suit,
    year,
  };
  
  if (facts && facts.length > 0) {
    requestBody.facts = facts;
  } else if (text) {
    requestBody.text = text;
  }

  // Use streaming endpoint if progress callback is provided
  if (onProgress) {
    return predictCaseStream(requestBody, onProgress);
  }
  
  // Fallback to regular endpoint
  const response = await fetch(`${API_BASE_URL}/api/predict/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Prediction failed");
  }

  return response.json();
}

async function predictCaseStream(
  requestBody: any,
  onProgress: ProgressCallback
): Promise<PredictionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/predict/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Prediction failed");
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new Promise((resolve, reject) => {
    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "error") {
                reject(new Error(data.message || "Prediction failed"));
                return;
              } else if (data.type === "result") {
                resolve(data.data as PredictionResponse);
                return;
              } else if (data.type === "progress") {
                onProgress(data as ProgressUpdate);
              }
            }
          }
        }
      } catch (error) {
        reject(error);
      }
    };

    processStream();
  });
}

export async function findSimilarCases(
  text: string,
  facts?: string[],
  topK?: number
): Promise<SimilarResponse> {
  // Always include top_k, default to 5 if not provided
  const top_k_value = topK || 5;
  const requestBody: SimilarRequest = facts && facts.length > 0
    ? { facts, top_k: top_k_value }
    : { text, top_k: top_k_value };
    
  const response = await fetch(`${API_BASE_URL}/api/similar/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Similarity search failed");
  }

  return response.json();
}

export async function askQuestion(
  question: string
): Promise<RAGResponse> {
  const response = await fetch(`${API_BASE_URL}/api/rag/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "RAG explanation failed");
  }

  return response.json();
}

