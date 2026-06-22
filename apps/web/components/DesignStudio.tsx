"use client";

import { useEffect, useRef, useState } from "react";

const GARMENT_COLORS = ["#1b2a41", "#ffffff", "#000000", "#7a1f3d", "#1f5d3a", "#0f1f3d"];
const FRAME_COLORS = ["#2a2a2a", "#ffffff", "#7a5230", "#c9a227"];
const FONTS = ["Arial", "Georgia", "Trebuchet MS", "Courier New"];

// Placement presets for apparel, expressed as % of the garment surface (x, y) + artwork size (% width).
const PLACEMENTS: Array<{ id: string; label: string; x: number; y: number; scale: number; side: "front" | "back" }> = [
  { id: "left_chest", label: "Left chest", x: 36, y: 33, scale: 20, side: "front" },
  { id: "right_chest", label: "Right chest", x: 64, y: 33, scale: 20, side: "front" },
  { id: "centre_chest", label: "Centre chest", x: 50, y: 35, scale: 32, side: "front" },
  { id: "full_front", label: "Full front", x: 50, y: 55, scale: 64, side: "front" },
  { id: "full_back", label: "Full back", x: 50, y: 50, scale: 66, side: "back" }
];

export interface DesignStudioProps {
  category: string;
  onCaptionChange?: (caption: string) => void;
  onArtworkChange?: (file: File | null) => void;
  onPlacementChange?: (placement: string) => void;
}

