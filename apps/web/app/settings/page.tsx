import { PortalShell } from "../../components/PortalShell";
import { CatalogManager } from "../../components/CatalogManager";
import { DepositRulesManager } from "../../components/DepositRulesManager";
import { DiscountRulesManager } from "../../components/DiscountRulesManager";
import { KioskCategoriesManager } from "../../components/KioskCategoriesManager";
import { BankingDetailsManager } from "../../components/BankingDetailsManager";
import { EmailSettingsManager } from "../../components/EmailSettingsManager";
import { getAdminData, getBankingDetails, getKioskCategories } from "../../lib/api-data";

export default async function SettingsPage() {
  const [data, kioskCategories, banking] = await Promise.all([getAdminData(), getKioskCategories(), getBankingDetails()]);

  return (
    <PortalShell eyebrow="Configuration" title="Settings">
      <p className="muted-note">Manage your service catalog, pricing add-ons, deposit rules, bulk discounts, the kiosk main screen, invoice banking details, and email sending.</p>
      <section className="admin-grid">
        <CatalogManager initialProducts={data.products} />
        <DepositRulesManager initialRules={data.depositRules} />
        <DiscountRulesManager initialRules={data.discountRules} />
        <KioskCategoriesManager initialCategories={kioskCategories} />
        <BankingDetailsManager initialBanking={banking} />
        <EmailSettingsManager />
      </section>
    </PortalShell>
  );
}
