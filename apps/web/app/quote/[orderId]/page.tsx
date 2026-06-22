import { getBankingDetails, getOrder } from "../../../lib/api-data";
import { DocumentSheet, DocumentNotFound } from "../../../components/DocumentSheet";

export default async function QuotePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const [order, banking] = await Promise.all([getOrder(orderId), getBankingDetails()]);
  if (!order) return <DocumentNotFound orderId={orderId} kind="quotation" />;
  return <DocumentSheet order={order} kind="quotation" banking={banking} />;
}
