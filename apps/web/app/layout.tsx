import type { Metadata, Viewport } from "next";
import "./styles.css";

export const viewport: Viewport = {
  themeColor: "#0f1f3d",
  width: "device-width",
  initialScale: 1
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://finesse-web.vercel.app";
const DESCRIPTION =
  "Finesse Fashion Design Enterprise — sublimation, embroidery, heat press, and custom garment design in Johannesburg & Doornfontein. T-shirts, golf shirts, hoodies, tracksuits, sports kits, school uniforms, jackets, banners, gazebos, and branding.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Finesse Fashion Design Enterprise — Sublimation, Embroidery & Branding",
    template: "%s | Finesse Fashion Design"
  },
  description: DESCRIPTION,
  applicationName: "Finesse Fashion Design",
  keywords: [
    "sublimation printing Johannesburg",
    "embroidery Johannesburg",
    "heat press printing",
    "custom t-shirts",
    "golf shirts",
    "hoodies",
    "tracksuits",
    "soccer kits",
    "school uniforms",
    "matric jackets",
    "pull-up banners",
    "teardrop flags",
    "gazebos",
    "corporate branding",
    "Doornfontein printing",
    "Finesse Fashion Design"
  ],
  authors: [{ name: "Finesse Fashion Design Enterprise" }],
  creator: "Finesse Fashion Design Enterprise",
  publisher: "Finesse Fashion Design Enterprise",
  category: "Apparel & Printing",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Finesse Fashion Design Enterprise",
    title: "Finesse Fashion Design Enterprise — Sublimation, Embroidery & Branding",
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "en_ZA",
    images: [{ url: "/finesse-logo.png", width: 1600, height: 900, alt: "Finesse Fashion Design" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Finesse Fashion Design Enterprise",
    description: DESCRIPTION,
    images: ["/finesse-logo.png"]
  },
  icons: { icon: "/finesse-icon.png", apple: "/finesse-icon.png" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body>
        {children}
      </body>
    </html>
  );
}
