/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Allow cross-origin iframe embedding for widget use
          // Note: Removing X-Frame-Options entirely to allow embedding anywhere
          // If you want to restrict to specific domains later, use:
          // { key: 'X-Frame-Options', value: 'ALLOW-FROM https://yourdomain.com' },

          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Control referrer information
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Basic Content Security Policy for widget
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'" +
                (process.env.NODE_ENV === "development"
                  ? " 'unsafe-eval'"
                  : ""), // Allow inline scripts for widget functionality
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Allow Google Fonts
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://nominatim.openstreetmap.org", // Allow geocoding API
              "frame-ancestors *", // Allow embedding in any iframe (widget behavior)
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
