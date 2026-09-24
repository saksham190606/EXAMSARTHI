import { ReactNode } from "react";
import { Metadata } from "next";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Portal - ExamSaarthi",
  description: "Create and manage exam content with AI-assisted accessibility features.",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">ExamSaarthi Admin</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/admin" className="text-sm font-medium hover:text-primary transition-colors">
              Content Manager
            </Link>
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
              Exit Admin
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
