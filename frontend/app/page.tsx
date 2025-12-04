import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Defendant/Appellant Appeal Outcome Prediction
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Predict appeal case outcomes from the defendant/appellant's perspective using advanced AI and machine learning
            models powered by LegalBERT embeddings
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto mt-2">
            Predicts whether judgment will be in favor of the defendant/appellant or against them (in favor of plaintiff/government)
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Predict Appeal Outcomes</CardTitle>
              <CardDescription>
                Get AI-powered predictions for appeal case outcomes from defendant/appellant's perspective
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Enter legal opinion text and receive instant predictions showing whether judgment will be in favor of the defendant/appellant or against them, with confidence scores
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Find Precedents</CardTitle>
              <CardDescription>
                Discover similar appeal cases using cosine similarity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Search through our database to find legally similar appeal cases with their original outcomes (reversed, granted, affirmed, etc.)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>RAG Explanations</CardTitle>
              <CardDescription>
                Understand predictions with detailed explanations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Get comprehensive explanations for predictions backed by similar
                cases
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Link href="/predict">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
