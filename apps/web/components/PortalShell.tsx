"use client";

import { usePathname } from "next/navigation";
import { AuthGate, useLocalSession } from "./AuthGate";

const menu = [
  { href: "/overview", label: "Owner overview", icon: "▦" },
  { href: "/admin", label: "Dashboard", icon: "D" },
  { href: "/my-work", label: "My work", icon: "★" },
  { href: "/team", label: "Team", icon: "T" },
  { href: "/orders", label: "Orders", icon: "O" },
  { href: "/production", label: "Production", icon: "J" },
  { href: "/batches", label: "Batches", icon: "B" },
  { href: "/pos", label: "POS", icon: "P" },
  { href: "/customers", label: "CRM", icon: "C" },
  { href: "/inventory", label: "Inventory", icon: "I" },
  { href: "/reports", label: "Reports", icon: "R" },
  { href: "/notifications", label: "Notifications", icon: "N" },
  { href: "/staff", label: "Staff & Roles", icon: "S" }
];

export function PortalShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, logout } = useLocalSession();

  return (
    <AuthGate>
      <div className="portal">
        <aside className="sidebar">
          <a className="portal-brand" href="/overview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src="/finesse-logo.png" alt="Finesse Fashion Design" />
          </a>
          <nav className="side-nav">
            {menu.map((item) => (
              <a className={pathname === item.href ? "active" : ""} href={item.href} key={item.href}>
                <span>{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="side-footer">
            <a href="/kiosk">Kiosk</a>
            <a href="/order">Online order</a>
          </div>
        </aside>
        <main className="portal-main">
          <header className="portal-header">
            <div>
              <span className="eyebrow">{eyebrow}</span>
              <h1>{title}</h1>
            </div>
            <div className="user-chip">
              <span>{session?.name ?? "Staff"}</span>
              <small>{session?.role ?? "local"}</small>
              <button className="secondary compact" onClick={logout} type="button">Sign out</button>
            </div>
          </header>
          {children}
        </main>
      </div>
    </AuthGate>
  );
}
