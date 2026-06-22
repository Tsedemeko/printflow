import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, SafeAreaView, ScrollView, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { calculateRequiredDeposit, priceQuote, statusLabel } from "@printflow/shared";
import type { CounterQueueTicket, Order, PaymentMethod, StaffRole } from "@printflow/shared";
import { storeData } from "./src/demo";

// Keep the native splash visible until the first screen has painted (no white flash).
void SplashScreen.preventAutoHideAsync();

type Tab = "mywork" | "counter" | "jobs" | "pos" | "shop";
type Staff = { id?: string | undefined; name: string; roles: StaffRole[]; token?: string | undefined };
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "https://finesse-api-ogyt.onrender.com";
const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? "https://finesse-web.vercel.app";
let staffAccessToken = "";

function invoiceMessage(order: Order) {
  return `Invoice ${order.orderNumber} — Finesse Fashion Design Enterprise\nTotal R${order.total.toFixed(2)} · Balance R${order.balanceDue.toFixed(2)}\n${webUrl}/invoice/${order.id}`;
}

async function shareInvoice(order: Order) {
  await Share.share({ title: `Invoice ${order.orderNumber}`, message: invoiceMessage(order) });
}

function waNumber(mobile?: string): string {
  const digits = (mobile ?? "").replace(/[^\d]/g, "");
  if (digits.startsWith("27")) return digits;
  if (digits.startsWith("0")) return `27${digits.slice(1)}`;
  return digits;
}

async function whatsappInvoice(order: Order) {
  const msg = invoiceMessage(order);
  const deep = `whatsapp://send?phone=${waNumber(order.customer.mobile)}&text=${encodeURIComponent(msg)}`;
  const supported = await Linking.canOpenURL(deep).catch(() => false);
  await Linking.openURL(supported ? deep : `https://wa.me/${waNumber(order.customer.mobile)}?text=${encodeURIComponent(msg)}`);
}

