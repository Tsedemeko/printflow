import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://finesse-web.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/order`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/kiosk`, changeFrequency: "monthly", priority: 0.5 }
  ];
}
