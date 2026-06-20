import { PortalShell } from "../../components/PortalShell";
import { CatalogManager } from "../../components/CatalogManager";
import { DepositRulesManager } from "../../components/DepositRulesManager";
import { DiscountRulesManager } from "../../components/DiscountRulesManager";
import { KioskCategoriesManager } from "../../components/KioskCategoriesManager";
import { getAdminData, getKioskCategories } from "../../lib/api-data";

export default async function SettingsPage() {
  const [data, kioskCategories] = await Promise.all([getAdminData(), getKioskCategories()]);

  return (
    <PortalShell eyebrow="Configuration" title="Settings">
      <p className="muted-note">Manage your service catalog, pricing add-ons, deposit rules, bulk discounts, and the kiosk main screen.</p>
      <section className="admin-grid">
        <CatalogManager initialProducts={data.products} />
        <DepositRulesManager initialRules={data.depositRules} />
        <DiscountRulesManager initialRules={data.discountRules} />
        <KioskCategoriesManager initialCategories={kioskCategories} />
      </section>
    </PortalShell>
  );
}
