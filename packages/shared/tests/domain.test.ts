import { describe, expect, it } from "vitest";
import { calculateRequiredDeposit, canTransition, priceQuote } from "../src/index.js";

describe("pricing and deposits", () => {
  it("prices products with option add-ons and document bulk discounts", () => {
    const quote = priceQuote([
      {
        productId: "document-business-cards",
        quantity: 100,
        selectedOptions: {
          paper: "premium_350",
          sides: "double",
          finishing: "laminated"
        }
      }
    ]);

    expect(quote.subtotal).toBe(670);
    expect(quote.discountTotal).toBe(67);
    expect(quote.total).toBe(603);
  });

  it("requires full deposit for canvas orders", () => {
    const quote = priceQuote([
      {
        productId: "canvas-framed",
        quantity: 1,
        selectedOptions: {
          size: "24x36",
          depth: "38mm",
          edge: "image",
          frame: "floating"
        }
      }
    ]);
    const deposit = calculateRequiredDeposit(quote.total, quote.items);

    expect(deposit.percent).toBe(100);
    expect(deposit.amount).toBe(quote.total);
  });
});

describe("workflow", () => {
  it("allows forward transitions and cancellation", () => {
    expect(canTransition("awaiting_artwork", "design_review")).toBe(true);
    expect(canTransition("in_production", "new")).toBe(false);
    expect(canTransition("quality_check", "cancelled")).toBe(true);
  });
});
