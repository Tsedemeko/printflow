"use client";

import { useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function UploadArtworkForm({ orderId }: { orderId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  async function upload() {
    if (!file) return;
    const fileBase64 = await readFileBase64(file);
    const response = await fetch(`${apiUrl}/artwork/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileBase64,
        uploadedBy: "customer",
        widthPx: 2400,
        heightPx: 3000,
        dpi: 300,
        notes
      })
    });
    if (response.ok) {
      setMessage("Artwork received. The order moved to design review and staff were notified.");
    } else {
      setMessage("We could not attach this artwork to an order. Check the link or ask staff to resend it.");
    }
  }

  return (
    <>
      <div className="form-grid">
        <label>
          Artwork file
          <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <label>
          Notes for the design team
          <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Transparent background, crop marks, caption text..." />
        </label>
      </div>
      <div className="quote" style={{ marginTop: 16 }}>
        <strong>Artwork guidance</strong>
        <p>Documents: PDF with 3mm bleed and crop marks. Canvas/photo: high-resolution JPG or PNG. Apparel: PNG with transparent background.</p>
        <button disabled={!file} onClick={() => void upload()} type="button">Upload and notify staff</button>
      </div>
      {message ? <div className="quote-result"><span>{message}</span></div> : null}
    </>
  );
}

function readFileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? "").split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
