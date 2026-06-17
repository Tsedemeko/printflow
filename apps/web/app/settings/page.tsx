import { PortalShell } from "../../components/PortalShell";
import { CatalogManager } from "../../components/CatalogManager";
import { DepositRulesManager } from "../../components/DepositRulesManager";
import { DiscountRulesManager } from "../../components/DiscountRulesManager";
import { getAdminData } from "../../lib/api-data";

export default async function SettingsPage() {
  const data = await getAdminData();

  return (
    <PortalShell eyebrow="Configuration" title="Settings">
      <p className="muted-note">Manage your service catalog, pricing add-ons, deposit rules, and bulk discounts.</p>
      <section className="admin-grid">
        <CatalogManager initialProducts={data.products} />
        <DepositRulesManager initialRules={data.depositRules} />
        <DiscountRulesManager initialRules={data.discountRules} />
      </section>
    </PortalShell>
  );
}
