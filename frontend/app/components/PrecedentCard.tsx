"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog"
import { Button } from "@/app/components/ui/button"
import { SimilarCase } from "@/lib/api"
import { Download } from "lucide-react"
import jsPDF from "jspdf"

interface PrecedentCardProps {
  case: SimilarCase
}

export function PrecedentCard({ case: caseData }: PrecedentCardProps) {
  const [open, setOpen] = useState(false)
  const similarityPercent = (caseData.similarity * 100).toFixed(1)
  const isWin = caseData.outcome === "win"
  // Convert win/lose to legal judgment language for display
  const legalOutcome = isWin ? "Judgment in Favor of Defendant" : "Judgment Against Defendant"

  const handleDownload = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const maxWidth = pageWidth - 2 * margin
    let yPosition = margin

    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, fontSize: number, isBold: boolean = false) => {
      doc.setFontSize(fontSize)
      if (isBold) {
        doc.setFont(undefined, "bold")
      } else {
        doc.setFont(undefined, "normal")
      }
      
      const lines = doc.splitTextToSize(text, maxWidth)
      
      lines.forEach((line: string) => {
        if (yPosition + fontSize > pageHeight - margin) {
          doc.addPage()
          yPosition = margin
        }
        doc.text(line, margin, yPosition)
        yPosition += fontSize * 0.6
      })
      
      yPosition += fontSize * 0.2 // Add spacing after text
    }

    // Title
    addWrappedText(caseData.case_name, 18, true)
    yPosition += 5

    // Outcome badges
    addWrappedText(`Outcome: ${legalOutcome}`, 14, true)
    if (caseData.original_outcome) {
      addWrappedText(`Original Outcome: ${caseData.original_outcome}`, 12, false)
    }
    yPosition += 5

    // Metadata section
    doc.setFontSize(12)
    doc.setFont(undefined, "bold")
    doc.text("Case Information", margin, yPosition)
    yPosition += 8

    doc.setFont(undefined, "normal")
    doc.setFontSize(10)
    
    const metadata = [
      [`Similarity:`, `${similarityPercent}%`],
      [`Court:`, caseData.court || "N/A"],
      [`Date Filed:`, caseData.date_filed || "N/A"],
      [`Docket ID:`, caseData.docket_id || "N/A"],
    ]

    metadata.forEach(([label, value]) => {
      doc.setFont(undefined, "bold")
      doc.text(label, margin, yPosition)
      doc.setFont(undefined, "normal")
      doc.text(value, margin + 40, yPosition)
      yPosition += 7
    })

    yPosition += 5

    // Full Text section
    doc.setFontSize(12)
    doc.setFont(undefined, "bold")
    doc.text("Full Case Text", margin, yPosition)
    yPosition += 8

    // Add full text with proper wrapping
    doc.setFontSize(10)
    doc.setFont(undefined, "normal")
    const fullTextLines = doc.splitTextToSize(caseData.full_text, maxWidth)
    
    fullTextLines.forEach((line: string) => {
      if (yPosition + 6 > pageHeight - margin) {
        doc.addPage()
        yPosition = margin
      }
      doc.text(line, margin, yPosition)
      yPosition += 6
    })

    // Save PDF
    const fileName = `${caseData.case_name.replace(/[^a-z0-9]/gi, "_")}_case.pdf`
    doc.save(fileName)
  }

  return (
    <>
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setOpen(true)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{caseData.case_name}</CardTitle>
              <CardDescription className="mt-1">
                Similarity: {similarityPercent}%
              </CardDescription>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <div className="flex flex-col gap-1 items-end">
                <Badge
                  variant={isWin ? "default" : "destructive"}
                  className="ml-2"
                >
                  {legalOutcome}
                </Badge>
                {caseData.original_outcome && (
                  <Badge variant="outline" className="text-xs">
                    {caseData.original_outcome}
                  </Badge>
                )}
              </div>
              {caseData.original_outcome && (
                <Badge variant="outline" className="text-xs">
                  {caseData.original_outcome}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <div className="text-sm font-medium mb-1">Snippet</div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {caseData.snippet}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Badge variant="secondary">{similarityPercent}% match</Badge>
              <span className="text-xs text-muted-foreground">Click to view full details</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl">{caseData.case_name}</DialogTitle>
                <DialogDescription className="mt-2">
                  Full case details and text
                </DialogDescription>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Badge
                  variant={isWin ? "default" : "destructive"}
                  className="text-lg px-4 py-2"
                >
                  {legalOutcome}
                </Badge>
                {caseData.original_outcome && (
                  <Badge variant="outline" className="text-sm">
                    {caseData.original_outcome}
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Case Metadata */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Similarity</div>
                <div className="text-lg font-semibold">{similarityPercent}%</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Outcome</div>
                <div className="text-lg font-semibold">{legalOutcome}</div>
                {caseData.original_outcome && (
                  <div className="text-sm text-muted-foreground mt-1">
                    ({caseData.original_outcome})
                  </div>
                )}
              </div>
              {caseData.court && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Court</div>
                  <div className="text-lg font-semibold">{caseData.court}</div>
                </div>
              )}
              {caseData.date_filed && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Date Filed</div>
                  <div className="text-lg font-semibold">{caseData.date_filed}</div>
                </div>
              )}
              {caseData.docket_id && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Docket ID</div>
                  <div className="text-lg font-semibold">{caseData.docket_id}</div>
                </div>
              )}
            </div>

            {/* Full Text */}
            <div>
              <div className="text-sm font-medium mb-2">Full Case Text</div>
              <div className="p-4 bg-muted rounded-lg max-h-[400px] overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {caseData.full_text}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Case
            </Button>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
