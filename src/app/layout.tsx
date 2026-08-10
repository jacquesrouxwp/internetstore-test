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
  openGraph: {
    type: "website",
    locale: "uk_UA",
    siteName: "Pro-Optics",
    url: siteUrl,
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
        {children}
      </body>
    </html>
  );
}
