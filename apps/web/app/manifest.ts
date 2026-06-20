import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finesse Fashion Design Enterprise",
    short_name: "Finesse",
    description: "Sublimation, embroidery, heat press, and custom garment design in Johannesburg & Doornfontein.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f1f3d",
    theme_color: "#0f1f3d",
    icons: [
      { src: "/finesse-icon.png", sizes: "512x512", type: "image/png", purpose: "any" }
    ]
  };
}
