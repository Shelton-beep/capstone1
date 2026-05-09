"use client"

import { Card, CardContent } from "@/app/components/ui/card"
import { PredictionResponse } from "@/lib/api"
import { CheckCircle2, XCircle } from "lucide-react"

interface ResultCardProps {
  result: PredictionResponse
}

export function ResultCard({ result }: ResultCardProps) {
  const isWin = result.prediction === "win"
  const probabilityPercent = (result.probability * 100).toFixed(1)
  const confidencePercent = (result.confidence * 100).toFixed(1)
  const legalJudgment =
    result.legal_judgment ||
    (isWin ? "Judgment in Favor of Defendant" : "Judgment in Favor of Plaintiff")

  return (
    <Card className="w-full max-w-4xl mx-auto overflow-hidden shadow-md">
      {/* ── Verdict banner ────────────────────────────────────────── */}
      <div
        className={`px-8 py-10 text-white text-center ${
          isWin
            ? "bg-gradient-to-r from-emerald-600 to-emerald-500"
            : "bg-gradient-to-r from-rose-600 to-rose-500"
        }`}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          {isWin ? (
            <CheckCircle2 className="h-8 w-8 opacity-90" />
          ) : (
            <XCircle className="h-8 w-8 opacity-90" />
          )}
          <span className="text-2xl font-bold">{legalJudgment}</span>
        </div>
        <p className="text-sm opacity-75 mt-1">From the defendant/appellant's perspective</p>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* ── Probability bar ───────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-slate-600">Probability of this outcome</span>
            <span className={isWin ? "text-emerald-600" : "text-rose-600"}>
              {probabilityPercent}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isWin
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  : "bg-gradient-to-r from-rose-500 to-rose-400"
              }`}
              style={{ width: `${result.probability * 100}%` }}
            />
          </div>
        </div>

        {/* ── Confidence ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between py-3 border-t border-slate-100">
          <span className="text-sm text-slate-500">Prediction confidence</span>
          <span
            className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
              parseFloat(confidencePercent) >= 70
                ? "bg-emerald-50 text-emerald-700"
                : parseFloat(confidencePercent) >= 50
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {confidencePercent}%
          </span>
        </div>

        {/* ── Outcome likelihoods ────────────────────────────────────── */}
        {result.outcome_likelihoods && (
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-700">Likelihood of specific outcomes</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {isWin ? (
                <>
                  {result.outcome_likelihoods.reversed !== undefined && (
                    <OutcomePill label="Reversed" value={result.outcome_likelihoods.reversed} color="emerald" />
                  )}
                  {result.outcome_likelihoods.granted !== undefined && (
                    <OutcomePill label="Granted" value={result.outcome_likelihoods.granted} color="emerald" />
                  )}
                </>
              ) : (
                <>
                  {result.outcome_likelihoods.affirmed !== undefined && (
                    <OutcomePill label="Affirmed" value={result.outcome_likelihoods.affirmed} color="rose" />
                  )}
                  {result.outcome_likelihoods.denied !== undefined && (
                    <OutcomePill label="Denied" value={result.outcome_likelihoods.denied} color="rose" />
                  )}
                  {result.outcome_likelihoods.dismissed !== undefined && (
                    <OutcomePill label="Dismissed" value={result.outcome_likelihoods.dismissed} color="rose" />
                  )}
                  {result.outcome_likelihoods.remanded !== undefined && (
                    <OutcomePill label="Remanded" value={result.outcome_likelihoods.remanded} color="slate" />
                  )}
                </>
              )}
            </div>

            <p className="text-xs text-slate-400">
              Based on the outcomes of similar historical cases
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function OutcomePill({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: "emerald" | "rose" | "slate"
}) {
  const bg =
    color === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : color === "rose"
      ? "bg-rose-50 text-rose-700"
      : "bg-slate-100 text-slate-600"

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm ${bg}`}>
      <span className="font-medium">{label}</span>
      <span className="font-bold">{value}%</span>
    </div>
  )
}
