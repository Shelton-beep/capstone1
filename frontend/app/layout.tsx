import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ReactNode } from "react"
import "@/styles/globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Legal Outcome Prediction System",
  description: "Predict legal case outcomes using AI and machine learning",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

