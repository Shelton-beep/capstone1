"use client"

import { Form } from "@/app/components/Form"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function PredictPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <Form />
      </div>
    </div>
  )
}

