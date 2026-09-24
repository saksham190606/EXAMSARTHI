import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Send, ArrowLeft } from "lucide-react";

interface SubmitDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  totalQuestions: number;
  answeredCount: number;
  onConfirmSubmit: () => void;
}

export function SubmitDialog({ 
  isOpen, 
  onOpenChange, 
  totalQuestions, 
  answeredCount, 
  onConfirmSubmit 
}: SubmitDialogProps) {
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-6 space-y-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
            Submit Examination
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Please review your question completion summary before finalizing your submission.
          </DialogDescription>
        </DialogHeader>

        {/* Completion Breakdown Card */}
        <div className="py-2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                <span>Answered</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {answeredCount}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  / {totalQuestions}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <AlertCircle className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <span>Unanswered</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {unansweredCount}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  / {totalQuestions}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Note:</span> Once submitted, your answers will be finalized and evaluated. You will be redirected to your detailed performance analytics.
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="font-medium"
          >
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Return to Exam
          </Button>
          <Button 
            onClick={() => {
              onOpenChange(false);
              onConfirmSubmit();
            }}
            className="font-medium shadow-xs"
          >
            <Send className="mr-2 size-4" aria-hidden="true" />
            Confirm & Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
