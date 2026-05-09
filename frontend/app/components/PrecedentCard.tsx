"use client"

import { useState } from "react"
import { Badge } from "@/app/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog"
import { Button } from "@/app/components/ui/button"
import { SimilarCase } from "@/lib/api"
import { Download, Building2, Calendar, Hash, ChevronRight } from "lucide-react"
import jsPDF from "jspdf"

interface PrecedentCardProps {
  case: SimilarCase
}

export function PrecedentCard({ case: caseData }: PrecedentCardProps) {
  const [open, setOpen] = useState(false)
  const similarityPercent = (caseData.similarity * 100).toFixed(1)
  const isWin = caseData.outcome === "win"
  const legalOutcome = isWin ? "Judgment in Favor of Defendant" : "Judgment Against Defendant"

  const handleDownload = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const maxWidth = pageWidth - 2 * margin
    let y = margin

    const addText = (text: string, size: number, bold = false) => {
      doc.setFontSize(size)
      doc.setFont("helvetica", bold ? "bold" : "normal")
      const lines = doc.splitTextToSize(text, maxWidth)
      lines.forEach((line: string) => {
        if (y + size > pageHeight - margin) { doc.addPage(); y = margin }
        doc.text(line, margin, y)
        y += size * 0.6
      })
      y += size * 0.2
    }

    addText(caseData.case_name, 18, true)
    y += 4
    addText(`Outcome: ${legalOutcome}`, 13, true)
    if (caseData.original_outcome) addText(`Original Outcome: ${caseData.original_outcome}`, 11)
    y += 4

    addText("Case Information", 12, true)
    const meta: [string, string][] = [
      ["Similarity:", `${similarityPercent}%`],
      ["Court:", caseData.court ?? "N/A"],
      ["Date Filed:", caseData.date_filed ?? "N/A"],
      ["Docket ID:", caseData.docket_id ?? "N/A"],
    ]
    doc.setFontSize(10)
    meta.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold"); doc.text(label, margin, y)
      doc.setFont("helvetica", "normal"); doc.text(value, margin + 40, y)
      y += 7
    })
    y += 4

    addText("Full Case Text", 12, true)
    doc.setFontSize(10); doc.setFont("helvetica", "normal")
    doc.splitTextToSize(caseData.full_text, maxWidth).forEach((line: string) => {
      if (y + 6 > pageHeight - margin) { doc.addPage(); y = margin }
      doc.text(line, margin, y); y += 6
    })

    doc.save(`${caseData.case_name.replace(/[^a-z0-9]/gi, "_")}_case.pdf`)
  }

  return (
    <>
      {/* ── Card ──────────────────────────────────────────────────── */}
      <div
        className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
        onClick={() => setOpen(true)}
      >
        {/* Top color band */}
        <div className={`h-1.5 w-full ${isWin ? "bg-emerald-500" : "bg-rose-500"}`} />

        <div className="p-5 space-y-4">
          {/* Case name + outcome badge */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 flex-1">
              {caseData.case_name}
            </h3>
            <Badge
              variant={isWin ? "default" : "destructive"}
              className="shrink-0 text-xs"
            >
              {isWin ? "WIN" : "LOSE"}
            </Badge>
          </div>

          {/* Original outcome label (shown only if present) */}
          {caseData.original_outcome && (
            <Badge variant="outline" className="text-xs font-normal">
              {caseData.original_outcome}
            </Badge>
          )}

          {/* Snippet */}
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
            {caseData.snippet}
          </p>

          {/* Similarity bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Similarity</span>
              <span className="font-semibold text-slate-700">{similarityPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${isWin ? "bg-emerald-400" : "bg-rose-400"}`}
                style={{ width: `${similarityPercent}%` }}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              {caseData.court && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {caseData.court}
                </span>
              )}
              {caseData.date_filed && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {caseData.date_filed.slice(0, 4)}
                </span>
              )}
            </div>
            <span className="text-xs text-primary flex items-center gap-0.5 group-hover:underline">
              View details <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>

      {/* ── Detail dialog ─────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl leading-snug">{caseData.case_name}</DialogTitle>
                {caseData.original_outcome && (
                  <Badge variant="outline" className="mt-2 text-xs font-normal">
                    {caseData.original_outcome}
                  </Badge>
                )}
              </div>
              <Badge
                variant={isWin ? "default" : "destructive"}
                className="shrink-0 text-sm px-3 py-1"
              >
                {legalOutcome}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Metadata grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Similarity", value: `${similarityPercent}%`, icon: null },
                { label: "Court", value: caseData.court ?? "N/A", icon: Building2 },
                { label: "Date Filed", value: caseData.date_filed ?? "N/A", icon: Calendar },
                { label: "Docket ID", value: caseData.docket_id ?? "N/A", icon: Hash },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                    {Icon && <Icon className="h-3 w-3" />}
                    {label}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* Full text */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Full Case Text</p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 max-h-80 overflow-y-auto">
                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {caseData.full_text}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
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
