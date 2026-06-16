import { PortalShell } from "../../components/PortalShell";
import { StaffManager } from "../../components/StaffManager";

export default function StaffPage() {
  return (
    <PortalShell eyebrow="Access control" title="Staff & Roles">
      <StaffManager />
    </PortalShell>
  );
}
