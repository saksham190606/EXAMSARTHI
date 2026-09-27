import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AccessibilityProvider } from "@/components/providers/AccessibilityProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Header } from "@/components/layout/Header";
import { DotPattern } from "@/components/ui/dot-pattern";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EXAMSARTHI — Accessible Online Examination Platform",
  description: "Accessibility-first examination and practice platform designed to empower visually impaired candidates to independently prepare for and participate in competitive examinations.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground relative">
        <DotPattern className="fixed inset-0 z-0 h-full w-full fill-white/10 [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)] pointer-events-none" />

        {/* Skip to Main Content Link for Keyboard and Screen-Reader Accessibility */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring font-medium text-sm transition-all"
        >
          Skip to main content
        </a>

        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <AccessibilityProvider>
                <Header />
                <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col outline-none">
                  {children}
                </main>
              </AccessibilityProvider>
            </AuthProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
