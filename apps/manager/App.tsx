import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { statusLabel, workflowColumns } from "@printflow/shared";
import type { Order, StaffRole } from "@printflow/shared";

// Keep the native splash visible until the first screen has painted (no white flash).
void SplashScreen.preventAutoHideAsync();

type Tab = "overview" | "orders" | "payments" | "team" | "stock";
type Staff = { id?: string | undefined; name: string; roles: StaffRole[]; token?: string | undefined };
type RosterMember = { id: string; name: string; role: string; roles: string[] };
type InventoryItem = { id: string; sku: string; name: string; quantityOnHand: number; reorderPoint: number };
type StockMovement = { id: string; itemId: string; itemName: string; type: string; delta: number; quantityAfter: number; note?: string; actorName: string; createdAt: string };

const MOVEMENT_LABEL: Record<string, string> = {
  opening: "Opening", receive: "Stock in", issue: "Stock out", consume: "Used on order", recount: "Recount"
};
type Metrics = { totalSales: number; activeOrders: number; averageOrderValue: number; outstandingBalances: number };
type BoardColumn = { status: string; label: string; orders: Order[] };

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "https://finesse-api-ogyt.onrender.com";
const ACTIVE = ["new", "awaiting_artwork", "design_review", "approved", "in_production", "quality_check"];
let accessToken = "";

