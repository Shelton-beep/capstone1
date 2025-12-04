"use client"

import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import { Textarea } from "@/app/components/ui/textarea"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { predictCase } from "@/lib/api"
import { useRouter } from "next/navigation"

export function Form() {
  const [text, setText] = useState("")
  const [court, setCourt] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [natureOfSuit, setNatureOfSuit] = useState("")
  const [year, setYear] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await predictCase(
        text,
        court || undefined,
        jurisdiction || undefined,
        natureOfSuit || undefined,
        year ? parseInt(year) : undefined
      )
      // Store result and original inputs in sessionStorage for result page
      sessionStorage.setItem("predictionResult", JSON.stringify(result))
      sessionStorage.setItem("inputText", text)
      sessionStorage.setItem("originalInputs", JSON.stringify({
        court: court || undefined,
        jurisdiction: jurisdiction || undefined,
        nature_of_suit: natureOfSuit || undefined,
        year: year ? parseInt(year) : undefined
      }))
      router.push("/predict/result")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Defendant/Appellant Appeal Outcome Prediction</CardTitle>
        <CardDescription>
          Enter the legal opinion text and case details to predict the appeal outcome from the defendant/appellant's perspective
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="text">Legal Opinion Text (Narrative)</Label>
            <Textarea
              id="text"
              placeholder="Enter the full legal opinion text for the appeal case here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This system predicts appeal outcomes from the <strong>defendant/appellant's perspective</strong>. The prediction will show whether judgment will be in favor of the defendant/appellant or against them (in favor of plaintiff/government).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="court">Court</Label>
              <Input
                id="court"
                type="text"
                placeholder="e.g., scotus, ca9, ca2"
                value={court}
                onChange={(e) => setCourt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Input
                id="jurisdiction"
                type="text"
                placeholder="e.g., federal, state"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nature_of_suit">Nature of Suit</Label>
              <Input
                id="nature_of_suit"
                type="text"
                placeholder="e.g., contract, tort, civil rights, employment, criminal, family law, property, personal injury, etc."
                value={natureOfSuit}
                onChange={(e) => setNatureOfSuit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter any nature of suit (contract, tort, civil rights, employment, criminal, family law, property, personal injury, breach of contract, etc.). The system will intelligently infer the appropriate legal judgment language.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                placeholder="e.g., 2024"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min="1900"
                max="2100"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading || !text.trim()} className="w-full">
            {loading ? "Predicting..." : "Predict Outcome"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
