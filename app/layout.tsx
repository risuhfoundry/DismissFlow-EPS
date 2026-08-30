import type { Metadata, Viewport } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { SmoothScroll } from "@/components/effects/SmoothScroll";
import { CursorGlow } from "@/components/effects/CursorGlow";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  title: "DismissFlow",
  description: "Web-based school e-dismissal & digital pickup system."
};

export const viewport: Viewport = {
  themeColor: "#080706",
  colorScheme: "dark"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark noise-overlay">
      <body
        className={`${inter.variable} ${display.variable} ${GeistMono.variable} font-sans antialiased min-h-screen bg-ink text-bone`}
      >
        <SmoothScroll />
        <CursorGlow />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
