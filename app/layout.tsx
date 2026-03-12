import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PasteVault — Encrypted Code & Note Sharing",
  description:
    "Share code snippets and notes with end-to-end encryption, expiry timers, and burn-after-read links. Your key never leaves your browser.",
  keywords: ["encrypted paste", "code sharing", "privacy", "secure notes", "end-to-end encryption"],
  openGraph: {
    title: "PasteVault — Encrypted Code & Note Sharing",
    description: "Share code and notes with true end-to-end encryption. Zero knowledge.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
