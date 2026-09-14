import type { Metadata } from "next";
import { Noto_Sans, Merriweather } from "next/font/google";
import "./globals.css";
import { cn } from "cn";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/header";
import { HeaderTitleProvider } from "@/components/header-title";

// Fuentes del preset de shadcn: Noto Sans (texto) y Merriweather (títulos).
const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" });
const merriweather = Merriweather({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: "Compás · Clase de bachata",
  description: "Vídeos de la clase de bachata de los jueves",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" suppressHydrationWarning className={cn("h-full", notoSans.variable, merriweather.variable)}>
      <body className="flex min-h-full flex-col antialiased">
        <ThemeProvider>
          <TooltipProvider>
            <HeaderTitleProvider>
              <Header />
              {children}
            </HeaderTitleProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
