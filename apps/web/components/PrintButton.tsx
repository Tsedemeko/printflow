"use client";

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button className="no-print" onClick={() => window.print()} type="button">
      {label}
    </button>
  );
}
