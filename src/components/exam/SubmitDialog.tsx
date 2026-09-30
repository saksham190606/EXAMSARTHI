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
import { useTranslation } from "@/lib/i18n";

interface SubmitDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  totalQuestions: number;
  answeredCount: number;
  onConfirmSubmit: () => void;
  isPracticeMode?: boolean;
}

export function SubmitDialog({ 
  isOpen, 
  onOpenChange, 
  totalQuestions, 
  answeredCount, 
  onConfirmSubmit,
  isPracticeMode = false
}: SubmitDialogProps) {
  const { t, language } = useTranslation();
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-6 space-y-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
            {isPracticeMode 
              ? (language === 'hi' ? 'अभ्यास सत्र सबमिट करें' : 'Submit Practice Session')
              : t('examSubmissionConfirmation')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isPracticeMode
              ? (language === 'hi' ? 'अपने उत्तरों की समीक्षा करें और अभ्यास समाप्त करें।' : 'Review your answers and submit your practice set for immediate solutions.')
              : t('submissionWarning')}
          </DialogDescription>
        </DialogHeader>

        {/* Completion Breakdown Card */}
        <div className="py-2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-none bg-primary/5 border border-primary/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                <span>{t('answered')}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {answeredCount}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  / {totalQuestions}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-none bg-muted/40 border border-border space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <AlertCircle className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <span>{t('unanswered')}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {unansweredCount}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  / {totalQuestions}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-none bg-muted/30 border border-border/50 text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Note:</span>{' '}
            {isPracticeMode
              ? (language === 'hi' ? 'सबमिशन के तुरंत बाद विस्तृत व्याख्या और समाधान उपलब्ध होंगे।' : 'Detailed question walkthroughs and explanations are available immediately.')
              : t('irreversibleNotice')}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="font-bold"
          >
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            {isPracticeMode 
              ? (language === 'hi' ? 'अभ्यास पर वापस जाएं' : 'Return to Practice')
              : t('returnToExam')}
          </Button>
          <Button 
            onClick={() => {
              onOpenChange(false);
              onConfirmSubmit();
            }}
            className="font-bold "
          >
            <Send className="mr-2 size-4" aria-hidden="true" />
            {isPracticeMode 
              ? (language === 'hi' ? 'अभ्यास सबमिट करें' : 'Submit Practice')
              : t('confirmAndSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

