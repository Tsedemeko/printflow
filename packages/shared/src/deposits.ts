import type { DepositRule, OrderItem, ProductCategory } from "./types.js";
import { roundMoney } from "./pricing.js";

export const defaultDepositRules: DepositRule[] = [
  {
    id: "canvas-full-upfront",
    label: "Canvas & Photo Printing require 100% upfront",
    priority: 100,
    category: "canvas_photo",
    depositPercent: 100,
    nonRefundable: true
  },
  {
    id: "signage-full-upfront",
    label: "Signage & Banners require 100% upfront",
    priority: 95,
    category: "signage",
    depositPercent: 100,
    nonRefundable: true
  },
  {
    id: "high-value-half",
    label: "Orders over R1,000 require 50% deposit",
    priority: 80,
    minTotal: 1000,
    depositPercent: 50,
    nonRefundable: true
  },
  {
    id: "custom-apparel-seventy-five",
    label: "Custom apparel requires 75% deposit",
    priority: 70,
    category: "apparel",
    depositPercent: 75,
    nonRefundable: true
  },
  {
    id: "small-documents-no-deposit",
    label: "Document orders under R500 require no deposit",
    priority: 60,
    category: "document",
    maxTotal: 500,
    depositPercent: 0,
    nonRefundable: false
  }
];

export function calculateRequiredDeposit(
  total: number,
  items: Pick<OrderItem, "category" | "productId">[],
  rules: DepositRule[] = defaultDepositRules
): { amount: number; percent: number; rule: DepositRule | null } {
  const categories = new Set<ProductCategory>(items.map((item) => item.category));
  const matching = rules
    .filter((rule) => matchesRule(rule, total, categories, items.map((item) => item.productId)))
    .sort((a, b) => b.priority - a.priority)[0] ?? null;
  const percent = matching?.depositPercent ?? 0;
  return {
    amount: roundMoney(total * (percent / 100)),
    percent,
    rule: matching
  };
}

function matchesRule(rule: DepositRule, total: number, categories: Set<ProductCategory>, productIds: string[]): boolean {
  if (rule.category && !categories.has(rule.category)) return false;
  if (rule.productId && !productIds.includes(rule.productId)) return false;
  if (typeof rule.minTotal === "number" && total <= rule.minTotal) return false;
  if (typeof rule.maxTotal === "number" && total >= rule.maxTotal) return false;
  return true;
}
