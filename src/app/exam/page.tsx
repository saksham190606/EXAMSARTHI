import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ExamPage() {
  return (
    <main id="main-content" className="p-8 flex-1 flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold mb-4">Official Examination Area</h1>
      <p className="text-muted-foreground max-w-lg mb-8">
        The secure, timed official examination environment is currently locked. For the hackathon demo, please try our fully accessible mock exam in the Practice Center.
      </p>
      <Button render={<Link href="/practice" />} size="lg" className="min-h-11" nativeButton={false}>
        Go to Practice Center <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
      </Button>
    </main>
  );
}
