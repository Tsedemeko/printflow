import { catalog, getProduct } from "./catalog.js";
import type { CatalogProduct, OrderItem, QuoteInput } from "./types.js";
import { calculateDiscountTotal, defaultDiscountRules, type DiscountRule } from "./discounts.js";

export interface PriceResult {
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
}

export function priceQuote(inputs: QuoteInput[], discountRules: DiscountRule[] = defaultDiscountRules, products: CatalogProduct[] = catalog): PriceResult {
  const items = inputs.map((input, index) => priceItem(input, index, products));
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const discountTotal = calculateDiscountTotal(items, subtotal, discountRules);
  return {
    items,
    subtotal,
    discountTotal,
    total: roundMoney(Math.max(0, subtotal - discountTotal))
  };
}

export function priceItem(input: QuoteInput, index = 0, products: CatalogProduct[] = catalog): OrderItem {
  const product = products.find((item) => item.id === input.productId) ?? getProduct(input.productId);
  const optionTotal = Object.entries(input.selectedOptions).reduce((sum, [group, optionId]) => {
    const option = product.options[group]?.find((candidate) => candidate.id === optionId);
    return sum + (option?.priceDelta ?? 0);
  }, 0);
  const unitPrice = roundMoney(product.basePrice + optionTotal);
  const lineTotal = roundMoney(unitPrice * input.quantity);
  const item: OrderItem = {
    id: `item-${index + 1}`,
    productId: product.id,
    productName: product.name,
    category: product.category,
    department: product.department,
    quantity: input.quantity,
    selectedOptions: input.selectedOptions,
    unitPrice,
    lineTotal,
    batchKey: buildBatchKey(product.id, input.selectedOptions)
  };
  if (input.specialInstructions) {
    item.specialInstructions = input.specialInstructions;
  }
  return item;
}

export function bulkDiscountFor(item: OrderItem): number {
  if (item.category === "document" && item.quantity >= 100) {
    return roundMoney(item.lineTotal * 0.1);
  }
  if (item.category === "apparel" && item.quantity >= 10) {
    return roundMoney(item.lineTotal * 0.15);
  }
  return 0;
}

export function buildBatchKey(productId: string, options: Record<string, string>): string {
  const parts = Object.entries(options)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`);
  return [productId, ...parts].join("|");
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
