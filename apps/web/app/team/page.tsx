import { PortalShell } from "../../components/PortalShell";
import { TeamBoard } from "../../components/TeamBoard";

export default function TeamPage() {
  return (
    <PortalShell eyebrow="Manager & supervisor" title="Team workload">
      <p className="muted-note">See who is working on what, each person&apos;s active load and throughput, and assign unclaimed jobs.</p>
      <TeamBoard />
    </PortalShell>
  );
}
