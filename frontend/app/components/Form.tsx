"use client"

import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import { Textarea } from "@/app/components/ui/textarea"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { predictCase } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Scale, ChevronRight, Loader2 } from "lucide-react"

const STEP_LABELS: Record<string, string> = {
  validation: "Validating input",
  extracting_facts: "Extracting case facts",
  generating_embeddings: "Analyzing case text",
  predicting: "Running prediction",
  calculating_probabilities: "Calculating probabilities",
  extracting_features: "Extracting features",
  calculating_likelihoods: "Calculating outcome likelihoods",
  determining_judgment: "Determining legal judgment",
  generating_explanation: "Generating explanation",
}

const STEP_PROGRESS: Record<string, number> = {
  validation: 10,
  extracting_facts: 25,
  generating_embeddings: 40,
  predicting: 55,
  calculating_probabilities: 65,
  extracting_features: 75,
  calculating_likelihoods: 85,
  determining_judgment: 90,
  generating_explanation: 95,
}

export function Form() {
  const [text, setText] = useState("")
  const [court, setCourt] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [natureOfSuit, setNatureOfSuit] = useState("")
  const [year, setYear] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressMsg, setProgressMsg] = useState<string>("")
  const [progressStep, setProgressStep] = useState<string>("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setProgressMsg("")
    setProgressStep("")

    try {
      const result = await predictCase(
        text,
        court || undefined,
        jurisdiction || undefined,
        natureOfSuit || undefined,
        year ? parseInt(year) : undefined,
        undefined,
        (update) => {
          if (update.type === "progress") {
            setProgressMsg(update.message || "")
            setProgressStep(update.step || "")
          }
        }
      )
      sessionStorage.setItem("predictionResult", JSON.stringify(result))
      sessionStorage.setItem("inputText", text)
      sessionStorage.setItem(
        "originalInputs",
        JSON.stringify({
          court: court || undefined,
          jurisdiction: jurisdiction || undefined,
          nature_of_suit: natureOfSuit || undefined,
          year: year ? parseInt(year) : undefined,
        })
      )
      router.push("/predict/result")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred"
      setError(msg)
      setProgressMsg("")
      setProgressStep("")
      setTimeout(() => {
        document.getElementById("error-message")?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
    } finally {
      setLoading(false)
    }
  }

  const progressPercent = STEP_PROGRESS[progressStep] ?? 0

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Predict Appeal Outcome</h1>
          <p className="text-sm text-slate-500">
            Analysis from the defendant/appellant's perspective
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Legal Text */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <Label htmlFor="text" className="text-base font-semibold text-slate-800">
            Legal Opinion Text
            <span className="ml-1.5 text-rose-500">*</span>
          </Label>
          <Textarea
            id="text"
            placeholder="Paste the full legal opinion or case narrative here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            required
            className="font-mono text-sm resize-none bg-slate-50 focus:bg-white transition-colors"
          />
          <p className="text-xs text-slate-400">
            Minimum 100 characters. The system will read your case, extract key facts, and predict the appeal outcome.
          </p>
        </div>

        {/* Optional metadata */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <p className="text-base font-semibold text-slate-800">Case Details</p>
            <p className="text-xs text-slate-400 mt-0.5">Optional — helps tailor the outcome language to your case type</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="court" className="text-sm font-medium text-slate-700">Court</Label>
              <Input
                id="court"
                placeholder="scotus, ca9, ca2 …"
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                className="bg-slate-50 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jurisdiction" className="text-sm font-medium text-slate-700">Jurisdiction</Label>
              <Input
                id="jurisdiction"
                placeholder="federal, state …"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="bg-slate-50 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nature_of_suit" className="text-sm font-medium text-slate-700">Nature of Suit</Label>
              <Input
                id="nature_of_suit"
                placeholder="criminal, civil rights, contract …"
                value={natureOfSuit}
                onChange={(e) => setNatureOfSuit(e.target.value)}
                className="bg-slate-50 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="year" className="text-sm font-medium text-slate-700">Year</Label>
              <Input
                id="year"
                type="number"
                placeholder="2024"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min="1900"
                max="2100"
                className="bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            id="error-message"
            className="flex items-start gap-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 p-4 rounded-xl"
          >
            <span className="font-semibold shrink-0">Error:</span>
            <span>{error}</span>
          </div>
        )}

        {/* Progress */}
        {loading && progressMsg && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {STEP_LABELS[progressStep] ?? progressMsg}
                </p>
              </div>
              <span className="text-xs text-slate-400 shrink-0">{progressPercent}%</span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !text.trim()}
          className="w-full h-12 text-base font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              Predict Outcome
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
