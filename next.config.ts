import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development only. Next serves the page to any host, but it refuses the live-reload
  // connection to every host except localhost and the ones listed here, and the dev page then
  // never starts its JavaScript: it shows, but nothing is interactive (the monogram never moves
  // to the corner, no reveals). So always open the site as http://localhost:3000/hridee, or one
  // of these:
  //   192.168.1.171  this computer on the Wi-Fi, for testing on a phone (the "Network" URL
  //                  `npm run dev` prints). If the computer's IP changes, update it here.
  //   127.0.0.1      the same machine by number, in case a link opens it that way.
  // Exact addresses only, no wildcards for IPs. Next restarts the dev server when this changes.
  allowedDevOrigins: ["192.168.1.171", "127.0.0.1"],

  images: {
    // Serve modern formats. Next generates them on demand from the files you commit.
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        // UNLISTED wedding site: header-level "do not index" for /hridee and everything under it.
        // Pairs with the `robots` metadata in app/(wedding)/layout.tsx.
        // Do NOT add /hridee to a robots.txt: that file is public and would advertise the URL.
        source: "/hridee/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, noimageindex" },
        ],
      },
      {
        // Baseline security headers for the whole site.
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
