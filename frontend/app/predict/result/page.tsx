"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ResultCard } from "@/app/components/ResultCard";
import { PrecedentCard } from "@/app/components/PrecedentCard";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  PredictionResponse,
  findSimilarCases,
  SimilarResponse,
  generateBrief,
  SimilarCase,
} from "@/lib/api";
import { ArrowLeft, Loader2, Edit2, Check, X, Plus, Trash2, FileText, Download, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { predictCase } from "@/lib/api";

// Helper function to calculate brief generation progress width
function getBriefProgressWidth(step: string): string {
  const stepProgress: Record<string, number> = {
    "validation": 10,
    "preparing": 20,
    "filtering_precedents": 40,
    "generating": 80,
  }
  return `${stepProgress[step] || 0}%`
}

// Helper function to calculate simulation progress width
function getSimulationProgressWidth(step: string): string {
  const stepProgress: Record<string, number> = {
    "validation": 10,
    "extracting_facts": 25,
    "generating_embeddings": 40,
    "predicting": 55,
    "calculating_probabilities": 65,
    "extracting_features": 75,
    "calculating_likelihoods": 85,
    "determining_judgment": 90,
    "generating_explanation": 95,
  }
  return `${stepProgress[step] || 0}%`
}

export default function ResultPage() {
  const router = useRouter();
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [inputText, setInputText] = useState<string>("");
  const [originalInputs, setOriginalInputs] = useState<{
    court?: string;
    jurisdiction?: string;
    nature_of_suit?: string;
    year?: number;
  } | null>(null);
  const [similarCases, setSimilarCases] = useState<SimilarResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFacts, setEditingFacts] = useState(false);
  const [editedFacts, setEditedFacts] = useState<string[]>([]);
  const [repredicting, setRepredicting] = useState(false);
  const [numPrecedents, setNumPrecedents] = useState(5); // Default to 5 precedents
  const [loadingPrecedents, setLoadingPrecedents] = useState(false); // Loading state for precedents only
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [legalBrief, setLegalBrief] = useState<string | null>(null);
  const [briefCitations, setBriefCitations] = useState<string[]>([]);
  const [briefDialogOpen, setBriefDialogOpen] = useState(false);
  const [showImproveBrief, setShowImproveBrief] = useState(false);
  const [improvementPrompt, setImprovementPrompt] = useState("");
  const [improvingBrief, setImprovingBrief] = useState(false);
  const [simulatingPrediction, setSimulatingPrediction] = useState(false);
  const [briefPrediction, setBriefPrediction] = useState<PredictionResponse | null>(null);
  const [briefProgress, setBriefProgress] = useState<string>("");
  const [briefProgressStep, setBriefProgressStep] = useState<string>("");
  const [simulationProgress, setSimulationProgress] = useState<string>("");
  const [simulationProgressStep, setSimulationProgressStep] = useState<string>("");

  useEffect(() => {
    // Get prediction result from sessionStorage
    const storedResult = sessionStorage.getItem("predictionResult");
    const storedText = sessionStorage.getItem("inputText");

    if (!storedResult || !storedText) {
      router.push("/predict");
      return;
    }

    try {
      const result: PredictionResponse = JSON.parse(storedResult);
      setPrediction(result);
      setInputText(storedText);
      // Initialize editedFacts - ensure it's always an array
      const extractedFacts = result.extracted_facts || [];
      setEditedFacts(extractedFacts.length > 0 ? [...extractedFacts] : []);
      
      // Debug: log facts to console
      console.log("Extracted facts:", result.extracted_facts);

      // Get original inputs
      const storedInputs = sessionStorage.getItem("originalInputs");
      if (storedInputs) {
        try {
          setOriginalInputs(JSON.parse(storedInputs));
        } catch (e) {
          console.error("Failed to parse original inputs", e);
        }
      }

      // Fetch similar cases using extracted facts (prioritize facts over text)
      // Facts are more focused and will give better similar case matches
      if (extractedFacts.length > 0) {
        findSimilarCases("", extractedFacts, numPrecedents)
          .then((similar) => {
            setSimilarCases(similar);
          })
          .catch((err) => {
            setError(
              err instanceof Error ? err.message : "Failed to load similar cases"
            );
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        // Fallback to text if no facts extracted
        findSimilarCases(storedText, undefined, numPrecedents)
          .then((similar) => {
            setSimilarCases(similar);
          })
          .catch((err) => {
            setError(
              err instanceof Error ? err.message : "Failed to load similar cases"
            );
          })
          .finally(() => {
            setLoading(false);
          });
      }
    } catch (err) {
      setError("Failed to parse prediction result");
      setLoading(false);
    }
  }, [router]);

  const handleRepredict = async () => {
    if (!originalInputs || editedFacts.length === 0) return;
    
    setRepredicting(true);
    setError(null);
    setLoading(true); // Show loading state for the whole page
    
    try {
      // Re-predict with edited facts
      const result = await predictCase(
        undefined, // No text, use facts instead
        originalInputs.court,
        originalInputs.jurisdiction,
        originalInputs.nature_of_suit,
        originalInputs.year,
        editedFacts
      );
      
      // Update all state with new prediction results
      setPrediction(result);
      setEditedFacts(result.extracted_facts || editedFacts); // Update with new extracted facts from response
      setEditingFacts(false);
      
      // Update sessionStorage with new results
      sessionStorage.setItem("predictionResult", JSON.stringify(result));
      sessionStorage.setItem("originalInputs", JSON.stringify(originalInputs));
      
      // Fetch new similar cases based on edited facts (this is the key - use facts, not text)
      await findSimilarCases("", editedFacts, numPrecedents)
        .then((similar) => {
          setSimilarCases(similar);
        })
        .catch((err) => {
          console.error("Failed to load similar cases:", err);
          // Don't set error here, just log - similar cases are secondary
        });
      
      // Clear any previous errors
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to re-predict");
      console.error("Re-prediction error:", err);
    } finally {
      setRepredicting(false);
      setLoading(false);
    }
  };

  const handleAddFact = () => {
    setEditedFacts([...editedFacts, ""]);
  };

  const handleRemoveFact = (index: number) => {
    setEditedFacts(editedFacts.filter((_, i) => i !== index));
  };

  const handleFactChange = (index: number, value: string) => {
    const newFacts = [...editedFacts];
    newFacts[index] = value;
    setEditedFacts(newFacts);
  };

  // Helper function to parse markdown and preserve formatting
  interface FormattedSegment {
    text: string;
    bold: boolean;
  }

  interface ParsedContent {
    type: 'heading' | 'paragraph' | 'list' | 'empty';
    level?: number;
    segments: FormattedSegment[]; // Array of text segments with formatting info
    rawText: string; // Original text for line breaks
  }

  const parseMarkdown = (text: string): ParsedContent[] => {
    const result: ParsedContent[] = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Preserve empty lines
      if (!trimmed) {
        result.push({ type: 'empty', segments: [], rawText: '' });
        continue;
      }
      
      // Check for headings
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const headingText = headingMatch[2];
        const segments = parseFormattedText(headingText);
        result.push({
          type: 'heading',
          level: headingMatch[1].length,
          segments,
          rawText: headingText
        });
        continue;
      }
      
      // Check for list items
      const listMatch = trimmed.match(/^([-*•]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        const listContent = listMatch[2];
        const segments = parseFormattedText(listContent);
        result.push({
          type: 'list',
          segments,
          rawText: listContent
        });
        continue;
      }
      
      // Regular paragraph - preserve formatting
      const segments = parseFormattedText(trimmed);
      result.push({
        type: 'paragraph',
        segments,
        rawText: trimmed
      });
    }
    
    return result;
  };

  // Parse text and extract bold segments
  const parseFormattedText = (text: string): FormattedSegment[] => {
    const segments: FormattedSegment[] = [];
    let currentIndex = 0;
    
    // Match bold text (**text** or __text__)
    const boldRegex = /\*\*(.+?)\*\*|__(.+?)__/g;
    let match;
    const matches: Array<{start: number, end: number, text: string}> = [];
    
    while ((match = boldRegex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1] || match[2]
      });
    }
    
    // Build segments
    matches.forEach((boldMatch, idx) => {
      // Add text before bold
      if (boldMatch.start > currentIndex) {
        const beforeText = text.substring(currentIndex, boldMatch.start)
          .replace(/\*(.+?)\*/g, '$1') // Remove italic
          .replace(/`(.+?)`/g, '$1') // Remove code
          .replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Remove links
        if (beforeText) {
          segments.push({ text: beforeText, bold: false });
        }
      }
      
      // Add bold text
      segments.push({ text: boldMatch.text, bold: true });
      currentIndex = boldMatch.end;
    });
    
    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex)
        .replace(/\*(.+?)\*/g, '$1') // Remove italic
        .replace(/`(.+?)`/g, '$1') // Remove code
        .replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Remove links
      if (remainingText) {
        segments.push({ text: remainingText, bold: false });
      }
    }
    
    // If no bold text found, return the whole text as one segment
    if (segments.length === 0) {
      const cleanText = text
        .replace(/\*(.+?)\*/g, '$1') // Remove italic
        .replace(/`(.+?)`/g, '$1') // Remove code
        .replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Remove links
      segments.push({ text: cleanText, bold: false });
    }
    
    return segments;
  };

  const downloadBriefAsPDF = () => {
    if (!legalBrief) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;
    
    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Legal Brief / Argument", margin, yPosition);
    yPosition += 10;
    
    // Citations section
    if (briefCitations.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Case Citations:", margin, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      briefCitations.forEach((citation) => {
        const lines = doc.splitTextToSize(`• ${citation}`, maxWidth);
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin + 5, yPosition);
          yPosition += 6;
        });
        yPosition += 2;
      });
      yPosition += 5;
    }
    
    // Parse markdown and format properly
    const parsedContent = parseMarkdown(legalBrief);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    parsedContent.forEach((item) => {
      // Handle empty lines
      if (item.type === 'empty') {
        yPosition += 4;
        return;
      }
      
      if (yPosition > pageHeight - margin - 15) {
        doc.addPage();
        yPosition = margin;
      }
      
      if (item.type === 'heading') {
        const fontSize = 14 - (item.level || 1) + 2;
        doc.setFontSize(fontSize);
        yPosition += 5;
        
        // Render heading with bold segments
        const fullText = item.segments.map(s => s.text).join('');
        let currentX = margin;
        
        item.segments.forEach((segment) => {
          doc.setFont("helvetica", segment.bold ? "bold" : "normal");
          const segmentLines = doc.splitTextToSize(segment.text, maxWidth - (currentX - margin));
          
          segmentLines.forEach((line: string, lineIdx: number) => {
            if (yPosition > pageHeight - margin) {
              doc.addPage();
              yPosition = margin;
              currentX = margin;
            }
            
            if (lineIdx > 0) {
              currentX = margin; // New line
            }
            
            doc.text(line, currentX, yPosition);
            currentX += doc.getTextWidth(line);
            
            if (lineIdx < segmentLines.length - 1) {
              yPosition += 7;
              currentX = margin;
            }
          });
        });
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        yPosition += 7;
        yPosition += 3;
      } else if (item.type === 'list') {
        let xPosition = margin + 5;
        
        // Render list item with formatting
        item.segments.forEach((segment, segIdx: number) => {
          doc.setFont("helvetica", segment.bold ? "bold" : "normal");
          const lines = doc.splitTextToSize(segment.text, maxWidth - (xPosition - margin));
          
          lines.forEach((line: string, lineIdx: number) => {
            if (yPosition > pageHeight - margin) {
              doc.addPage();
              yPosition = margin;
              xPosition = margin + 5;
            }
            
            if (segIdx === 0 && lineIdx === 0) {
              doc.text('•', margin, yPosition);
            }
            
            if (lineIdx > 0 || segIdx > 0) {
              xPosition = margin + 10; // Indent wrapped lines
            }
            
            doc.text(line, xPosition, yPosition);
            const lineWidth = doc.getTextWidth(line);
            xPosition += lineWidth;
            
            if (lineIdx < lines.length - 1) {
              yPosition += 6;
              xPosition = margin + 10;
            }
          });
        });
        
        yPosition += 6;
        yPosition += 2;
      } else {
        // Paragraph - render with formatting preserved
        let currentX = margin;
        
        item.segments.forEach((segment) => {
          doc.setFont("helvetica", segment.bold ? "bold" : "normal");
          const segmentLines = doc.splitTextToSize(segment.text, maxWidth - (currentX - margin));
          
          segmentLines.forEach((line: string, lineIdx: number) => {
            if (yPosition > pageHeight - margin) {
              doc.addPage();
              yPosition = margin;
              currentX = margin;
            }
            
            if (lineIdx > 0) {
              currentX = margin; // New line
            }
            
            doc.text(line, currentX, yPosition);
            currentX += doc.getTextWidth(line);
            
            if (lineIdx < segmentLines.length - 1) {
              yPosition += 6;
              currentX = margin;
            }
          });
        });
        
        yPosition += 6;
        yPosition += 4;
      }
    });
    
    // Save PDF
    doc.save('legal-brief.pdf');
  };

  const downloadBriefAsWord = () => {
    if (!legalBrief) return;
    
    // Parse markdown and convert to RTF format (supports bold formatting)
    const parsedContent = parseMarkdown(legalBrief);
    
    // RTF header
    let rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\n`;
    rtfContent += `{\\colortbl;\\red0\\green0\\blue0;}\n`;
    
    // Title
    rtfContent += `\\f0\\fs24\\b Legal Brief / Argument\\b0\\par\\par\n`;
    
    // Citations section
    if (briefCitations.length > 0) {
      rtfContent += `\\b Case Citations:\\b0\\par\n`;
      briefCitations.forEach((citation) => {
        rtfContent += `\\bullet ${citation}\\par\n`;
      });
      rtfContent += `\\par\n`;
    }
    
    // Add parsed content with formatting
    parsedContent.forEach((item) => {
      if (item.type === 'empty') {
        rtfContent += `\\par\n`;
        return;
      }
      
      if (item.type === 'heading') {
        const fontSize = 18 - (item.level || 1) * 2;
        rtfContent += `\\par\\fs${fontSize}\\b `;
        
        // Render segments with bold formatting
        item.segments.forEach((segment) => {
          const escapedText = segment.text.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');
          if (segment.bold) {
            rtfContent += `\\b ${escapedText}\\b0 `;
          } else {
            rtfContent += escapedText;
          }
        });
        
        rtfContent += `\\b0\\fs24\\par\\par\n`;
      } else if (item.type === 'list') {
        rtfContent += `\\bullet `;
        
        // Render segments with bold formatting
        item.segments.forEach((segment) => {
          const escapedText = segment.text.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');
          if (segment.bold) {
            rtfContent += `\\b ${escapedText}\\b0 `;
          } else {
            rtfContent += escapedText;
          }
        });
        
        rtfContent += `\\par\n`;
      } else {
        // Paragraph
        item.segments.forEach((segment) => {
          const escapedText = segment.text.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');
          if (segment.bold) {
            rtfContent += `\\b ${escapedText}\\b0 `;
          } else {
            rtfContent += escapedText;
          }
        });
        
        rtfContent += `\\par\\par\n`;
      }
    });
    
    rtfContent += `}`;
    
    // Create blob and download as RTF (Word-compatible)
    const blob = new Blob([rtfContent], { 
      type: 'application/rtf' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'legal-brief.rtf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="container mx-auto px-4">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">
                {error || "No prediction result found"}
              </p>
              <Link href="/predict" className="mt-4 inline-block">
                <Button>Try Again</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4 space-y-8">
        <Link href="/predict">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Prediction
          </Button>
        </Link>

        {/* Error Display */}
        {error && (
          <Card className="w-full max-w-4xl mx-auto border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* WIN/LOSE and Probability Bar */}
        <ResultCard result={prediction} />

        {/* Extracted Case Facts - Editable */}
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Case Facts</CardTitle>
                <CardDescription>
                  Key factual elements extracted from the legal opinion text
                </CardDescription>
              </div>
              {!editingFacts ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingFacts(true);
                      // Initialize editedFacts if empty
                      if (editedFacts.length === 0) {
                        setEditedFacts(prediction.extracted_facts || [""]);
                      }
                    }}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    {prediction.extracted_facts && prediction.extracted_facts.length > 0 ? "Edit Facts" : "Add Facts"}
                  </Button>
                  <Dialog open={briefDialogOpen} onOpenChange={setBriefDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={async () => {
                          if (!prediction.extracted_facts || prediction.extracted_facts.length === 0) {
                            alert("Please ensure case facts are available before generating a brief.");
                            return;
                          }
                          setGeneratingBrief(true);
                          setBriefDialogOpen(true);
                          setBriefPrediction(null);
                          setBriefProgress("");
                          setBriefProgressStep("");
                          try {
                            // Filter similar cases to only include winning ones
                            const winningCases = similarCases?.similar_cases.filter(
                              (case_) => case_.outcome === 'win'
                            ) || [];
                            
                            const briefResult = await generateBrief(
                              prediction.extracted_facts,
                              winningCases.length > 0 ? winningCases : undefined,
                              originalInputs?.nature_of_suit,
                              prediction.legal_judgment,
                              undefined,
                              undefined,
                              (update) => {
                                if (update.type === "progress") {
                                  setBriefProgress(update.message || "");
                                  setBriefProgressStep(update.step || "");
                                }
                              }
                            );
                            setLegalBrief(briefResult.brief);
                            setBriefCitations(briefResult.case_citations);
                          } catch (err) {
                            console.error("Failed to generate brief:", err);
                            setLegalBrief("Failed to generate brief. Please try again.");
                          } finally {
                            setGeneratingBrief(false);
                            setBriefProgress("");
                            setBriefProgressStep("");
                          }
                        }}
                        disabled={generatingBrief || !prediction.extracted_facts || prediction.extracted_facts.length === 0}
                      >
                        {generatingBrief ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Generate Legal Brief
                          </>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1">
                            <DialogTitle>Legal Brief / Argument</DialogTitle>
                            <DialogDescription>
                              Compelling legal argument based on case facts and supporting precedents
                            </DialogDescription>
                          </div>
                          {legalBrief && (
                            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={async () => {
                                  if (!legalBrief) return;
                                  setSimulatingPrediction(true);
                                  setSimulationProgress("");
                                  setSimulationProgressStep("");
                                  try {
                                    // Use the legal brief text to predict outcome
                                    const briefPredictionResult = await predictCase(
                                      legalBrief, // Use brief as text input
                                      originalInputs?.court,
                                      originalInputs?.jurisdiction,
                                      originalInputs?.nature_of_suit,
                                      originalInputs?.year,
                                      undefined,
                                      (update) => {
                                        if (update.type === "progress") {
                                          setSimulationProgress(update.message || "");
                                          setSimulationProgressStep(update.step || "");
                                        }
                                      }
                                    );
                                    setBriefPrediction(briefPredictionResult);
                                  } catch (err) {
                                    console.error("Failed to simulate prediction:", err);
                                    alert("Failed to simulate prediction. Please try again.");
                                  } finally {
                                    setSimulatingPrediction(false);
                                    setSimulationProgress("");
                                    setSimulationProgressStep("");
                                  }
                                }}
                                disabled={simulatingPrediction}
                                className="flex items-center justify-center gap-2"
                              >
                                {simulatingPrediction ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Simulating...
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-4 w-4" />
                                    Simulate Prediction
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowImproveBrief(!showImproveBrief)}
                                className="flex items-center justify-center gap-2"
                              >
                                <Edit2 className="h-4 w-4" />
                                {showImproveBrief ? "Cancel" : "Improve Brief"}
                              </Button>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={downloadBriefAsPDF}
                                  className="flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                                >
                                  <FileDown className="h-4 w-4" />
                                  PDF
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={downloadBriefAsWord}
                                  className="flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                                >
                                  <Download className="h-4 w-4" />
                                  Word
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogHeader>
                      <div className="space-y-4">
                                    {generatingBrief || improvingBrief ? (
                                      <div className="space-y-4">
                                        <div className="bg-muted p-4 rounded-lg border border-primary/20">
                                          <div className="flex items-center gap-3 mb-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                            <div className="flex-1">
                                              <p className="text-sm font-medium text-foreground">
                                                {briefProgress || (improvingBrief ? "Improving legal brief..." : "Generating legal brief...")}
                                              </p>
                                              {briefProgressStep && (
                                                <p className="text-xs text-muted-foreground mt-1 capitalize">
                                                  {briefProgressStep.replace(/_/g, " ")}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                                            <div 
                                              className="h-full bg-primary transition-all duration-300 ease-out"
                                              style={{
                                                width: getBriefProgressWidth(briefProgressStep)
                                              }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ) : legalBrief ? (
                          <>
                            {/* Simulation Results */}
                            {briefPrediction && (
                              <Card className="border-2 border-primary/30">
                                <CardHeader>
                                  <CardTitle className="text-lg">Prediction Simulation Results</CardTitle>
                                  <CardDescription>
                                    Outcome prediction based on the legal brief
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  {/* Helper function to get defendant probability */}
                                  {(() => {
                                    // Get defendant's probability from each prediction
                                    // If prediction is "Judgment in Favor of Defendant", use probability directly
                                    // If prediction is "Judgment in Favor of Plaintiff/Government", use 1 - probability
                                    const getDefendantProbability = (pred: PredictionResponse): number => {
                                      if (pred.legal_judgment.includes("Defendant")) {
                                        return pred.probability;
                                      } else {
                                        // If it's for Plaintiff/Government, defendant's chance is inverse
                                        return 1 - pred.probability;
                                      }
                                    };
                                    
                                    const originalDefendantProb = getDefendantProbability(prediction);
                                    const briefDefendantProb = getDefendantProbability(briefPrediction);
                                    const improvement = briefDefendantProb - originalDefendantProb;
                                    
                                    return (
                                      <>
                                        {/* Comparison */}
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <p className="text-sm font-semibold text-muted-foreground">Original Prediction</p>
                                            <div className="p-3 bg-muted rounded-lg">
                                              <p className="text-sm font-bold">{prediction.legal_judgment}</p>
                                              <p className="text-xs text-muted-foreground mt-1">
                                                {(prediction.probability * 100).toFixed(1)}% probability ({prediction.legal_judgment.includes("Defendant") ? "Defendant" : "Plaintiff/Government"})
                                              </p>
                                              <p className="text-xs text-muted-foreground mt-1 font-semibold">
                                                Defendant's chance: {(originalDefendantProb * 100).toFixed(1)}%
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {prediction.confidence.toFixed(2)} confidence
                                              </p>
                                            </div>
                                          </div>
                                          <div className="space-y-2">
                                            <p className="text-sm font-semibold text-muted-foreground">Brief-Based Prediction</p>
                                            <div className="p-3 bg-primary/10 rounded-lg border-2 border-primary/30">
                                              <p className="text-sm font-bold">{briefPrediction.legal_judgment}</p>
                                              <p className="text-xs text-muted-foreground mt-1">
                                                {(briefPrediction.probability * 100).toFixed(1)}% probability ({briefPrediction.legal_judgment.includes("Defendant") ? "Defendant" : "Plaintiff/Government"})
                                              </p>
                                              <p className="text-xs text-muted-foreground mt-1 font-semibold">
                                                Defendant's chance: {(briefDefendantProb * 100).toFixed(1)}%
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {briefPrediction.confidence.toFixed(2)} confidence
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Change Analysis */}
                                        <div className="p-4 bg-muted rounded-lg">
                                          <h4 className="font-semibold mb-2 text-sm">Change Analysis (From Defendant's Perspective)</h4>
                                          {improvement > 0.01 ? (
                                            <div className="space-y-2">
                                              <p className="text-sm text-green-600 font-semibold">
                                                ↑ Improvement: +{(improvement * 100).toFixed(1)}% increase in Defendant's chances
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                The legal brief significantly strengthens your case, increasing the likelihood of a favorable outcome for the defendant/appellant from {(originalDefendantProb * 100).toFixed(1)}% to {(briefDefendantProb * 100).toFixed(1)}%.
                                              </p>
                                              {originalDefendantProb < 0.5 && briefDefendantProb >= 0.5 && (
                                                <p className="text-xs text-green-600 font-semibold mt-2">
                                                  🎯 The brief has flipped the prediction in your favor!
                                                </p>
                                              )}
                                            </div>
                                          ) : improvement < -0.01 ? (
                                            <div className="space-y-2">
                                              <p className="text-sm text-orange-600 font-semibold">
                                                ↓ Decrease: {(improvement * 100).toFixed(1)}% decrease in Defendant's chances
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                Consider refining the brief to better align with successful appeal arguments. Defendant's chances decreased from {(originalDefendantProb * 100).toFixed(1)}% to {(briefDefendantProb * 100).toFixed(1)}%.
                                              </p>
                                            </div>
                                          ) : (
                                            <div className="space-y-2">
                                              <p className="text-sm text-muted-foreground font-semibold">
                                                → No significant change
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                The brief maintains similar prediction strength. Consider adding stronger arguments or emphasizing key facts.
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </>
                                    );
                                  })()}
                                  
                                  {/* Brief-based Explanation */}
                                  {briefPrediction.explanation && (
                                    <div className="p-4 bg-muted rounded-lg">
                                      <h4 className="font-semibold mb-2 text-sm">Brief-Based Prediction Explanation</h4>
                                      <div className="text-xs text-muted-foreground prose prose-sm max-w-none">
                                        <ReactMarkdown
                                          components={{
                                            p: ({ node, ...props }) => (
                                              <p className="mb-2 leading-relaxed" {...props} />
                                            ),
                                            strong: ({ node, ...props }) => (
                                              <strong className="font-semibold" {...props} />
                                            ),
                                            ul: ({ node, ...props }) => (
                                              <ul className="list-disc list-inside mb-2 space-y-1 ml-2" {...props} />
                                            ),
                                            li: ({ node, ...props }) => (
                                              <li className="text-xs" {...props} />
                                            ),
                                          }}
                                        >
                                          {briefPrediction.explanation}
                                        </ReactMarkdown>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setBriefPrediction(null)}
                                    className="w-full"
                                  >
                                    Close Simulation
                                  </Button>
                                </CardContent>
                              </Card>
                            )}
                            
                            {/* Simulating indicator */}
                            {simulatingPrediction && (
                              <div className="bg-muted p-4 rounded-lg border border-primary/20">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">
                                      {simulationProgress || "Analyzing brief and simulating prediction..."}
                                    </p>
                                    {simulationProgressStep && (
                                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                                        {simulationProgressStep.replace(/_/g, " ")}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="h-full bg-primary transition-all duration-300 ease-out"
                                    style={{
                                      width: getSimulationProgressWidth(simulationProgressStep)
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Improve Brief Section */}
                            {showImproveBrief && (
                              <div className="bg-muted p-4 rounded-lg space-y-3 border-2 border-primary/20">
                                <div>
                                  <label htmlFor="improvement-prompt" className="text-sm font-semibold mb-2 block">
                                    How would you like to improve the brief?
                                  </label>
                                  <p className="text-xs text-muted-foreground mb-2">
                                    Describe what you want to add, change, remove, or emphasize. For example:
                                    "Add more emphasis on lack of evidence", "Strengthen the conclusion", 
                                    "Include a section on procedural errors", etc.
                                  </p>
                                  <Textarea
                                    id="improvement-prompt"
                                    value={improvementPrompt}
                                    onChange={(e) => setImprovementPrompt(e.target.value)}
                                    placeholder="Enter your improvement instructions here..."
                                    className="min-h-[100px]"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      if (!improvementPrompt.trim()) {
                                        alert("Please enter improvement instructions");
                                        return;
                                      }
                                      
                                      setImprovingBrief(true);
                                      try {
                                        // Filter similar cases to only include winning ones
                                        const winningCases = similarCases?.similar_cases.filter(
                                          (case_) => case_.outcome === 'win'
                                        ) || [];
                                        
                                        const briefResult = await generateBrief(
                                          prediction.extracted_facts || [],
                                          winningCases.length > 0 ? winningCases : undefined,
                                          originalInputs?.nature_of_suit,
                                          prediction.legal_judgment,
                                          improvementPrompt,
                                          legalBrief
                                        );
                                        
                            setLegalBrief(briefResult.brief);
                            setBriefCitations(briefResult.case_citations);
                            setImprovementPrompt("");
                            setShowImproveBrief(false);
                            setBriefPrediction(null); // Clear previous simulation when brief is improved
                                      } catch (err) {
                                        console.error("Failed to improve brief:", err);
                                        alert("Failed to improve brief. Please try again.");
                                      } finally {
                                        setImprovingBrief(false);
                                      }
                                    }}
                                    disabled={improvingBrief || !improvementPrompt.trim()}
                                  >
                                    {improvingBrief ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Improving...
                                      </>
                                    ) : (
                                      <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Apply Improvements
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setShowImproveBrief(false);
                                      setImprovementPrompt("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                            
                            {briefCitations.length > 0 && (
                              <div className="bg-muted p-4 rounded-lg">
                                <h4 className="font-semibold mb-2">Case Citations:</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                  {briefCitations.map((citation, idx) => (
                                    <li key={idx}>{citation}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown
                                components={{
                                  h1: ({ node, ...props }) => (
                                    <h1 className="text-xl font-bold mt-4 mb-2" {...props} />
                                  ),
                                  h2: ({ node, ...props }) => (
                                    <h2 className="text-lg font-semibold mt-3 mb-2" {...props} />
                                  ),
                                  h3: ({ node, ...props }) => (
                                    <h3 className="text-base font-semibold mt-2 mb-1" {...props} />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <p className="mb-3 leading-relaxed" {...props} />
                                  ),
                                  strong: ({ node, ...props }) => (
                                    <strong className="font-semibold" {...props} />
                                  ),
                                  ul: ({ node, ...props }) => (
                                    <ul className="list-disc list-inside mb-3 space-y-1 ml-4" {...props} />
                                  ),
                                  ol: ({ node, ...props }) => (
                                    <ol className="list-decimal list-inside mb-3 space-y-1 ml-4" {...props} />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li className="text-sm" {...props} />
                                  ),
                                }}
                              >
                                {legalBrief}
                              </ReactMarkdown>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Click the button to generate a legal brief.</p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingFacts(false);
                      setEditedFacts(prediction.extracted_facts || []);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleRepredict}
                    disabled={repredicting || editedFacts.length === 0 || editedFacts.some(f => !f.trim())}
                  >
                    {repredicting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Re-predicting...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Re-predict
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingFacts ? (
              <div className="space-y-3">
                {editedFacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No facts added yet. Click "Add Fact" to start.</p>
                ) : (
                  editedFacts.map((fact, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <span className="text-sm text-muted-foreground mt-2.5">{idx + 1}.</span>
                      <Input
                        value={fact}
                        onChange={(e) => handleFactChange(idx, e.target.value)}
                        placeholder="Enter case fact..."
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFact(idx)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddFact}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Fact
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Edit the facts above and click "Re-predict" to get a new prediction based on the edited facts.
                </p>
              </div>
              ) : (
                <>
                {prediction.extracted_facts && prediction.extracted_facts.length > 0 ? (
                  <ul className="space-y-2 list-disc list-inside">
                    {prediction.extracted_facts.map((fact, idx) => (
                      <li key={idx} className="text-sm text-foreground">
                        {fact}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      No facts were extracted from the legal text.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingFacts(true);
                        setEditedFacts([""]);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Facts Manually
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Show loading indicator when re-predicting */}
        {repredicting && (
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Re-predicting based on edited facts...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Explanation Block */}
        {prediction.explanation && (
          <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Explanation</CardTitle>
              <CardDescription>
                Detailed explanation of the prediction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="markdown-content">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1
                        className="text-2xl font-bold mt-6 mb-4 text-foreground"
                        {...props}
                      />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2
                        className="text-xl font-semibold mt-5 mb-3 text-foreground"
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3
                        className="text-lg font-semibold mt-4 mb-2 text-foreground"
                        {...props}
                      />
                    ),
                    h4: ({ node, ...props }) => (
                      <h4
                        className="text-base font-semibold mt-3 mb-2 text-foreground"
                        {...props}
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p
                        className="mb-4 leading-relaxed text-foreground"
                        {...props}
                      />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong
                        className="font-semibold text-foreground"
                        {...props}
                      />
                    ),
                    em: ({ node, ...props }) => (
                      <em className="italic" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul
                        className="list-disc list-inside mb-4 space-y-2 ml-4"
                        {...props}
                      />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol
                        className="list-decimal list-inside mb-4 space-y-2 ml-4"
                        {...props}
                      />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="text-foreground" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground"
                        {...props}
                      />
                    ),
                    code: ({ node, ...props }) => (
                      <code
                        className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                        {...props}
                      />
                    ),
                    pre: ({ node, ...props }) => (
                      <pre
                        className="bg-muted p-4 rounded-lg overflow-x-auto mb-4"
                        {...props}
                      />
                    ),
                  }}
                >
                  {prediction.explanation}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Similar Cases Cards */}
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Similar Precedents</CardTitle>
                  <CardDescription>
                    {loadingPrecedents 
                      ? "Loading precedents..." 
                      : similarCases 
                        ? `Cases with similar legal reasoning (Showing ${similarCases.similar_cases.length} of ${numPrecedents} requested)`
                        : "Cases with similar legal reasoning"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Slider to control number of precedents */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="precedents-slider" className="text-sm font-medium">
                    Number of Precedents: {numPrecedents}
                  </label>
                </div>
                <input
                  id="precedents-slider"
                  type="range"
                  min="1"
                  max="10"
                  value={numPrecedents}
                  onChange={(e) => {
                    const newValue = Number(e.target.value);
                    setNumPrecedents(newValue);
                    // Automatically update similar cases when slider changes
                    // Only update precedents section, not entire page
                    setLoadingPrecedents(true);
                    const factsForSimilar = prediction.extracted_facts && prediction.extracted_facts.length > 0
                      ? prediction.extracted_facts
                      : undefined;
                    findSimilarCases(
                      inputText,
                      factsForSimilar,
                      newValue
                    )
                      .then((similar) => {
                        setSimilarCases(similar);
                      })
                      .catch((err) => {
                        console.error("Failed to update similar cases:", err);
                      })
                      .finally(() => {
                        setLoadingPrecedents(false);
                      });
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>
              
              {/* Loading indicator for precedents */}
              {loadingPrecedents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <p className="text-sm text-muted-foreground">Loading precedents...</p>
                </div>
              ) : similarCases && similarCases.similar_cases.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {similarCases.similar_cases.map((caseData, idx) => (
                    <PrecedentCard key={idx} case={caseData} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No similar precedents found.</p>
                </div>
              )}
            </CardContent>
          </Card>

        <div className="text-center">
          <Link href="/predict">
            <Button size="lg">Make Another Prediction</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
