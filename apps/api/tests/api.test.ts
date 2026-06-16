import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { createApp } from "../src/app.js";

let server: Server | undefined;

afterEach(() => {
  server?.close();
  server = undefined;
});

describe("api app", () => {
  it("creates an express app", () => {
    const app = createApp();
    expect(app).toBeTruthy();
  });

  it("enforces staff role access on protected writes", async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const address = server!.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;

    const unauthorized = await fetch(`${baseUrl}/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku: "TEST-1", name: "Test Item", tags: [], quantityOnHand: 1, reorderPoint: 1 })
    });
    expect(unauthorized.status).toBe(401);

    const authorized = await fetch(`${baseUrl}/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-staff-roles": "manager" },
      body: JSON.stringify({ sku: `TEST-${Date.now()}`, name: "Test Item", tags: [], quantityOnHand: 1, reorderPoint: 1 })
    });
    expect(authorized.status).toBe(201);
  });
});
