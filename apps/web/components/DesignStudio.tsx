"use client";

import { useEffect, useRef, useState } from "react";

const GARMENT_COLORS = ["#1b2a41", "#ffffff", "#000000", "#7a1f3d", "#1f5d3a", "#0f1f3d"];
const FRAME_COLORS = ["#2a2a2a", "#ffffff", "#7a5230", "#c9a227"];
const FONTS = ["Arial", "Georgia", "Trebuchet MS", "Courier New"];

// Live mock-up + simple design tool: overlay artwork on the product, add a caption, pick colours.
export function DesignStudio({ category, onCaptionChange }: { category: string; onCaptionChange?: (caption: string) => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [font, setFont] = useState(FONTS[0]);
  const [scale, setScale] = useState(60);
  const [posY, setPosY] = useState(40);
  const isApparel = category === "apparel";
  const isFramed = category === "canvas_photo" || category === "signage";
  const swatches = isFramed ? FRAME_COLORS : GARMENT_COLORS;
  const [surfaceColor, setSurfaceColor] = useState(isFramed ? "#2a2a2a" : "#1b2a41");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
  useEffect(() => { onCaptionChange?.(caption); }, [caption, onCaptionChange]);

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
  }

  const surfaceStyle = isFramed
    ? { background: "#fff", border: `14px solid ${surfaceColor}` }
    : { background: surfaceColor };

  return (
    <div className="studio">
      <div className={`studio-stage ${isApparel ? "is-apparel" : isFramed ? "is-frame" : "is-card"}`}>
        <div className="studio-surface" style={surfaceStyle}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Your artwork" style={{ width: `${scale}%`, top: `${posY}%` }} className="studio-art" />
          ) : (
            <span className="studio-hint">Upload your artwork to preview it here</span>
          )}
          {caption ? <span className="studio-caption" style={{ color: textColor, fontFamily: font }}>{caption}</span> : null}
        </div>
        <span className="mock-caption">Live mock-up preview</span>
      </div>

      <div className="studio-controls">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => pickFile(event.target.files?.[0])} />
        <button type="button" className="secondary compact" onClick={() => fileRef.current?.click()}>Upload artwork</button>

        <label>Caption / text
          <input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Add text (e.g. a name or slogan)" />
        </label>

        <div className="studio-row">
          <label>Font
            <select value={font} onChange={(event) => setFont(event.target.value)}>
              {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label>Text colour
            <input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} />
          </label>
        </div>

        <div className="studio-row">
          <label>Size<input type="range" min={20} max={100} value={scale} onChange={(event) => setScale(Number(event.target.value))} /></label>
          <label>Position<input type="range" min={5} max={75} value={posY} onChange={(event) => setPosY(Number(event.target.value))} /></label>
        </div>

        <div className="studio-swatches">
          <span className="muted-note">{isFramed ? "Frame colour" : "Garment colour"}</span>
          <div className="row">
            {swatches.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                className={`swatch${surfaceColor === color ? " active" : ""}`}
                style={{ background: color }}
                onClick={() => setSurfaceColor(color)}
              />
            ))}
          </div>
        </div>
        <p className="muted-note">This is a preview to agree the look. Upload the final print-ready file via your secure artwork link after ordering.</p>
      </div>
    </div>
  );
}
