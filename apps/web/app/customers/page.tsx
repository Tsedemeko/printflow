import { PortalShell } from "../../components/PortalShell";
import { CrmGrid } from "../../components/CrmGrid";
import { getCustomers } from "../../lib/api-data";

export default async function CustomersPage() {
  const customers = await getCustomers();
  return (
    <PortalShell eyebrow="Customer records" title="CRM">
      <CrmGrid initialCustomers={customers} />
    </PortalShell>
  );
}
