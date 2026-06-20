import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://finesse-web.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep staff/portal and private document pages out of search results.
        disallow: [
          "/admin", "/overview", "/my-work", "/team", "/orders", "/production",
          "/batches", "/pos", "/customers", "/inventory", "/reports",
          "/notifications", "/staff", "/settings", "/login",
          "/invoice/", "/quote/", "/proof/", "/upload/"
        ]
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
