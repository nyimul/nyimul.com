/**
 * ROOT layout for the portfolio (nyimul.com, /photography, ...).
 * It lives in the "(portfolio)" route group, which keeps it out of the URL. Because there is no
 * app/layout.tsx above it, this is a root layout, independent of the wedding site's root layout
 * in app/(wedding)/layout.tsx. Moving between the two sites is a full page load, which is fine:
 * they are not linked to each other.
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "nyimul.com",
  description: "Nyimul's portfolio website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
