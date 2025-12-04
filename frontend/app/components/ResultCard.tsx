"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { PredictionResponse } from "@/lib/api"

interface ResultCardProps {
  result: PredictionResponse
}

export function ResultCard({ result }: ResultCardProps) {
  const isWin = result.prediction === "win"
  const probabilityPercent = (result.probability * 100).toFixed(1)
  const confidencePercent = (result.confidence * 100).toFixed(1)
  const legalJudgment = result.legal_judgment || (isWin ? "Judgment in Favor of Defendant" : "Judgment in Favor of Plaintiff")

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Prediction Result</CardTitle>
        <CardDescription>Appeal outcome prediction from defendant/appellant's perspective</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Legal Judgment Badge */}
        <div className="flex flex-col items-center justify-center gap-2">
          <Badge
            variant={isWin ? "default" : "destructive"}
            className="text-xl px-6 py-3 font-bold text-center"
          >
            {legalJudgment}
          </Badge>
          <p className="text-xs text-muted-foreground text-center">
            From defendant/appellant's perspective
          </p>
        </div>

        {/* Probability Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Probability</span>
            <span className="font-medium">{probabilityPercent}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${
                isWin ? "bg-primary" : "bg-destructive"
              }`}
              style={{ width: `${result.probability * 100}%` }}
            />
          </div>
        </div>

        {/* Confidence */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Model Confidence</span>
            <span className="text-sm font-medium">{confidencePercent}%</span>
          </div>
        </div>

        {/* Outcome Likelihoods */}
        {result.outcome_likelihoods && (
          <div className="pt-4 border-t space-y-3">
            <div className="text-sm font-medium text-muted-foreground">
              Likelihood of Specific Outcomes
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {isWin ? (
                <>
                  {result.outcome_likelihoods.reversed !== undefined && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span className="text-sm">Reversed</span>
                      <span className="text-sm font-semibold">
                        {result.outcome_likelihoods.reversed}%
                      </span>
                    </div>
                  )}
                  {result.outcome_likelihoods.granted !== undefined && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span className="text-sm">Granted</span>
                      <span className="text-sm font-semibold">
                        {result.outcome_likelihoods.granted}%
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {result.outcome_likelihoods.denied !== undefined && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span className="text-sm">Denied</span>
                      <span className="text-sm font-semibold">
                        {result.outcome_likelihoods.denied}%
                      </span>
                    </div>
                  )}
                  {result.outcome_likelihoods.affirmed !== undefined && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span className="text-sm">Affirmed</span>
                      <span className="text-sm font-semibold">
                        {result.outcome_likelihoods.affirmed}%
                      </span>
                    </div>
                  )}
                  {result.outcome_likelihoods.dismissed !== undefined && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span className="text-sm">Dismissed</span>
                      <span className="text-sm font-semibold">
                        {result.outcome_likelihoods.dismissed}%
                      </span>
                    </div>
                  )}
                  {result.outcome_likelihoods.remanded !== undefined && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <span className="text-sm">Remanded</span>
                      <span className="text-sm font-semibold">
                        {result.outcome_likelihoods.remanded}%
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on historical distribution of similar cases in the training data
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
