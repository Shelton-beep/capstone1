"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SimilarCase } from "@/lib/api"

interface PrecedentCardProps {
  case: SimilarCase
  showReasoning?: boolean
}

export function PrecedentCard({ case: caseData, showReasoning = false }: PrecedentCardProps) {
  const similarityPercent = (caseData.similarity * 100).toFixed(1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{caseData.case_name}</CardTitle>
        <CardDescription>{caseData.court || "N/A"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Outcome: {caseData.outcome}</Badge>
          <Badge variant="secondary">Similarity: {similarityPercent}%</Badge>
        </div>
        <div>
          <div className="text-sm font-medium mb-1">Relevant Excerpt</div>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {caseData.snippet || "No excerpt available"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

