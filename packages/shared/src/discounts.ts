import type { OrderItem, ProductCategory } from "./types.js";
import { roundMoney } from "./pricing.js";

export interface DiscountRule {
  id: string;
  label: string;
  priority: number;
  category?: ProductCategory | undefined;
  productId?: string | undefined;
  minQuantity?: number | undefined;
  minTotal?: number | undefined;
  discountPercent: number;
  active: boolean;
}

export const defaultDiscountRules: DiscountRule[] = [
  {
    id: "bulk-documents-100",
    label: "100+ Document Prints get 10% off",
    priority: 80,
    category: "document",
    minQuantity: 100,
    discountPercent: 10,
    active: true
  },
  {
    id: "bulk-apparel-10",
    label: "10+ Apparel items get 15% off",
    priority: 70,
    category: "apparel",
    minQuantity: 10,
    discountPercent: 15,
    active: true
  },
  {
    id: "high-value-order",
    label: "Orders over R2,500 get 5% discount",
    priority: 50,
    minTotal: 2500,
    discountPercent: 5,
    active: false
  }
];

export function calculateDiscountTotal(items: OrderItem[], subtotal: number, rules: DiscountRule[] = defaultDiscountRules): number {
  const activeRules = rules.filter((rule) => rule.active).sort((a, b) => b.priority - a.priority);
  const total = items.reduce((sum, item) => {
    const rule = activeRules.find((candidate) => matchesDiscount(candidate, item, subtotal));
    return sum + (rule ? item.lineTotal * (rule.discountPercent / 100) : 0);
  }, 0);
  return roundMoney(total);
}

function matchesDiscount(rule: DiscountRule, item: OrderItem, subtotal: number): boolean {
  if (rule.category && item.category !== rule.category) return false;
  if (rule.productId && item.productId !== rule.productId) return false;
  if (typeof rule.minQuantity === "number" && item.quantity < rule.minQuantity) return false;
  if (typeof rule.minTotal === "number" && subtotal < rule.minTotal) return false;
  return true;
}
