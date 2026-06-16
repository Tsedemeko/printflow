import { PortalShell } from "../../components/PortalShell";
import { getNotifications } from "../../lib/api-data";

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <PortalShell eyebrow="Customer & staff messaging" title="Notifications">
      <p className="muted-note">Every SMS / email / WhatsApp-ready message the system has queued — order confirmations, artwork received, proofs, ready-for-collection, and payment receipts.</p>
      {notifications.length === 0 ? <p className="muted-note">No notifications queued yet.</p> : null}
      <section className="card glossy">
        {notifications.map((note, index) => (
          <div className="ov-row" key={`${note.event}-${index}`}>
            <span className="pill">{note.channel}</span>
            <span style={{ flex: 1 }}>{note.message}</span>
            <span className="muted-note" style={{ minWidth: 120 }}>{note.recipient}</span>
          </div>
        ))}
      </section>
    </PortalShell>
  );
}