function headers(roles: StaffRole[], json = true): Record<string, string> {
  const base: Record<string, string> = json ? { "Content-Type": "application/json" } : {};
  return accessToken ? { ...base, Authorization: `Bearer ${accessToken}` } : { ...base, "x-staff-roles": roles.join(",") };
}

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [staff, setStaff] = useState<Staff | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [board, setBoard] = useState<BoardColumn[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [rosterError, setRosterError] = useState("");
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  // Tablet: keep content in a centered ~760px column instead of stretching edge-to-edge.
  const sidePad = width >= 768 ? Math.max(18, (width - 760) / 2) : 18;

  useEffect(() => { void SplashScreen.hideAsync(); }, []);

  function logout() {
    accessToken = "";
    setStaff(null);
    setTab("overview");
  }

  async function refresh() {
    setLoading(true);
    try {
      const [ordersRes, metricsRes, boardRes, invRes, moveRes, rosterRes] = await Promise.all([
        fetch(`${apiUrl}/orders`),
        fetch(`${apiUrl}/reports/summary`),
        fetch(`${apiUrl}/production/board`),
        fetch(`${apiUrl}/inventory`),
        fetch(`${apiUrl}/inventory/movements`, { headers: headers(["manager"], false) }),
        fetch(`${apiUrl}/staff/roster`, { headers: headers(["manager"], false) })
      ]);
      if (ordersRes.ok) setOrders(((await ordersRes.json()) as { orders: Order[] }).orders);
      if (metricsRes.ok) setMetrics(((await metricsRes.json()) as { metrics: Metrics }).metrics);
      if (boardRes.ok) setBoard(((await boardRes.json()) as { columns: BoardColumn[] }).columns);
      if (invRes.ok) setInventory(((await invRes.json()) as { items: InventoryItem[] }).items);
      if (moveRes.ok) setMovements(((await moveRes.json()) as { movements: StockMovement[] }).movements);
      if (rosterRes.ok) { setRoster(((await rosterRes.json()) as { roster: RosterMember[] }).roster); setRosterError(""); }
      else setRosterError("Manager/owner access is required to load the staff roster.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (staff) void refresh();
  }, [staff]);

  async function assign(orderId: string, staffId: string) {
    await fetch(`${apiUrl}/orders/${orderId}`, {
      method: "PATCH",
      headers: headers(["manager"]),
      body: JSON.stringify({ staffAssigneeId: staffId })
    });
    await refresh();
  }

  async function advance(orderId: string, status: string) {
    await fetch(`${apiUrl}/orders/${orderId}/status`, {
      method: "POST",
      headers: headers(["manager"]),
      body: JSON.stringify({ status })
    });
    await refresh();
  }

  async function setRush(orderId: string, rush: boolean) {
    await fetch(`${apiUrl}/orders/${orderId}`, {
      method: "PATCH",
      headers: headers(["manager"]),
      body: JSON.stringify({ rush })
    });
    await refresh();
  }

  async function addStaff(input: { name: string; email: string; role: string; password: string }): Promise<string> {
    const res = await fetch(`${apiUrl}/admin/staff`, {
      method: "POST",
      headers: headers(["owner"]),
      body: JSON.stringify({ name: input.name, email: input.email, role: input.role, temporaryPassword: input.password })
    });
    if (!res.ok) {
      return res.status === 403 ? "Only an owner can add team members." : "Could not add member (check the details).";
    }
    await refresh();
    return "";
  }

  async function deactivateStaff(id: string): Promise<void> {
    await fetch(`${apiUrl}/admin/staff/${id}`, {
      method: "PATCH",
      headers: headers(["owner"]),
      body: JSON.stringify({ active: false })
    });
    await refresh();
  }

  async function moveStock(itemId: string, kind: "receive" | "issue", quantity: number) {
    if (!quantity || quantity <= 0) return;
    await fetch(`${apiUrl}/inventory/${itemId}/${kind}`, {
      method: "POST",
      headers: headers(["manager"]),
      body: JSON.stringify({ quantity })
    });
    await refresh();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { paddingHorizontal: sidePad }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.logo}>Finesse Manager</Text>
          <Text style={styles.subtle}>Owner &amp; manager · whole-shop tracking</Text>
        </View>
        {staff ? (
          <Pressable style={styles.signOut} onPress={logout}><Text style={styles.signOutText}>Sign out</Text></Pressable>
        ) : null}
      </View>
      {staff && loading ? (
        <View style={styles.loadingRow}><ActivityIndicator color="#c19a3e" /><Text style={styles.muted}>Loading…</Text></View>
      ) : null}
      {staff ? (
        <View style={[styles.tabs, { paddingHorizontal: sidePad }]}>
          {(["overview", "orders", "payments", "team", "stock"] as Tab[]).map((item) => (
            <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.activeTab]}>
              <Text style={[styles.tabText, tab === item && styles.activeTabText]}>{item.toUpperCase()}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.tab} onPress={() => void refresh()}><Text style={styles.tabText}>REFRESH</Text></Pressable>
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={[styles.page, { paddingHorizontal: sidePad }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { if (staff) void refresh(); }} tintColor="#c19a3e" colors={["#c19a3e"]} />}
      >
        {!staff ? <Login onLogin={(next) => { accessToken = next.token ?? ""; setStaff(next); }} /> : null}
        {staff && tab === "overview" ? <Overview orders={orders} metrics={metrics} board={board} inventory={inventory} /> : null}
        {staff && tab === "orders" ? <Orders orders={orders} roster={roster} onAdvance={advance} onAssign={assign} onRush={setRush} /> : null}
        {staff && tab === "payments" ? <Payments orders={orders} metrics={metrics} /> : null}
        {staff && tab === "team" ? <Team orders={orders} roster={roster} error={rosterError} onAdd={addStaff} onDeactivate={deactivateStaff} /> : null}
        {staff && tab === "stock" ? <Stock inventory={inventory} movements={movements} onMove={moveStock} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Login({ onLogin }: { onLogin: (staff: Staff) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setMessage("");
    setBusy(true);
    try {
      const authRes = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!authRes.ok) { setMessage("Invalid email or password."); return; }
      const authPayload = await authRes.json() as { token: string };
      const sessionRes = await fetch(`${apiUrl}/auth/session`, { headers: { Authorization: `Bearer ${authPayload.token}` } });
      if (!sessionRes.ok) { setMessage("This account has no active Finesse staff profile."); return; }
      const sessionPayload = await sessionRes.json() as { user: { id?: string; name: string; roles: StaffRole[] } };
      onLogin({ id: sessionPayload.user.id, name: sessionPayload.user.name, roles: sessionPayload.user.roles, token: authPayload.token });
    } catch {
      setMessage("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <Text style={styles.eyebrow}>Owner &amp; manager access</Text>
      <Text style={styles.title}>Sign in</Text>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Manager login</Text>
        <Text style={styles.muted}>Track sales, jobs in production, collections, and staff workload across the whole shop.</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        {message ? <Text style={styles.warning}>{message}</Text> : null}
        <Pressable style={[styles.button, busy && styles.buttonDisabled]} disabled={busy} onPress={() => void signIn()}>
          {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function Overview({ orders, metrics, board, inventory }: { orders: Order[]; metrics: Metrics | null; board: BoardColumn[]; inventory: InventoryItem[] }) {
  const ready = orders.filter((order) => order.status === "ready_for_collection");
  const outstanding = orders.filter((order) => order.balanceDue > 0 && order.status !== "cancelled").sort((a, b) => b.balanceDue - a.balanceDue).slice(0, 6);
  const lowStock = inventory.filter((item) => item.quantityOnHand <= item.reorderPoint);
  const activeCount = orders.filter((order) => ACTIVE.includes(order.status)).length;

  return (
    <View>
      <Text style={styles.eyebrow}>Live shop status</Text>
      <Text style={styles.title}>Overview</Text>

      <View style={styles.kpiRow}>
        <Kpi label="Sales to date" value={`R${(metrics?.totalSales ?? 0).toLocaleString()}`} />
        <Kpi label="Active jobs" value={String(activeCount)} />
        <Kpi label="Outstanding" value={`R${(metrics?.outstandingBalances ?? 0).toLocaleString()}`} />
        <Kpi label="Ready to collect" value={String(ready.length)} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Jobs by stage</Text>
        {board.map((column) => (
          <View style={styles.rowBetween} key={column.status}>
            <Text style={styles.muted}>{column.label}</Text>
            <Text style={styles.pill}>{column.orders.length}</Text>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Ready for collection ({ready.length})</Text>
        {ready.length === 0 ? <Text style={styles.muted}>Nothing waiting for collection.</Text> : null}
        {ready.map((order) => (
          <View style={styles.rowBetween} key={order.id}>
            <Text style={[styles.muted, styles.flex1]}>{order.orderNumber} · {order.customer.name}</Text>
            <Text style={styles.pill}>{order.customer.mobile}</Text>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Outstanding balances</Text>
        {outstanding.length === 0 ? <Text style={styles.muted}>All balances settled.</Text> : null}
        {outstanding.map((order) => (
          <View style={styles.rowBetween} key={order.id}>
            <Text style={[styles.muted, styles.flex1]}>{order.orderNumber} · {order.customer.name}</Text>
            <Text style={styles.pill}>R{order.balanceDue.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Low stock ({lowStock.length})</Text>
        {lowStock.length === 0 ? <Text style={styles.muted}>Stock levels are healthy.</Text> : null}
        {lowStock.map((item) => (
          <View style={styles.rowBetween} key={item.id}>
            <Text style={[styles.muted, styles.flex1]}>{item.name}</Text>
            <Text style={styles.pill}>{item.quantityOnHand} / {item.reorderPoint}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Orders({ orders, roster, onAdvance, onAssign, onRush }: {
  orders: Order[];
  roster: RosterMember[];
  onAdvance: (orderId: string, status: string) => Promise<void>;
  onAssign: (orderId: string, staffId: string) => Promise<void>;
  onRush: (orderId: string, rush: boolean) => Promise<void>;
}) {
  const [assigning, setAssigning] = useState<string | null>(null);
  const done = ["completed", "cancelled"];
  const active = orders.filter((order) => !done.includes(order.status));
  const nameFor = (id?: string) => roster.find((member) => member.id === id)?.name ?? "Unassigned";
  const nextStatus = (status: string) => {
    const index = workflowColumns.findIndex((column) => column.status === status);
    return workflowColumns[index + 1]?.status;
  };

  return (
    <View>
      <Text style={styles.eyebrow}>Manage</Text>
      <Text style={styles.title}>Orders &amp; jobs</Text>
      {active.length === 0 ? <Text style={styles.muted}>No active orders.</Text> : null}
      {active.map((order) => {
        const ns = nextStatus(order.status);
        return (
          <View style={styles.panel} key={order.id}>
            <View style={styles.rowBetween}>
              <Text style={[styles.panelTitle, styles.flex1]}>{order.orderNumber}{order.rush ? "  ⚡" : ""}</Text>
              <Text style={styles.pill}>{statusLabel(order.status)}</Text>
            </View>
            <Text style={styles.muted}>{order.customer.name} · Balance R{order.balanceDue.toFixed(2)}</Text>
            <Text style={styles.muted}>Assigned: {nameFor(order.staffAssigneeId)}</Text>

            <View style={styles.row}>
              {ns ? <Pressable style={styles.button} onPress={() => void onAdvance(order.id, ns)}><Text style={styles.buttonText}>Move to {statusLabel(ns)}</Text></Pressable> : null}
              <Pressable style={styles.shareBtn} onPress={() => setAssigning(assigning === order.id ? null : order.id)}><Text style={styles.chipText}>Assign</Text></Pressable>
              <Pressable style={styles.shareBtn} onPress={() => void onRush(order.id, !order.rush)}><Text style={styles.chipText}>{order.rush ? "Unrush" : "Rush"}</Text></Pressable>
            </View>

            {assigning === order.id && roster.length ? (
              <View style={styles.row}>
                {roster.map((member) => (
                  <Pressable style={styles.chip} key={member.id} onPress={() => { setAssigning(null); void onAssign(order.id, member.id); }}>
                    <Text style={styles.chipText}>{member.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function Payments({ orders, metrics }: { orders: Order[]; metrics: Metrics | null }) {
  const txns = orders
    .flatMap((order) => order.payments.map((payment) => ({ ...payment, orderNumber: order.orderNumber, customer: order.customer.name })))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const collected = txns.reduce((sum, txn) => sum + txn.amount, 0);

  return (
    <View>
      <Text style={styles.eyebrow}>Money</Text>
      <Text style={styles.title}>Payments &amp; transactions</Text>

      <View style={styles.kpiRow}>
        <Kpi label="Collected" value={`R${collected.toLocaleString()}`} />
        <Kpi label="Transactions" value={String(txns.length)} />
        <Kpi label="Outstanding" value={`R${(metrics?.outstandingBalances ?? 0).toLocaleString()}`} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Recent transactions</Text>
        {txns.length === 0 ? <Text style={styles.muted}>No payments recorded yet.</Text> : null}
        {txns.slice(0, 40).map((txn) => (
          <View style={styles.rowBetween} key={txn.id}>
            <Text style={[styles.muted, styles.flex1]}>{new Date(txn.createdAt).toLocaleDateString("en-ZA")} · {txn.orderNumber} · {txn.method.replace("_", " ")}</Text>
            <Text style={styles.pill}>R{txn.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const ROLE_OPTIONS = ["owner", "manager", "cashier", "designer", "apparel_operator"];

function Team({ orders, roster, error, onAdd, onDeactivate }: {
  orders: Order[];
  roster: RosterMember[];
  error: string;
  onAdd: (input: { name: string; email: string; role: string; password: string }) => Promise<string>;
  onDeactivate: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("designer");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const active = orders.filter((order) => !["completed", "cancelled"].includes(order.status));
  const jobsFor = (id: string) => active.filter((order) => order.staffAssigneeId === id).length;

  async function submit() {
    if (!name || !email || !password) { setMsg("Name, email and a temporary password are required."); return; }
    setBusy(true);
    const err = await onAdd({ name, email, role, password });
    setBusy(false);
    if (err) { setMsg(err); return; }
    setMsg(""); setName(""); setEmail(""); setPassword("");
  }

  return (
    <View>
      <Text style={styles.eyebrow}>Manager</Text>
      <Text style={styles.title}>Team</Text>
      {error ? <Text style={styles.warning}>{error}</Text> : null}

      <View style={styles.kpiRow}>
        <Kpi label="Members" value={String(roster.length)} />
        <Kpi label="Active jobs" value={String(active.length)} />
      </View>

      <Pressable style={styles.button} onPress={() => setShowAdd((value) => !value)}>
        <Text style={styles.buttonText}>{showAdd ? "Close" : "+ Add team member"}</Text>
      </Pressable>

      {showAdd ? (
        <View style={styles.panel}>
          <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Temporary password" secureTextEntry value={password} onChangeText={setPassword} />
          <View style={styles.row}>
            {ROLE_OPTIONS.map((option) => (
              <Pressable key={option} style={[styles.chip, role === option && styles.chipActive]} onPress={() => setRole(option)}>
                <Text style={styles.chipText}>{option.replace("_", " ")}</Text>
              </Pressable>
            ))}
          </View>
          {msg ? <Text style={styles.warning}>{msg}</Text> : null}
          <Pressable style={[styles.button, busy && styles.buttonDisabled]} disabled={busy} onPress={() => void submit()}>
            {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Add member</Text>}
          </Pressable>
        </View>
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Team members</Text>
        {roster.length === 0 ? <Text style={styles.muted}>No active staff.</Text> : null}
        {roster.map((member) => (
          <View style={styles.rowBetween} key={member.id}>
            <Text style={[styles.muted, styles.flex1]}>{member.name} · {member.role.replace("_", " ")} · {jobsFor(member.id)} active</Text>
            <Pressable style={styles.shareBtn} onPress={() => void onDeactivate(member.id)}><Text style={styles.chipText}>Deactivate</Text></Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

function Stock({ inventory, movements, onMove }: { inventory: InventoryItem[]; movements: StockMovement[]; onMove: (itemId: string, kind: "receive" | "issue", quantity: number) => Promise<void> }) {
  const [qty, setQty] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const lowCount = inventory.filter((item) => item.quantityOnHand <= item.reorderPoint).length;

  function submit(itemId: string, kind: "receive" | "issue") {
    const value = Number(qty[itemId]);
    if (!Number.isFinite(value) || value <= 0) return;
    void onMove(itemId, kind, value).then(() => setQty((prev) => ({ ...prev, [itemId]: "" })));
  }

  return (
    <View>
      <Text style={styles.eyebrow}>Inventory</Text>
      <Text style={styles.title}>Stock</Text>

      <View style={styles.kpiRow}>
        <Kpi label="Items" value={String(inventory.length)} />
        <Kpi label="Low stock" value={String(lowCount)} />
      </View>

      {inventory.map((item) => {
        const low = item.quantityOnHand <= item.reorderPoint;
        const isOpen = open === item.id;
        return (
          <View style={styles.panel} key={item.id}>
            <Pressable onPress={() => setOpen(isOpen ? null : item.id)}>
              <View style={styles.rowBetween}>
                <Text style={[styles.panelTitle, styles.flex1]}>{item.name}{low ? <Text style={styles.role}> · LOW</Text> : null}</Text>
                <Text style={styles.pill}>{item.quantityOnHand}</Text>
              </View>
            </Pressable>
            {isOpen ? (
              <>
                <Text style={styles.muted}>{item.sku} · Reorder at {item.reorderPoint}</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="Quantity"
                  value={qty[item.id] ?? ""}
                  onChangeText={(value) => setQty((prev) => ({ ...prev, [item.id]: value }))}
                />
                <View style={[styles.row, { flexWrap: "nowrap", alignItems: "stretch" }]}>
                  <Pressable style={styles.stockBtn} onPress={() => submit(item.id, "receive")}><Text style={styles.buttonText}>Stock in</Text></Pressable>
                  <Pressable style={styles.stockBtnOut} onPress={() => submit(item.id, "issue")}><Text style={styles.stockBtnOutText}>Stock out</Text></Pressable>
                </View>
              </>
            ) : null}
          </View>
        );
      })}

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Recent stock movements</Text>
        {movements.length === 0 ? <Text style={styles.muted}>No movements recorded yet.</Text> : null}
        {movements.slice(0, 30).map((movement) => (
          <View style={styles.job} key={movement.id}>
            <Text style={styles.tileTitle}>{movement.itemName} · {MOVEMENT_LABEL[movement.type] ?? movement.type} ({movement.delta >= 0 ? "+" : ""}{movement.delta})</Text>
            <Text style={styles.muted}>{new Date(movement.createdAt).toLocaleString("en-ZA")} · now {movement.quantityAfter} · {movement.actorName}{movement.note ? ` · ${movement.note}` : ""}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#eef2f8" },
  header: { alignItems: "center", backgroundColor: "#ffffff", borderBottomColor: "#d6deea", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 18 },
  signOut: { borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  signOutText: { color: "#0f1f3d", fontWeight: "800" },
  loadingRow: { alignItems: "center", backgroundColor: "#ffffff", flexDirection: "row", gap: 8, paddingBottom: 8, paddingHorizontal: 18 },
  buttonDisabled: { opacity: 0.6 },
  logo: { color: "#0f1f3d", fontSize: 24, fontWeight: "800" },
  subtle: { color: "#5b6b86", marginTop: 4 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 12, backgroundColor: "#ffffff" },
  tab: { borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  activeTab: { backgroundColor: "#c19a3e", borderColor: "#c19a3e" },
  tabText: { color: "#5b6b86", fontSize: 12, fontWeight: "700" },
  activeTabText: { color: "#0f1f3d" },
  page: { gap: 16, padding: 18 },
  eyebrow: { color: "#9a7b22", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  title: { color: "#0f1f3d", fontSize: 34, fontWeight: "800", marginBottom: 14, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  tile: { backgroundColor: "#ffffff", borderColor: "#d6deea", borderLeftColor: "#c19a3e", borderLeftWidth: 5, borderRadius: 8, borderWidth: 1, minWidth: 150, padding: 14 },
  tileTitle: { color: "#0f1f3d", fontSize: 16, fontWeight: "800" },
  muted: { color: "#5b6b86", lineHeight: 20, marginTop: 4 },
  panel: { backgroundColor: "#ffffff", borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, marginTop: 14, padding: 16 },
  panelTitle: { color: "#0f1f3d", fontSize: 18, fontWeight: "800" },
  role: { color: "#5b6b86", fontSize: 13, fontWeight: "600" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  rowBetween: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between", paddingVertical: 7 },
  flex1: { flex: 1 },
  button: { backgroundColor: "#0f1f3d", borderRadius: 8, marginTop: 12, paddingHorizontal: 14, paddingVertical: 12 },
  buttonText: { color: "#ffffff", fontWeight: "800", textAlign: "center" },
  input: { borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, marginTop: 12, minHeight: 44, paddingHorizontal: 10 },
  warning: { color: "#b91c1c", fontWeight: "800", marginTop: 10 },
  job: { borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, marginTop: 10, padding: 12 },
  pill: { backgroundColor: "#f3ecd9", borderRadius: 999, color: "#0f1f3d", flexShrink: 0, fontWeight: "700", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 4 },
  chip: { backgroundColor: "#0f1f3d", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: "#c19a3e" },
  chipText: { color: "#ffffff", fontWeight: "700" },
  shareBtn: { alignSelf: "flex-start", backgroundColor: "#0f1f3d", borderRadius: 8, flexShrink: 0, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8 },
  stockBtn: { alignItems: "center", backgroundColor: "#0f1f3d", borderRadius: 8, flex: 1, paddingVertical: 12 },
  stockBtnOut: { alignItems: "center", backgroundColor: "#ffffff", borderColor: "#0f1f3d", borderWidth: 1, borderRadius: 8, flex: 1, paddingVertical: 11 },
  stockBtnOutText: { color: "#0f1f3d", fontWeight: "800" },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpi: { backgroundColor: "#0f1f3d", borderRadius: 12, flexGrow: 1, minWidth: 150, padding: 14 },
  kpiLabel: { color: "#d9c489", fontSize: 12, fontWeight: "700" },
  kpiValue: { color: "#ffffff", fontSize: 24, fontWeight: "900", marginTop: 4 }
});
