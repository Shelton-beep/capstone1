"use client"

import { Form } from "@/app/components/Form"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function PredictPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Slim top nav */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <Form />
      </div>
    </div>
  )
}
