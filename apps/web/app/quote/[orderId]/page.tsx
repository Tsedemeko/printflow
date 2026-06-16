import { getOrder } from "../../../lib/api-data";
import { DocumentSheet, DocumentNotFound } from "../../../components/DocumentSheet";

export default async function QuotePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await getOrder(orderId);
  if (!order) return <DocumentNotFound orderId={orderId} kind="quotation" />;
  return <DocumentSheet order={order} kind="quotation" />;
}
