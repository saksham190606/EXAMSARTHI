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
import { AlertTriangle, ArrowRight } from "lucide-react";

interface SectionAdvanceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentSectionName: string;
  nextSectionName: string;
  onConfirmAdvance: () => void;
}

export function SectionAdvanceDialog({
  isOpen,
  onOpenChange,
  currentSectionName,
  nextSectionName,
  onConfirmAdvance,
}: SectionAdvanceDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-6 space-y-4">
        <DialogHeader className="space-y-2">
          <div className="size-11 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Complete Section & Advance
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground space-y-2 pt-1">
            <span className="block">
              You are about to finish <strong>{currentSectionName}</strong> and proceed to <strong>{nextSectionName}</strong>.
            </span>
            <span className="block text-xs font-semibold text-destructive">
              Once advanced, this section will be locked. You cannot return or alter your answers.
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Stay in {currentSectionName}
          </Button>
          <Button
            variant="default"
            onClick={() => {
              onOpenChange(false);
              onConfirmAdvance();
            }}
            className="w-full sm:w-auto"
          >
            <span>Proceed to {nextSectionName}</span>
            <ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
