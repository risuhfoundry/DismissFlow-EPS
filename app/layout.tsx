import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DismissFlow",
  description: "Web-based school e-dismissal & digital pickup system."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
