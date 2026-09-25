import Link from "next/link"
import { ArrowRight, BookOpen, CheckCircle, Ear, Eye, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BentoFeatureSection } from "@/components/marketing/BentoFeatureSection"
import { AnimatedSection, AnimatedStagger, AnimatedStaggerItem } from "@/components/marketing/AnimatedSection"

export default function LandingPage() {
  return (
    <main id="main-content" className="flex flex-col min-h-screen">
      
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 md:py-32 bg-primary/5 relative overflow-hidden">
        {/* Subtle glassmorphism/gradient effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-secondary/10 rounded-full blur-3xl opacity-50 pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

        <AnimatedSection className="max-w-4xl space-y-8 relative z-10" delay={0.1}>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
            Learn. Practice. Compete. <span className="text-primary block mt-2 bg-clip-text bg-gradient-to-r from-primary to-primary/80">Independently.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            EXAMSARTHI is the accessibility-first examination and practice platform designed to empower visually impaired candidates.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl shadow-lg hover:shadow-xl transition-shadow" render={<Link href="/practice" />} nativeButton={false}>
              Start Practicing <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl backdrop-blur-sm bg-background/50 hover:bg-background/80" render={<Link href="/exam" />} nativeButton={false}>
              Explore Exams
            </Button>
          </div>
        </AnimatedSection>
      </section>

      {/* Accessibility Value Proposition */}
      <section className="py-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10">
        <AnimatedSection className="text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">Built for Accessibility First</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We don&apos;t just comply with standards; we build with them at our core so you can focus on your exams without barriers.
          </p>
        </AnimatedSection>
        
        <AnimatedStagger className="grid md:grid-cols-3 gap-8">
          <AnimatedStaggerItem className="p-8 rounded-3xl bg-card/60 backdrop-blur-md border border-white/10 dark:border-white/5 text-card-foreground shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-2xl text-primary shadow-inner">
              <Ear className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">Screen-Reader Ready</h3>
            <p className="text-muted-foreground">
              Every element is semantically structured and optimized for screen readers.
            </p>
          </AnimatedStaggerItem>
          
          <AnimatedStaggerItem className="p-8 rounded-3xl bg-card/60 backdrop-blur-md border border-white/10 dark:border-white/5 text-card-foreground shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-2xl text-primary shadow-inner">
              <Eye className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">High Contrast Modes</h3>
            <p className="text-muted-foreground">
              Dynamically adjust themes and contrast levels to suit your visual needs.
            </p>
          </AnimatedStaggerItem>

          <AnimatedStaggerItem className="p-8 rounded-3xl bg-card/60 backdrop-blur-md border border-white/10 dark:border-white/5 text-card-foreground shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-2xl text-primary shadow-inner">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">Keyboard Navigable</h3>
            <p className="text-muted-foreground">
              Navigate seamlessly using only your keyboard with clear focus indicators.
            </p>
          </AnimatedStaggerItem>
        </AnimatedStagger>
      </section>

      {/* Accessible Bento Feature Grid */}
      <AnimatedSection>
        <BentoFeatureSection />
      </AnimatedSection>

      {/* How EXAMSARTHI Works & Capabilities */}
      <section className="py-24 relative overflow-hidden px-4 md:px-8">
        <div className="absolute inset-0 bg-muted/40 backdrop-blur-3xl -z-10" />
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <AnimatedSection className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Seamless Examination Experience</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Prepare for competitive exams in an environment that respects your independence. From practice tests to real examination simulations, EXAMSARTHI is tailored for you.
            </p>
            <AnimatedStagger className="space-y-4">
              {[
                "Voice assistance ready for exam navigation",
                "Scalable text that won't break layout",
                "Fully adaptable to Light, Dark, and High Contrast",
                "Multi-lingual support starting with English and Hindi"
              ].map((item, i) => (
                <AnimatedStaggerItem key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-background/50 backdrop-blur-sm border border-border/50 shadow-sm">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 drop-shadow-sm" />
                  <span className="text-lg font-medium">{item}</span>
                </AnimatedStaggerItem>
              ))}
            </AnimatedStagger>
          </AnimatedSection>
          <AnimatedSection className="bg-gradient-to-br from-card/80 to-background/50 rounded-3xl p-10 border border-white/10 dark:border-white/5 shadow-2xl aspect-square flex flex-col justify-center items-center text-center space-y-8 relative group overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
             <div className="p-6 rounded-3xl bg-primary/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
               <Users className="h-20 w-20 text-primary drop-shadow-md" />
             </div>
             <div className="space-y-3 z-10">
               <h3 className="text-3xl font-extrabold tracking-tight">Join the Community</h3>
               <p className="text-muted-foreground text-lg max-w-[250px] mx-auto">Thousands of candidates are already preparing independently.</p>
             </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t text-center px-4 bg-background z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-extrabold text-2xl tracking-tighter text-primary">EXAMSARTHI</span>
          <p className="text-sm font-medium text-muted-foreground">
            © {new Date().getFullYear()} EXAMSARTHI. Built for everyone.
          </p>
        </div>
      </footer>
      
    </main>
  )
}
