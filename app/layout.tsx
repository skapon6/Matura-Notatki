// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LofiProvider } from "./context/LofiContext";
import { SessionGuard } from "./components/SessionGuard";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wiedzaszytanamiare.pl"),
  title: {
    default: "Notatki do Matury z Języka Polskiego | Wiedza Szyta na Miarę",
    template: "%s | Wiedza Szyta na Miarę",
  },
  description:
    "Kompleksowe notatki maturalne z języka polskiego (Formuła 2023). Opracowania lektur obowiązkowych, epoki, motywy literackie, fiszki, interaktywna mapa myśli i Asystent Rozprawek AI.",
  keywords: [
    "matura notatki",
    "notatki do matury z polskiego",
    "matura język polski 2026",
    "lektury maturalne opracowania",
    "motywy literackie matura",
    "asystent rozprawek ai",
    "tematy rozprawek cke",
    "mapa myśli język polski",
    "fiszki matura polski",
    "formuła 2023 matura polski",
    "wiedza szyta na miarę",
    "streszczenia lektur liceum",
  ],
  authors: [{ name: "Wiedza Szyta na Miarę" }],
  creator: "Wiedza Szyta na Miarę",
  publisher: "Wiedza Szyta na Miarę",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Notatki do Matury z Języka Polskiego | Wiedza Szyta na Miarę",
    description:
      "Najbardziej przytulne kompendium wiedzy do matury z języka polskiego w sieci. Sprawdź darmowe notatki, fiszki i Asystenta Rozprawek AI.",
    url: "https://wiedzaszytanamiare.pl",
    siteName: "Wiedza Szyta na Miarę",
    locale: "pl_PL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Notatki do Matury z Języka Polskiego | Wiedza Szyta na Miarę",
    description:
      "Kompendium wiedzy maturalnej z języka polskiego, notatki z lektur, epoki i AI.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionGuard />
        <Analytics />
        <LofiProvider>{children}</LofiProvider>
      </body>
    </html>
  );
}