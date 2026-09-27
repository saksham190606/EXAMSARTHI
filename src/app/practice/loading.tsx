import { LoaderOne } from "@/components/ui/loader-one";

export default function PracticeLoading() {
  return (
    <div className="flex-1 min-h-[70vh] flex items-center justify-center p-6 bg-background text-foreground">
      <div className="flex flex-col items-center justify-center p-8 rounded-[2px] border border-neutral-200 dark:border-[rgba(255,255,255,0.16)] bg-white dark:bg-black max-w-sm w-full space-y-4 shadow-none">
        <LoaderOne label="Loading practice modules..." size="lg" />
      </div>
    </div>
  );
}
