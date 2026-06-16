import { PortalShell } from "../../components/PortalShell";
import { MyWorkBoard } from "../../components/MyWorkBoard";

export default function MyWorkPage() {
  return (
    <PortalShell eyebrow="Designers & operators" title="My work">
      <p className="muted-note">Track the jobs assigned to you, claim unassigned work, and move each one forward through production.</p>
      <MyWorkBoard />
    </PortalShell>
  );
}
