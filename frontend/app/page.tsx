"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/app/components/ui/button"
import {
  Scale,
  Brain,
  Search,
  FileText,
  Shield,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react"

/* ─── data ────────────────────────────────────────────────────── */
const features = [
  {
    icon: Brain,
    title: "Outcome Prediction",
    description:
      "Enter your case details and get an instant prediction on whether the appeal is likely to succeed, with a confidence score.",
    color: "text-blue-600 bg-blue-50",
    image: "https://images.unsplash.com/photo-1655720828018-edd2daec9349?w=640&q=80",
  },
  {
    icon: Search,
    title: "Hybrid Precedent Search",
    description:
      "Automatically surfaces the most relevant historical cases to support your appeal argument.",
    color: "text-violet-600 bg-violet-50",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=640&q=80",
  },
  {
    icon: FileText,
    title: "Brief Generation",
    description:
      "Generates a professionally structured appellate brief based on your case facts and supporting precedents.",
    color: "text-emerald-600 bg-emerald-50",
    image: "https://images.unsplash.com/photo-1568219557405-376e23e4f7cf?w=640&q=80",
  },
  {
    icon: Shield,
    title: "Outcome Simulation",
    description:
      "Re-run the prediction using your generated brief to measure how it changes the defendant's odds.",
    color: "text-amber-600 bg-amber-50",
    image: "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=640&q=80",
  },
]

const steps = [
  { step: "01", title: "Submit Case Text", desc: "Paste the legal opinion or narrative." },
  { step: "02", title: "AI Analysis", desc: "The system reads your case, extracts key facts, and runs the prediction." },
  { step: "03", title: "Prediction & Brief", desc: "Get outcome, precedents, and a full brief." },
]

/* ─── mock verdict card ───────────────────────────────────────── */
function MockVerdictCard() {
  return (
    <div className="w-72 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
        <span className="text-white font-semibold text-sm leading-tight">
          Judgment in Favor of Defendant
        </span>
      </div>
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-xs text-white/70">
          <span>Win probability</span>
          <span className="text-emerald-300 font-bold">78.4%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 animate-progress-grow" />
        </div>
      </div>
      <p className="text-xs text-white/50 uppercase tracking-wider mb-2 font-medium">
        Extracted Facts
      </p>
      <div className="space-y-1.5">
        {[
          "Fourth Amendment violation alleged",
          "Warrantless search conducted",
          "Motion to suppress denied at trial",
        ].map((fact) => (
          <div key={fact} className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-blue-300 mt-1.5 shrink-0" />
            <span className="text-xs text-white/65 leading-relaxed">{fact}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
        <span className="text-xs text-white/50">Prediction confidence</span>
        <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
          87.2%
        </span>
      </div>
    </div>
  )
}

function MockNotification() {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl w-56">
      <div className="w-8 h-8 rounded-full bg-violet-500/30 flex items-center justify-center shrink-0">
        <Search className="h-3.5 w-3.5 text-violet-300" />
      </div>
      <div>
        <p className="text-xs font-semibold text-white">5 precedents found</p>
                <p className="text-xs text-white/50">Similar cases found</p>
      </div>
    </div>
  )
}

/* ─── page ────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden">

      {/* ══ HERO ═══════════════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center bg-slate-950 overflow-hidden">

        {/* Courthouse background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1920&q=80)",
          }}
        />

        {/* Gradient depth layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/90 to-blue-950/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative container mx-auto px-4 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: text */}
            <div className="text-white space-y-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 bg-white/8 border border-white/15 rounded-full px-4 py-1.5 text-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-300" />
                <span className="text-white/80">AI-Powered Legal Analysis</span>
              </motion.div>

              <div className="space-y-2">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: "easeOut", delay: 0.2 }}
                  className="flex items-center gap-3"
                >
                  <Scale className="h-9 w-9 text-blue-400 shrink-0" />
                  <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-none">
                    Appeal Outcome
                  </h1>
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: "easeOut", delay: 0.3 }}
                  className="text-5xl lg:text-6xl font-bold tracking-tight leading-none bg-gradient-to-r from-blue-300 via-blue-200 to-white bg-clip-text text-transparent"
                >
                  Predictor
                </motion.h1>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
                className="text-lg text-slate-300 max-w-lg leading-relaxed"
              >
                AI-powered prediction of appeal case outcomes from the{" "}
                <span className="text-white font-medium">defendant/appellant's perspective</span>{" "}
                — with precedent discovery and brief generation.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
              >
                <Link href="/predict">
                  <Button
                    size="lg"
                    className="bg-blue-500 hover:bg-blue-400 text-white h-12 px-8 text-base shadow-lg shadow-blue-900/40 group"
                  >
                    Analyze Your Case
                    <ChevronRight className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
                className="flex items-center gap-8 pt-2 border-t border-white/10"
              >
                {[
                  { value: "6", label: "Verdict types" },
                  { value: "Instant", label: "Predictions" },
                  { value: "AI", label: "Brief drafting" },
                ].map(({ value, label }) => (
                  <div key={label}>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: floating mock UI */}
            <div className="hidden lg:flex items-center justify-center relative h-96">
              <motion.div
                initial={{ opacity: 0, x: 48 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.75, ease: "easeOut", delay: 0.45 }}
                className="animate-float absolute left-12 top-4"
              >
                <MockVerdictCard />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.7 }}
                className="animate-float-slow absolute right-0 bottom-12"
              >
                <MockNotification />
              </motion.div>

              {/* Glow */}
              <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
                <div className="w-72 h-72 rounded-full bg-blue-600/20 blur-3xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════ */}
      <section className="bg-slate-50 border-y border-slate-100 py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-2">
              Workflow
            </p>
            <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
          </motion.div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-3xl mx-auto">
            {steps.map(({ step, title, desc }, i) => (
              <div key={step} className="flex items-center gap-4 flex-1">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  viewport={{ once: true }}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1 text-center"
                >
                  <span className="text-xs font-bold text-blue-500 tracking-widest">{step}</span>
                  <h3 className="font-semibold text-slate-900 mt-1">{title}</h3>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{desc}</p>
                </motion.div>
                {i < steps.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-slate-300 shrink-0 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ═══════════════════════════════════════════════ */}
      <section className="py-24 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-2">
            Capabilities
          </p>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Full legal intelligence pipeline
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            From raw case text to a publishable appellate brief — in one workflow.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map(({ icon: Icon, title, description, color, image }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
            >
              {/* Image header */}
              <div className="relative h-36 overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-white" />
                <div className="absolute bottom-3 left-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-14"
        >
          <Link href="/predict">
            <Button size="lg" className="px-10 h-12 text-base group">
              Get Started
              <ChevronRight className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* ══ DISCLAIMER ═════════════════════════════════════════════ */}
      <footer className="bg-slate-50 border-t border-slate-100 mt-auto">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-xs text-slate-400 max-w-2xl mx-auto">
            This system predicts outcomes for{" "}
            <strong>appealed cases</strong> using historical data. Predictions are statistical
            estimates and do not constitute legal advice. For educational and research purposes only.
          </p>
        </div>
      </footer>
    </div>
  )
}
