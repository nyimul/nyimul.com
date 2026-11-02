import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
