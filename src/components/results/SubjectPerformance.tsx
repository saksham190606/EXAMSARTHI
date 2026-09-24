import React from 'react';
import { SubjectMetrics } from '@/lib/resultsUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';

interface SubjectPerformanceProps {
  metrics: SubjectMetrics[];
}

export function SubjectPerformance({ metrics }: SubjectPerformanceProps) {
  return (
    <Card className="border border-border/80 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">Subject-wise Performance</CardTitle>
        <CardDescription>
          Detailed evaluation of question attempts and accuracy per examination subject.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto focus-within:ring-1 focus-within:ring-ring" tabIndex={0} role="region" aria-label="Subject Performance Table">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
            <caption className="sr-only">Subject performance breakdown showing total questions, correct, incorrect, accuracy, and status</caption>
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                <th scope="col" className="py-3 px-4 font-semibold">Subject</th>
                <th scope="col" className="py-3 px-4 font-semibold text-center">Total</th>
                <th scope="col" className="py-3 px-4 font-semibold text-center">Attempted</th>
                <th scope="col" className="py-3 px-4 font-semibold text-center">Correct</th>
                <th scope="col" className="py-3 px-4 font-semibold text-center">Incorrect</th>
                <th scope="col" className="py-3 px-4 font-semibold w-48">Accuracy</th>
                <th scope="col" className="py-3 px-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {metrics.map((m) => {
                const getStatus = () => {
                  if (m.attempted === 0) {
                    return { label: 'Not Attempted', variant: 'outline' as const, icon: BookOpen };
                  }
                  if (m.accuracy >= 80) {
                    return { label: 'Strong Area', variant: 'secondary' as const, icon: CheckCircle2 };
                  }
                  if (m.accuracy >= 60) {
                    return { label: 'Progressing', variant: 'outline' as const, icon: CheckCircle2 };
                  }
                  return { label: 'Focus Area', variant: 'destructive' as const, icon: AlertCircle };
                };

                const status = getStatus();
                const StatusIcon = status.icon;

                return (
                  <tr key={m.subject} className="hover:bg-muted/20 transition-colors">
                    <th scope="row" className="py-3.5 px-4 font-semibold text-foreground">
                      {m.subject}
                    </th>
                    <td className="py-3.5 px-4 text-center text-muted-foreground">{m.totalQuestions}</td>
                    <td className="py-3.5 px-4 text-center text-muted-foreground">{m.attempted}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-foreground">{m.correct}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-muted-foreground">{m.incorrect}</td>
                    <td className="py-3.5 px-4 w-48">
                      <div className="flex items-center gap-3">
                        <span className="w-10 font-bold text-foreground text-sm">{m.accuracy}%</span>
                        <div 
                          className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden border border-border/50" 
                          role="progressbar"
                          aria-valuenow={m.accuracy}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${m.subject} accuracy: ${m.accuracy} percent`}
                        >
                          <div 
                            className="h-full bg-primary transition-all duration-300" 
                            style={{ width: `${m.accuracy}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant={status.variant} className="gap-1 text-xs font-medium">
                        <StatusIcon className="h-3 w-3" aria-hidden="true" />
                        {status.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
