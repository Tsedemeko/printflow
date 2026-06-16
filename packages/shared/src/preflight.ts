export interface PreflightInput {
  fileName: string;
  mimeType: string;
  widthPx?: number | undefined;
  heightPx?: number | undefined;
  dpi?: number | undefined;
  targetLongSideInches?: number | undefined;
  category?: string | undefined;
}

export function preflightArtwork(input: PreflightInput): string[] {
  const warnings: string[] = [];
  const lowerName = input.fileName.toLowerCase();
  if (input.category === "document" && !lowerName.endsWith(".pdf")) {
    warnings.push("Document printing works best with a print-ready PDF with bleed and crop marks.");
  }
  if (input.category === "apparel" && !["image/png", "image/svg+xml", "application/pdf"].includes(input.mimeType)) {
    warnings.push("Apparel artwork works best as PNG with transparent background, SVG, or print-ready PDF.");
  }
  if (input.widthPx && input.heightPx && input.targetLongSideInches) {
    const longSide = Math.max(input.widthPx, input.heightPx);
    const effectiveDpi = longSide / input.targetLongSideInches;
    if (effectiveDpi < 150) {
      warnings.push("Artwork resolution may appear pixelated at the selected print size.");
    }
  }
  if (input.dpi && input.dpi < 150) {
    warnings.push("Artwork DPI is below the recommended print threshold.");
  }
  return warnings;
}
