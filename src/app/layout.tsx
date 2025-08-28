// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist_Mono, Inter_Tight } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";
import Header from "~/components/header";
import { ThemeProvider } from "~/providers/theme-provider";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // 👇 makes relative URLs in page metadata absolute
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),

  // 👇 pages can set `title`; this template wraps it
  title: {
    default: "Guto — Mobile Money Wallet",
    template: "%s | Guto",
  },
  description: "Guto",

  // sensible defaults (page-level generateMetadata can override)
  openGraph: {
    siteName: "Guto",
    type: "website",
    locale: "en_US",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Guto" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/twitter-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${interTight.variable} ${geistMono.variable} antialiased flex flex-col h-full`}>
        <ThemeProvider>
          <Header />
          <Toaster />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
