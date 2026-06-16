"use client";

import { useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function ProofApproval({ orderId, alreadyApproved }: { orderId: string; alreadyApproved: boolean }) {
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">(alreadyApproved ? "done" : "idle");

  async function approve() {
    setState("saving");
    const response = await fetch(`${apiUrl}/proofs/${orderId}/approve`, { method: "POST" });
    setState(response.ok ? "done" : "error");
  }

  if (state === "done") {
    return <div className="quote-result"><strong>Design approved 🎉</strong><span>Thank you! Production will begin shortly. We&apos;ll notify you when your order is ready.</span></div>;
  }

  return (
    <div>
      <button disabled={state === "saving"} onClick={() => void approve()} type="button">
        {state === "saving" ? "Approving…" : "Approve design for production"}
      </button>
      {state === "error" ? <p className="form-error">Could not approve right now — please try again or contact the shop.</p> : null}
    </div>
  );
}
