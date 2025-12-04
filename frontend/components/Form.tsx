"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { predictCase } from "@/lib/api"
import { useRouter } from "next/navigation"

export function Form() {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await predictCase(text)
      // Store result in sessionStorage for result page
      sessionStorage.setItem("predictionResult", JSON.stringify(result))
      sessionStorage.setItem("inputText", text)
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
        <CardTitle>Legal Case Outcome Prediction</CardTitle>
        <CardDescription>
          Enter the legal opinion text to predict the case outcome
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">Legal Opinion Text</Label>
            <Textarea
              id="text"
              placeholder="Enter the full legal opinion text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              required
              className="font-mono text-sm"
            />
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading || !text.trim()}>
            {loading ? "Predicting..." : "Predict Outcome"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

