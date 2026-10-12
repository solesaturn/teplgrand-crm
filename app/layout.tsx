import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { CrmProvider } from "@/lib/crm-context";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-mono",
});

export const metadata: Metadata = {
  title: "Теплогранд — продажи",
  description: "Рабочий стол отдела продаж: лиды, клиенты, сделки, коммерческие предложения и каталог Теплогранд.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>
          <CrmProvider>
            <AppShell>{children}</AppShell>
            <Toaster />
          </CrmProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
