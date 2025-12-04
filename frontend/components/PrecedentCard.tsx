"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SimilarCase, RAGExplanation } from "@/lib/api"

interface PrecedentCardProps {
  case: SimilarCase | RAGExplanation
  showReasoning?: boolean
}

export function PrecedentCard({ case: caseData, showReasoning = false }: PrecedentCardProps) {
  const similarity = "similarity" in caseData ? caseData.similarity : 0
  const similarityPercent = (similarity * 100).toFixed(1)
  const reasoning = "reasoning" in caseData ? caseData.reasoning : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{caseData.case_name}</CardTitle>
        <CardDescription>{caseData.court}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Outcome: {caseData.outcome}</Badge>
          <Badge variant="secondary">Similarity: {similarityPercent}%</Badge>
        </div>
        <div>
          <div className="text-sm font-medium mb-1">Relevant Excerpt</div>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {("relevant_excerpt" in caseData ? caseData.relevant_excerpt : caseData.opinion_text) || "No excerpt available"}
          </p>
        </div>
        {showReasoning && reasoning && (
          <div>
            <div className="text-sm font-medium mb-1">Reasoning</div>
            <p className="text-sm text-muted-foreground">{reasoning}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

