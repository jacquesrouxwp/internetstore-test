import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://optics-shop-skeleton.vercel.app"
  ),
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