// Live mock-up + simple design tool: place artwork on the actual garment, drag it where you want it,
// pick a placement preset, add a caption, choose colours.
export function DesignStudio({ category, onCaptionChange, onArtworkChange, onPlacementChange }: DesignStudioProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [font, setFont] = useState(FONTS[0]);
  const [scale, setScale] = useState(32);
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(35);
  const [side, setSide] = useState<"front" | "back">("front");
  const [placementId, setPlacementId] = useState("centre_chest");
  const isApparel = category === "apparel";
  const isFramed = category === "canvas_photo" || category === "signage";
  const swatches = isFramed ? FRAME_COLORS : GARMENT_COLORS;
  const [surfaceColor, setSurfaceColor] = useState(isFramed ? "#2a2a2a" : "#1b2a41");
  const fileRef = useRef<HTMLInputElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
  useEffect(() => { onCaptionChange?.(caption); }, [caption, onCaptionChange]);

  // Report a human-readable placement (preset name or custom + side) up to the order.
  useEffect(() => {
    if (!isApparel) return;
    const preset = PLACEMENTS.find((p) => p.id === placementId);
    const label = preset ? preset.label : `Custom (${side})`;
    onPlacementChange?.(label);
  }, [placementId, side, isApparel, onPlacementChange]);

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    onArtworkChange?.(file);
  }

  function removeArtwork() {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    onArtworkChange?.(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function applyPlacement(id: string) {
    const preset = PLACEMENTS.find((p) => p.id === id);
    if (!preset) return;
    setPlacementId(id);
    setSide(preset.side);
    setPosX(preset.x);
    setPosY(preset.y);
    setScale(preset.scale);
  }

  // Drag the artwork around the garment.
  function moveTo(clientX: number, clientY: number) {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setPosX(Math.min(95, Math.max(5, x)));
    setPosY(Math.min(95, Math.max(5, y)));
    setPlacementId("custom");
  }
  function onPointerDown(event: React.PointerEvent) {
    if (!imageUrl) return;
    dragging.current = true;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    moveTo(event.clientX, event.clientY);
  }
  function onPointerMove(event: React.PointerEvent) {
    if (!dragging.current) return;
    moveTo(event.clientX, event.clientY);
  }
  function onPointerUp() { dragging.current = false; }

  const surfaceStyle = isFramed
    ? { background: "#fff", border: `14px solid ${surfaceColor}` }
    : { background: isApparel ? "transparent" : surfaceColor };

  const artStyle: React.CSSProperties = isApparel
    ? { width: `${scale}%`, left: `${posX}%`, top: `${posY}%`, transform: "translate(-50%, -50%)" }
    : { width: `${scale}%`, left: "50%", top: `${posY}%`, transform: "translateX(-50%)" };

  return (
    <div className="studio">
      <div className={`studio-stage ${isApparel ? "is-apparel" : isFramed ? "is-frame" : "is-card"}`}>
        <div
          ref={surfaceRef}
          className="studio-surface"
          style={surfaceStyle}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {isApparel ? <TShirt color={surfaceColor} side={side} /> : null}
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Your artwork"
              style={artStyle}
              className={`studio-art${isApparel ? " draggable" : ""}`}
              onPointerDown={onPointerDown}
              draggable={false}
            />
          ) : (
            <span className="studio-hint">{isApparel ? "Upload artwork, then drag it onto the garment" : "Upload your artwork to preview it here"}</span>
          )}
          {caption ? <span className="studio-caption" style={{ color: textColor, fontFamily: font }}>{caption}</span> : null}
        </div>
        <span className="mock-caption">Live mock-up{isApparel ? ` · ${side === "front" ? "Front" : "Back"}` : ""}</span>
      </div>

      <div className="studio-controls">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => pickFile(event.target.files?.[0])} />
        <div className="row">
          <button type="button" className="secondary compact" onClick={() => fileRef.current?.click()}>{imageUrl ? "Replace artwork" : "Upload artwork"}</button>
          {imageUrl ? <button type="button" className="secondary compact" onClick={removeArtwork}>Remove</button> : null}
        </div>

        {isApparel ? (
          <>
            <div className="studio-row">
              <label>View
                <select value={side} onChange={(event) => setSide(event.target.value as "front" | "back")}>
                  <option value="front">Front</option>
                  <option value="back">Back</option>
                </select>
              </label>
            </div>
            <div className="studio-placements">
              <span className="muted-note">Placement</span>
              <div className="row wrap">
                {PLACEMENTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`chip${placementId === p.id ? " active" : ""}`}
                    onClick={() => applyPlacement(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
                {placementId === "custom" ? <span className="chip active">Custom</span> : null}
              </div>
              <p className="muted-note">Tip: tap a placement, or drag the artwork on the garment to position it exactly.</p>
            </div>
          </>
        ) : null}

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
          <label>Size<input type="range" min={10} max={100} value={scale} onChange={(event) => { setScale(Number(event.target.value)); }} /></label>
          {!isApparel ? <label>Position<input type="range" min={5} max={75} value={posY} onChange={(event) => setPosY(Number(event.target.value))} /></label> : null}
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
        <p className="muted-note">This is a preview to agree the look and placement. The exact print file is confirmed with your order.</p>
      </div>
    </div>
  );
}

// Simple front/back t-shirt silhouette so the mock-up looks like a real garment.
function TShirt({ color, side }: { color: string; side: "front" | "back" }) {
  const stroke = color.toLowerCase() === "#ffffff" ? "#c7ced9" : "rgba(0,0,0,0.25)";
  return (
    <svg className="studio-tshirt" viewBox="0 0 200 220" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <path
        d="M70 18 L40 34 L18 70 L40 84 L52 74 L52 200 L148 200 L148 74 L160 84 L182 70 L160 34 L130 18 C124 30 112 38 100 38 C88 38 76 30 70 18 Z"
        fill={color}
        stroke={stroke}
        strokeWidth={2}
      />
      {side === "front"
        ? <path d="M70 18 C76 30 88 38 100 38 C112 38 124 30 130 18" fill="none" stroke={stroke} strokeWidth={2} />
        : <path d="M74 20 C80 30 90 34 100 34 C110 34 120 30 126 20" fill="none" stroke={stroke} strokeWidth={2} />}
    </svg>
  );
}
