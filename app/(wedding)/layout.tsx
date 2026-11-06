/**
 * ROOT layout for the wedding site (everything under /hridee).
 *
 * Why this works: Next.js treats any layout.tsx with no layout above it as a *root* layout.
 * There is no app/layout.tsx any more, so this file and app/(portfolio)/layout.tsx are two
 * independent roots. Each owns its own <html>/<body>, fonts and CSS, so nothing from the
 * portfolio (dark background, kantha colours, Georgia) leaks in here, and vice versa.
 * The "(wedding)" folder name is a route group: it never appears in the URL.
 *
 * Icons: app/(wedding)/hridee/icon.png and apple-icon.png (the monogram on paper) are picked up
 * by Next automatically for every page under /hridee. proxy.ts lets link previews fetch them.
 */
import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import { couple } from "./_lib/content";
import "./wedding.css";

// Playfair Display echoes the high-contrast serif of the monogram; Source Sans 3 is a quiet,
// very legible sans for everything else (both are variable fonts, so no weight list is needed).
// Keep the `variable` names: wedding.css maps them to --font-display/--font-body.
const displayFont = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
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
  themeColor: "#FBF8F3",
};

export default function WeddingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      // Tells Next about the smooth scrolling in wedding.css so it can pause it during route changes.
      data-scroll-behavior="smooth"
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