// Email the invoice to the customer through the owner's configured Gmail (via the API).
async function emailInvoice(order: Order): Promise<string> {
  try {
    const response = await fetch(`${apiUrl}/orders/${order.id}/send-invoice`, {
      method: "POST",
      headers: staffHeaders(["cashier"]),
      body: JSON.stringify({ kind: "invoice" })
    });
    const data = await response.json().catch(() => ({})) as { to?: string; error?: string };
    if (response.ok) return `Emailed to ${data.to ?? "customer"}`;
    if (response.status === 409) return "Set up email in Settings first";
    if (response.status === 422) return "Customer has no email on file";
    return data.error ?? "Could not send";
  } catch {
    return "Could not reach server";
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>("counter");
  const [staff, setStaff] = useState<Staff | null>(null);
  const [orders, setOrders] = useState<Order[]>(storeData.orders);
  const [counterQueue, setCounterQueue] = useState<CounterQueueTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  // Tablet: keep content in a centered ~760px column instead of stretching edge-to-edge.
  const sidePad = width >= 768 ? Math.max(18, (width - 760) / 2) : 18;
  const tabs = staff ? tabsForRoles(staff.roles) : [];
  // A cashier runs the till on this device — keep the screen awake the whole session so the
  // POS never sleeps mid-sale. Released automatically when they sign out or the role changes.
  const isCashier = !!staff?.roles.includes("cashier");

  useEffect(() => { void SplashScreen.hideAsync(); }, []);

  useEffect(() => {
    if (!isCashier) return undefined;
    void activateKeepAwakeAsync("printflow-pos");
    return () => { deactivateKeepAwake("printflow-pos"); };
  }, [isCashier]);

  function logout() {
    staffAccessToken = "";
    setStaff(null);
    setTab("counter");
  }

  async function refreshOrders() {
    const response = await fetch(`${apiUrl}/orders`);
    if (response.ok) {
      const payload = await response.json();
      setOrders(payload.orders);
    }
  }

  async function refreshCounterQueue() {
    const response = await fetch(`${apiUrl}/counter/queue`);
    if (response.ok) {
      const payload = await response.json();
      setCounterQueue(payload.tickets);
    }
  }

  async function refreshAll() {
    if (!staff) return;
    setLoading(true);
    try {
      await Promise.all([refreshOrders(), refreshCounterQueue()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (staff) void refreshAll();
  }, [staff]);

  // Keep the waiting queue (and orders) live so kiosk/counter check-ins appear without a manual refresh.
  useEffect(() => {
    if (!staff) return undefined;
    const id = setInterval(() => { void refreshCounterQueue(); void refreshOrders(); }, 15000);
    return () => clearInterval(id);
  }, [staff]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { paddingHorizontal: sidePad }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.logo}>Finesse Staff</Text>
          <Text style={styles.subtle}>Embroidery · Heat Press · Garment Design</Text>
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
          {tabs.map((item) => (
            <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.activeTab]}>
              <Text style={[styles.tabText, tab === item && styles.activeTabText]}>{item.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={[styles.page, { paddingHorizontal: sidePad }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refreshAll()} tintColor="#c19a3e" colors={["#c19a3e"]} />}
      >
        {!staff ? <MobileLogin onLogin={(nextStaff) => {
          staffAccessToken = nextStaff.token ?? "";
          setStaff(nextStaff);
          setTab(tabsForRoles(nextStaff.roles)[0] ?? "counter");
        }} /> : null}
        {staff ? <WaitingBanner tickets={counterQueue} staffName={staff.name} onRefresh={refreshCounterQueue} /> : null}
        {tab === "mywork" && staff ? <MyWork orders={orders} staff={staff} onRefresh={refreshOrders} /> : null}
        {tab === "counter" && staff ? <Counter orders={orders} tickets={counterQueue} staffName={staff.name} onRefresh={async () => { await refreshOrders(); await refreshCounterQueue(); }} /> : null}
        {tab === "jobs" && staff ? <Jobs orders={orders} onRefresh={refreshOrders} /> : null}
        {tab === "pos" && staff ? <POS orders={orders} onRefresh={refreshOrders} /> : null}
        {tab === "shop" && staff && canUseStoreAdmin(staff.roles) ? <Shop staff={staff} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MobileLogin({ onLogin }: { onLogin: (staff: Staff) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setMessage("");
    setBusy(true);
    try {
      const authResponse = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!authResponse.ok) {
        setMessage("Invalid staff email or password.");
        return;
      }
      const authPayload = await authResponse.json() as { token: string };
      const sessionResponse = await fetch(`${apiUrl}/auth/session`, {
        headers: { Authorization: `Bearer ${authPayload.token}` }
      });
      if (!sessionResponse.ok) {
        setMessage("This account does not have an active Finesse staff profile.");
        return;
      }
      const sessionPayload = await sessionResponse.json() as { user: { id?: string; name: string; roles: StaffRole[] } };
      onLogin({ id: sessionPayload.user.id, name: sessionPayload.user.name, roles: sessionPayload.user.roles, token: authPayload.token });
    } catch {
      setMessage("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <Text style={styles.eyebrow}>Staff access required</Text>
      <Text style={styles.title}>Sign in</Text>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Staff login</Text>
        <Text style={styles.muted}>This app is for designers/operators, counter finalization, jobs, and POS. The kiosk and owner apps are separate.</Text>
        <Text style={styles.muted}>Staff accounts are stored in the Finesse business database.</Text>
        <View>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Staff email" autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
          {message ? <Text style={styles.warning}>{message}</Text> : null}
          <Pressable style={[styles.button, busy && styles.buttonDisabled]} disabled={busy} onPress={() => void signIn()}>
            {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Sign in</Text>}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function WaitingBanner({ tickets, staffName, onRefresh }: { tickets: CounterQueueTicket[]; staffName: string; onRefresh: () => Promise<void> }) {
  const waiting = tickets.filter((ticket) => ticket.status === "waiting" || ticket.status === "escalated");
  if (waiting.length === 0) return null;

  async function acknowledge(ticket: CounterQueueTicket) {
    await fetch(`${apiUrl}/counter/queue/${ticket.orderId}/acknowledge`, {
      method: "POST",
      headers: staffHeaders(["cashier"]),
      body: JSON.stringify({ staffName })
    });
    await onRefresh();
  }

  return (
    <View style={styles.alertPanel}>
      <Text style={styles.alertTitle}>{waiting.length} kiosk customer{waiting.length === 1 ? "" : "s"} waiting</Text>
      {waiting.slice(0, 3).map((ticket) => (
        <View style={styles.alertRow} key={ticket.id}>
          <Text style={styles.alertText}>{ticket.orderNumber} - {ticket.customerName} - {ticket.status}</Text>
          <Pressable style={styles.alertButton} onPress={() => void acknowledge(ticket)}><Text style={styles.alertButtonText}>Acknowledge</Text></Pressable>
        </View>
      ))}
    </View>
  );
}

function Counter({ orders, tickets, staffName, onRefresh }: { orders: Order[]; tickets: CounterQueueTicket[]; staffName: string; onRefresh: () => Promise<void> }) {
  const quote = useMemo(() => priceQuote([{ productId: "canvas-framed", quantity: 1, selectedOptions: { size: "a2", depth: "38mm", edge: "image", frame: "floating" } }]), []);
  const deposit = calculateRequiredDeposit(quote.total, quote.items);
  const order = orders[0];

  async function approve() {
    if (!order) return;
    await fetch(`${apiUrl}/orders/${order.id}/status`, {
      method: "POST",
      headers: staffHeaders(["designer"]),
      body: JSON.stringify({ status: "approved" })
    });
    await onRefresh();
  }

  async function sendUploadLink() {
    if (!order) return;
    await fetch(`${apiUrl}/proofs/${order.id}/send`, { method: "POST", headers: staffHeaders(["designer"]) });
    await onRefresh();
  }

  async function acknowledge(ticket: CounterQueueTicket) {
    await fetch(`${apiUrl}/counter/queue/${ticket.orderId}/acknowledge`, {
      method: "POST",
      headers: staffHeaders(["cashier"]),
      body: JSON.stringify({ staffName })
    });
    await onRefresh();
  }

  return (
    <View>
      <Text style={styles.eyebrow}>Assisted order finalization</Text>
      <Text style={styles.title}>Counter workflow</Text>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Waiting customers</Text>
        {tickets.length === 0 ? <Text style={styles.muted}>No kiosk customers waiting.</Text> : null}
        {tickets.map((ticket) => (
          <View style={styles.job} key={ticket.id}>
            <Text style={styles.tileTitle}>{ticket.position}. {ticket.orderNumber} - {ticket.customerName}</Text>
            <Text style={styles.muted}>{ticket.department.replace("_", " ")} | {ticket.status}</Text>
            <Pressable style={styles.secondaryButton} onPress={() => void acknowledge(ticket)}><Text style={styles.secondaryButtonText}>Acknowledge</Text></Pressable>
          </View>
        ))}
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Pre-order {order?.orderNumber ?? "#1042"}</Text>
        <Text style={styles.total}>Total R{quote.total.toFixed(2)} | Deposit R{deposit.amount.toFixed(2)}</Text>
        <View style={styles.row}>
          <Pressable style={styles.button} onPress={() => void approve()}><Text style={styles.buttonText}>Customer Approved</Text></Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => void sendUploadLink()}><Text style={styles.secondaryButtonText}>Send upload link</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

function MyWork({ orders, staff, onRefresh }: { orders: Order[]; staff: Staff; onRefresh: () => Promise<void> }) {
  const done = ["completed", "cancelled"];
  const claimable = ["new", "awaiting_artwork", "design_review", "approved"];
  const myId = staff.id;
  const mine = orders.filter((order) => myId && order.staffAssigneeId === myId && !done.includes(order.status));
  const unclaimed = orders.filter((order) => !order.staffAssigneeId && claimable.includes(order.status));
  const statuses = storeData.workflowColumns.map((column) => column.status);
  const [open, setOpen] = useState<string | null>(null);

  async function claim(order: Order) {
    if (!myId) return;
    await fetch(`${apiUrl}/orders/${order.id}`, {
      method: "PATCH",
      headers: staffHeaders(["designer"]),
      body: JSON.stringify({ staffAssigneeId: myId })
    });
    await onRefresh();
  }

  async function advance(order: Order) {
    const nextStatus = statuses[statuses.indexOf(order.status) + 1];
    if (!nextStatus) return;
    await fetch(`${apiUrl}/orders/${order.id}/status`, {
      method: "POST",
      headers: staffHeaders(["designer"]),
      body: JSON.stringify({ status: nextStatus })
    });
    await onRefresh();
  }

  return (
    <View>
      <Text style={styles.eyebrow}>Designers & operators</Text>
      <Text style={styles.title}>My work</Text>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>My active jobs ({mine.length})</Text>
        {!myId ? <Text style={styles.muted}>Sign in with a staff email (not a quick preset) to see jobs assigned to you.</Text> : null}
        {myId && mine.length === 0 ? <Text style={styles.muted}>No active jobs assigned to you.</Text> : null}
        {mine.map((order) => {
          const nextStatus = statuses[statuses.indexOf(order.status) + 1];
          const isOpen = open === order.id;
          return (
            <View style={styles.job} key={order.id}>
              <Pressable onPress={() => setOpen(isOpen ? null : order.id)}>
                <Text style={styles.tileTitle}>{order.orderNumber} - {order.customer.name}{order.rush ? "  ⚡" : ""}</Text>
                <Text style={styles.muted}>{order.queueName.replace("_", " ")} | {statusLabel(order.status)}</Text>
              </Pressable>
              {isOpen ? (
                <>
                  {order.activityLog[0] ? <Text style={styles.muted}>{order.activityLog[0].message}</Text> : null}
                  <View style={styles.row}>
                    {nextStatus ? (
                      <Pressable style={styles.secondaryButton} onPress={() => void advance(order)}>
                        <Text style={styles.secondaryButtonText}>Move to {statusLabel(nextStatus)}</Text>
                      </Pressable>
                    ) : null}
                    <Pressable style={styles.secondaryButton} onPress={() => void whatsappInvoice(order)}>
                      <Text style={styles.secondaryButtonText}>WhatsApp</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryButton} onPress={() => void emailInvoice(order).then((m) => Alert.alert("Invoice", m))}>
                      <Text style={styles.secondaryButtonText}>Email</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryButton} onPress={() => void shareInvoice(order)}>
                      <Text style={styles.secondaryButtonText}>Share</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          );
        })}
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Unclaimed jobs ({unclaimed.length})</Text>
        {unclaimed.length === 0 ? <Text style={styles.muted}>No unclaimed jobs right now.</Text> : null}
        {unclaimed.map((order) => (
          <View style={styles.job} key={order.id}>
            <Text style={styles.tileTitle}>{order.orderNumber} - {order.customer.name}{order.rush ? "  ⚡" : ""}</Text>
            <Text style={styles.muted}>{order.queueName.replace("_", " ")} | {statusLabel(order.status)}</Text>
            <Pressable style={[styles.button, !myId && styles.buttonDisabled]} disabled={!myId} onPress={() => void claim(order)}>
              <Text style={styles.buttonText}>Claim job</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

function Jobs({ orders, onRefresh }: { orders: Order[]; onRefresh: () => Promise<void> }) {
  const [open, setOpen] = useState<string | null>(null);
  const statuses = storeData.workflowColumns.map((column) => column.status);

  async function move(order: Order) {
    const nextStatus = statuses[statuses.indexOf(order.status) + 1];
    if (!nextStatus) return;
    await fetch(`${apiUrl}/orders/${order.id}/status`, {
      method: "POST",
      headers: staffHeaders(["designer"]),
      body: JSON.stringify({ status: nextStatus })
    });
    await onRefresh();
  }

  return (
    <View>
      <Text style={styles.eyebrow}>Production workspace</Text>
      <Text style={styles.title}>Department queues</Text>
      {storeData.workflowColumns.slice(0, 8).map((column) => {
        const columnOrders = orders.filter((order) => order.status === column.status);
        return (
          <View style={styles.panel} key={column.status}>
            <Text style={styles.panelTitle}>{column.label} ({columnOrders.length})</Text>
            {columnOrders.length === 0 ? <Text style={styles.muted}>No jobs in this stage.</Text> : null}
            {columnOrders.map((order) => {
              const isOpen = open === order.id;
              const nextStatus = statuses[statuses.indexOf(order.status) + 1];
              return (
                <View style={styles.job} key={order.id}>
                  <Pressable onPress={() => setOpen(isOpen ? null : order.id)}>
                    <Text style={styles.tileTitle}>{order.orderNumber} - {order.customer.name}{order.rush ? "  ⚡" : ""}</Text>
                    <Text style={styles.muted}>{order.queueName.replace("_", " ")} | Balance R{order.balanceDue.toFixed(2)}</Text>
                  </Pressable>
                  {isOpen && nextStatus ? (
                    <Pressable style={styles.secondaryButton} onPress={() => void move(order)}><Text style={styles.secondaryButtonText}>Move to {statusLabel(nextStatus)}</Text></Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function POS({ orders, onRefresh }: { orders: Order[]; onRefresh: () => Promise<void> }) {
  const order = orders.find((item) => item.status === "ready_for_collection") ?? orders[0];
  const [inventory, setInventory] = useState<{ id: string; sku: string; name: string; quantityOnHand: number }[]>([]);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<{ id: string; sku: string; name: string; quantityOnHand: number } | null>(null);
  const [message, setMessage] = useState("");
  const [showQuick, setShowQuick] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const filteredInventory = inventory.filter((item) => `${item.sku} ${item.name}`.toLowerCase().includes(search.toLowerCase())).slice(0, 6);

  useEffect(() => {
    void refreshInventory();
  }, []);

  // Default the amount to the outstanding balance whenever the active order changes.
  useEffect(() => {
    setAmountInput(order && order.balanceDue > 0 ? order.balanceDue.toFixed(2) : "");
  }, [order?.id, order?.balanceDue]);

  async function refreshInventory() {
    const response = await fetch(`${apiUrl}/inventory`);
    if (response.ok) {
      const payload = await response.json() as { items: { id: string; sku: string; name: string; quantityOnHand: number }[] };
      setInventory(payload.items);
    }
  }

  async function pay(method: PaymentMethod) {
    if (!order) return;
    if (order.balanceDue <= 0) {
      setMessage(`${order.orderNumber} is already settled — nothing to pay.`);
      return;
    }
    // Use the cashier-entered amount (deposit, partial, or full). Never zero/negative or over the balance.
    const amount = Math.round((Number(amountInput) || 0) * 100) / 100;
    if (amount <= 0) {
      setMessage("Enter an amount greater than zero.");
      return;
    }
    if (amount > order.balanceDue + 0.001) {
      setMessage(`Amount can't exceed the balance of R${order.balanceDue.toFixed(2)}.`);
      return;
    }
    const response = await fetch(`${apiUrl}/payments/${order.id}`, {
      method: "POST",
      headers: staffHeaders(["cashier"]),
      body: JSON.stringify({ method, amount })
    });
    if (!response.ok) {
      setMessage("Could not record the payment. Please try again.");
      return;
    }
    await fetch(`${apiUrl}/payments/${order.id}/receipt`, {
      method: "POST",
      headers: staffHeaders(["cashier"]),
      body: JSON.stringify({ channel: "sms" })
    });
    setMessage(`Payment of R${amount.toFixed(2)} recorded for ${order.orderNumber}. Receipt queued by SMS.`);
    await onRefresh();
  }

  async function quickSale() {
    const itemName = selectedItem?.name ?? search.trim();
    if (!itemName) {
      setMessage("Search or select an inventory item first.");
      return;
    }
    const response = await fetch(`${apiUrl}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "quick_sale",
        customer: { name: "Walk-in customer", mobile: "+27000000000" },
        items: [{ productId: "quick-photo-frame", quantity: 1, selectedOptions: { size: "a4" }, specialInstructions: itemName }]
      })
    });
    if (response.ok) {
      const payload = await response.json() as { order: Order };
      setMessage(`${payload.order.orderNumber} quick sale created for ${itemName}.`);
      await onRefresh();
    }
  }

  return (
    <View>
      <Text style={styles.eyebrow}>Point of sale</Text>
      <Text style={styles.title}>Payments and quick sale</Text>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Settle order {order?.orderNumber ?? ""}</Text>
        <Text style={styles.big}>R{(order?.balanceDue ?? 0).toFixed(2)}</Text>
        {order ? (
          <Text style={styles.muted}>
            Total R{order.total.toFixed(2)}
            {order.discountTotal > 0 ? ` · Discount −R${order.discountTotal.toFixed(2)}` : ""}
            {order.requiredDeposit > 0 ? ` · Deposit R${order.requiredDeposit.toFixed(2)}` : ""}
            {" · Balance due "}R{order.balanceDue.toFixed(2)}
          </Text>
        ) : null}
        <Text style={styles.muted}>Amount to charge (edit for a deposit or part-payment):</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={amountInput}
          onChangeText={(t) => setAmountInput(t.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
        />
        {order ? (
          <View style={styles.row}>
            <Pressable style={styles.secondaryButton} onPress={() => setAmountInput(order.balanceDue.toFixed(2))}><Text style={styles.secondaryButtonText}>Full balance</Text></Pressable>
            {order.requiredDeposit > 0 && order.requiredDeposit < order.balanceDue ? (
              <Pressable style={styles.secondaryButton} onPress={() => setAmountInput(order.requiredDeposit.toFixed(2))}><Text style={styles.secondaryButtonText}>Deposit R{order.requiredDeposit.toFixed(0)}</Text></Pressable>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.muted}>Charge via Yoco, cash, EFT, or SnapScan:</Text>
        <View style={styles.row}>
          {[
            ["card_yoco", "Yoco"],
            ["cash", "Cash"],
            ["eft", "EFT"],
            ["snapscan", "SnapScan"]
          ].map(([method, label]) => (
            <Pressable style={styles.secondaryButton} key={method} onPress={() => void pay(method as PaymentMethod)}><Text style={styles.secondaryButtonText}>{label}</Text></Pressable>
          ))}
        </View>
        {message ? <Text style={styles.warning}>{message}</Text> : null}
        {order ? (
          <View style={styles.row}>
            <Pressable style={styles.secondaryButton} onPress={() => void whatsappInvoice(order)}>
              <Text style={styles.secondaryButtonText}>WhatsApp</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void emailInvoice(order).then((m) => Alert.alert("Invoice", m))}>
              <Text style={styles.secondaryButtonText}>Email</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void shareInvoice(order)}>
              <Text style={styles.secondaryButtonText}>Share</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <Pressable style={styles.secondaryButton} onPress={() => setShowQuick((value) => !value)}>
        <Text style={styles.secondaryButtonText}>{showQuick ? "Close quick sale" : "Quick sale"}</Text>
      </Pressable>
      {showQuick ? (
        <View style={styles.panel}>
          <TextInput style={styles.input} value={search} onChangeText={(value) => { setSearch(value); setSelectedItem(null); }} placeholder="Search ready-made stock item" />
          {filteredInventory.map((item) => (
            <Pressable style={styles.secondaryButton} key={item.id} onPress={() => { setSelectedItem(item); setSearch(item.name); }}>
              <Text style={styles.secondaryButtonText}>{item.sku} - {item.name} - {item.quantityOnHand} left</Text>
            </Pressable>
          ))}
          <Pressable style={styles.button} onPress={() => void quickSale()}><Text style={styles.buttonText}>Create quick sale</Text></Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Shop({ staff }: { staff: { name: string; roles: StaffRole[] } }) {
  return (
    <View>
      <Text style={styles.eyebrow}>Store admin</Text>
      <Text style={styles.title}>Owner and manager controls</Text>
      <Text style={styles.muted}>{staff.name} can access these controls through {staff.roles.map((role) => role.replace("_", " ")).join(", ")} access.</Text>
      <View style={styles.grid}>
        {["Staff roles and access", "Service catalog", "Deposit and discount rules", "Inventory admin", "Daily reports", "Order adjustments"].map((item) => (
          <View style={styles.tile} key={item}>
            <Text style={styles.tileTitle}>{item}</Text>
            <Text style={styles.muted}>Synced with the Finesse API and available in the web admin portal.</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function canUseStoreAdmin(roles: StaffRole[]): boolean {
  return roles.includes("owner") || roles.includes("manager");
}

function tabsForRoles(roles: StaffRole[]): Tab[] {
  if (canUseStoreAdmin(roles)) return ["mywork", "counter", "jobs", "pos", "shop"];
  if (roles.includes("cashier")) return ["pos", "counter"];
  if (roles.some((role) => role.includes("operator") || role === "designer")) return ["mywork", "jobs", "counter"];
  return ["mywork", "counter", "pos"];
}

function staffHeaders(roles: StaffRole[]): Record<string, string> {
  return staffAccessToken
    ? { "Content-Type": "application/json", Authorization: `Bearer ${staffAccessToken}` }
    : { "Content-Type": "application/json", "x-staff-roles": roles.join(",") };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#eef2f8" },
  header: { alignItems: "center", backgroundColor: "#ffffff", borderBottomColor: "#d6deea", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 18 },
  signOut: { borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  signOutText: { color: "#0f1f3d", fontWeight: "800" },
  loadingRow: { alignItems: "center", backgroundColor: "#ffffff", flexDirection: "row", gap: 8, paddingBottom: 8, paddingHorizontal: 18 },
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { backgroundColor: "#ffffff", borderColor: "#d6deea", borderLeftColor: "#c19a3e", borderLeftWidth: 5, borderRadius: 8, borderWidth: 1, minWidth: 180, padding: 14 },
  tileTitle: { color: "#0f1f3d", fontSize: 16, fontWeight: "800" },
  muted: { color: "#5b6b86", lineHeight: 20, marginTop: 4 },
  panel: { backgroundColor: "#ffffff", borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, marginTop: 14, padding: 16 },
  panelTitle: { color: "#0f1f3d", fontSize: 18, fontWeight: "800" },
  big: { color: "#0f1f3d", fontSize: 42, fontWeight: "900", marginVertical: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  button: { alignSelf: "flex-start", alignItems: "center", backgroundColor: "#0f1f3d", borderRadius: 8, minWidth: 180, paddingHorizontal: 20, paddingVertical: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#ffffff", fontWeight: "800" },
  secondaryButton: { alignSelf: "flex-start", alignItems: "center", backgroundColor: "#ffffff", borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 12 },
  secondaryButtonText: { color: "#0f1f3d", fontWeight: "800" },
  mockup: { alignItems: "center", flexDirection: "row", gap: 14, marginTop: 14 },
  canvasPreview: { backgroundColor: "#f4d35e", borderColor: "#0f1f3d", borderWidth: 8, height: 130, width: 100 },
  previewRail: { flex: 1 },
  total: { color: "#0f1f3d", fontSize: 18, fontWeight: "800", marginTop: 12 },
  job: { borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, marginTop: 10, padding: 12 },
  input: { borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, marginTop: 12, minHeight: 44, paddingHorizontal: 10 },
  warning: { color: "#b91c1c", fontWeight: "800", marginTop: 10 },
  alertPanel: { backgroundColor: "#fff7e8", borderColor: "#d79b28", borderRadius: 8, borderWidth: 1, padding: 14 },
  alertTitle: { color: "#7a4c00", fontSize: 18, fontWeight: "900" },
  alertRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between", marginTop: 8 },
  alertText: { color: "#0f1f3d", fontWeight: "800" },
  alertButton: { backgroundColor: "#d79b28", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  alertButtonText: { color: "#ffffff", fontWeight: "900" }
});
