import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Шрифт интерфейса. Шрифты самого резюме подключаются отдельно (@font-face в globals.css)
const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Конструктор резюме",
  description: "Редактор резюме с PDF-экспортом и мини-сайтом портфолио. Данные хранятся только на вашем устройстве.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
