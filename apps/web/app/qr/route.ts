import QRCode from "qrcode";

// Generates a QR code as SVG on our own server (no external service).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data");
  if (!data || data.length > 1024) {
    return new Response("Missing or invalid 'data' parameter", { status: 400 });
  }
  const svg = await QRCode.toString(data, { type: "svg", margin: 1, width: 220 });
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=3600"
    }
  });
}
