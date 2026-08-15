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
  // Google SERP favicon + browsers. Stable paths on same domain.
  // View-source should show rel=icon → /favicon.ico, /icon.png, apple-touch-icon.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon-96.png", type: "image/png", sizes: "96x96" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
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
      {/* Explicit head links as fallback if metadata merge omits any */}
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/icon.png" sizes="96x96" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
      </head>
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
