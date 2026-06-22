import {
  catalog,
  defaultDepositRules,
  defaultDiscountRules,
  workflowColumns
} from "@printflow/shared";
import type {
  CatalogProduct,
  Customer,
  DepositRule,
  Order,
  OrderStatus
} from "@printflow/shared";
import type { DiscountRule } from "@printflow/shared";

const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Metrics {
  totalSales: number;
  activeOrders: number;
  averageOrderValue: number;
  outstandingBalances: number;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  tags: string[];
  quantityOnHand: number;
  reorderPoint: number;
}

interface BoardColumn {
  status: OrderStatus;
  label: string;
  orders: Order[];
}

const emptyMetrics: Metrics = {
  totalSales: 0,
  activeOrders: 0,
  averageOrderValue: 0,
  outstandingBalances: 0
};

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${apiUrl}${path}`, { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const payload = await fetchJson<{ products: CatalogProduct[] }>("/catalog/products");
  return payload?.products ?? catalog.map((product) => ({ ...product, enabled: product.enabled ?? true }));
}

export async function getOrders(): Promise<Order[]> {
  const payload = await fetchJson<{ orders: Order[] }>("/orders");
  return payload?.orders ?? [];
}

export async function getOrder(id: string): Promise<Order | null> {
  const payload = await fetchJson<{ order: Order | null }>(`/orders/${id}`);
  return payload?.order ?? null;
}

export async function getCustomers(): Promise<Customer[]> {
  const payload = await fetchJson<{ customers: Customer[] }>("/customers");
  return payload?.customers ?? [];
}

export async function getInventory(): Promise<InventoryItem[]> {
  const payload = await fetchJson<{ items: InventoryItem[] }>("/inventory");
  return payload?.items ?? [];
}

export async function getProductionBoard(): Promise<BoardColumn[]> {
  const payload = await fetchJson<{ columns: BoardColumn[] }>("/production/board");
  return payload?.columns ?? workflowColumns.map((column) => ({ ...column, orders: [] }));
}

export interface ProductionBatch {
  batchKey: string;
  orderNumbers: string[];
  totalQuantity: number;
}

export async function getProductionBatches(): Promise<ProductionBatch[]> {
  const payload = await fetchJson<{ batches: ProductionBatch[] }>("/production/batches");
  return payload?.batches ?? [];
}

export interface NotificationItem {
  event: string;
  channel: string;
  recipient: string;
  subject?: string;
  message: string;
  orderId?: string;
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const payload = await fetchJson<{ notifications: NotificationItem[] }>("/notifications");
  return payload?.notifications ?? [];
}

export interface KioskCategoryItem { id: string; label: string; description: string }

export async function getKioskCategories(): Promise<KioskCategoryItem[]> {
  const payload = await fetchJson<{ categories: KioskCategoryItem[] }>("/kiosk/categories");
  return payload?.categories ?? [];
}

export interface BankingDetailsData {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
  paymentReference: string;
}

const emptyBanking: BankingDetailsData = {
  bankName: "", accountName: "", accountNumber: "", branchCode: "", accountType: "", paymentReference: ""
};

export async function getBankingDetails(): Promise<BankingDetailsData> {
  const payload = await fetchJson<{ banking: BankingDetailsData }>("/settings/banking");
  return payload?.banking ?? emptyBanking;
}

export async function getReportMetrics(): Promise<Metrics> {
  const payload = await fetchJson<{ metrics: Metrics }>("/reports/summary");
  return payload?.metrics ?? emptyMetrics;
}

export async function getAdminData() {
  const [metrics, products, depositRules, discountRules] = await Promise.all([
    getReportMetrics(),
    getCatalogProducts(),
    fetchJson<{ rules: DepositRule[] }>("/catalog/deposit-rules"),
    fetchJson<{ rules: DiscountRule[] }>("/catalog/discount-rules")
  ]);

  return {
    metrics,
    products,
    depositRules: depositRules?.rules ?? defaultDepositRules,
    discountRules: discountRules?.rules ?? defaultDiscountRules
  };
}
