import Link from "next/link"
import { ArrowRight, BookOpen, CheckCircle, Ear, Eye, Users } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <main id="main-content" className="flex flex-col min-h-screen">
      
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 md:py-32 bg-primary/5">
        <div className="max-w-4xl space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
            Learn. Practice. Compete. <span className="text-primary block mt-2">Independently.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            EXAMSARTHI is the accessibility-first examination and practice platform designed to empower visually impaired candidates.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md" render={<Link href="/practice" />}>
              Start Practicing <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md" render={<Link href="/exam" />}>
              Explore Exams
            </Button>
          </div>
        </div>
      </section>

      {/* Accessibility Value Proposition */}
      <section className="py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Built for Accessibility First</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We don&apos;t just comply with standards; we build with them at our core so you can focus on your exams without barriers.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-card border text-card-foreground shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full text-primary">
              <Ear className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">Screen-Reader Ready</h3>
            <p className="text-muted-foreground">
              Every element is semantically structured and optimized for screen readers.
            </p>
          </div>
          
          <div className="p-8 rounded-2xl bg-card border text-card-foreground shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full text-primary">
              <Eye className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">High Contrast Modes</h3>
            <p className="text-muted-foreground">
              Dynamically adjust themes and contrast levels to suit your visual needs.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border text-card-foreground shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full text-primary">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">Keyboard Navigable</h3>
            <p className="text-muted-foreground">
              Navigate seamlessly using only your keyboard with clear focus indicators.
            </p>
          </div>
        </div>
      </section>

      {/* How EXAMSARTHI Works & Capabilities */}
      <section className="py-24 bg-muted/50 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold">Seamless Examination Experience</h2>
            <p className="text-lg text-muted-foreground">
              Prepare for competitive exams in an environment that respects your independence. From practice tests to real examination simulations, EXAMSARTHI is tailored for you.
            </p>
            <ul className="space-y-4">
              {[
                "Voice assistance ready for exam navigation",
                "Scalable text that won't break layout",
                "Fully adaptable to Light, Dark, and High Contrast",
                "Multi-lingual support starting with English and Hindi"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                  <span className="text-lg">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-background rounded-3xl p-8 border shadow-lg aspect-square flex flex-col justify-center items-center text-center space-y-6">
             <Users className="h-24 w-24 text-primary/20" />
             <div className="space-y-2">
               <h3 className="text-2xl font-bold">Join the Community</h3>
               <p className="text-muted-foreground">Thousands of candidates are already preparing independently.</p>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t text-center px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-bold text-xl text-primary">EXAMSARTHI</span>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} EXAMSARTHI. Built for everyone.
          </p>
        </div>
      </footer>
      
    </main>
  )
}
