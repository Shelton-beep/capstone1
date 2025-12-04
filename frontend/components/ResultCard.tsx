"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PredictionResponse } from "@/lib/api"

interface ResultCardProps {
  result: PredictionResponse
}

export function ResultCard({ result }: ResultCardProps) {
  const isWin = result.prediction === "win"
  const confidencePercent = (result.confidence * 100).toFixed(1)

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Prediction Result</CardTitle>
        <CardDescription>Legal case outcome prediction</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-1">Predicted Outcome</div>
            <div className="flex items-center gap-2">
              <Badge
                variant={isWin ? "default" : "destructive"}
                className="text-lg px-4 py-2"
              >
                {result.prediction.toUpperCase()}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {confidencePercent}% confidence
              </span>
            </div>
          </div>
        </div>
        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground mb-2">Confidence Score</div>
          <div className="w-full bg-secondary rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${
                isWin ? "bg-primary" : "bg-destructive"
              }`}
              style={{ width: `${result.confidence * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

