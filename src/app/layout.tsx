import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

/** Mobile: fixed width, no sideways page drag (app-like). Zoom still allowed. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#05060f",
};

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pro-Optics — професійна оптика та тепловізори",
    template: "%s | Pro-Optics",
  },
  description:
    "Інтернет-магазин тепловізорів, тепловізійних прицілів та ПНБ в Україні.",
  // Explicit icons for Google SERP + browsers (also file-based app/icon.png)
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    siteName: "Pro-Optics",
    url: siteUrl,
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Pro-Optics",
      },
    ],
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${manrope.variable} font-sans antialiased`}
      >
        {/* Keep root layout free of Analytics/scripts so special routes
            (sitemap.xml, robots, API) never inherit injectables. */}
        {children}
      </body>
    </html>
  );
}
