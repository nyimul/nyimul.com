/**
 * ROOT layout for the wedding site (everything under /hridee).
 *
 * Why this works: Next.js treats any layout.tsx with no layout above it as a *root* layout.
 * There is no app/layout.tsx any more, so this file and app/(portfolio)/layout.tsx are two
 * independent roots. Each owns its own <html>/<body>, fonts and CSS, so nothing from the
 * portfolio (dark background, kantha colours, Georgia) leaks in here, and vice versa.
 * The "(wedding)" folder name is a route group: it never appears in the URL.
 *
 * Favicon: app/favicon.ico is shared by both sites. To give the wedding site its own,
 * drop an icon.png (or icon.svg) into app/(wedding)/hridee/.
 */
import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { couple } from "./_lib/content";
import "./wedding.css";

// Placeholder fonts: a display serif for names/headings and a clean sans for body copy.
// Swap them freely. Keep the `variable` names: wedding.css maps them to --font-display/--font-body.
const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${couple.names[0]} & ${couple.names[1]}`,
    template: `%s · ${couple.names[0]} & ${couple.names[1]}`,
  },
  description: "Wedding details and RSVP.",
  // UNLISTED SITE. This tells search engines not to index or follow anything under /hridee.
  // Metadata merges downward, so every page in this route group inherits it.
  // next.config.ts also sends an X-Robots-Tag header for /hridee as a second layer.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

// Colours the browser UI (address bar on mobile) to match the page background.
export const viewport: Viewport = {
  themeColor: "#FBF7F2",
};

export default function WeddingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
