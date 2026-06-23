import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import * as SplashScreen from "expo-splash-screen";
import { calculateRequiredDeposit, priceQuote } from "@printflow/shared";
import { kioskData } from "./src/demo";

// Keep the native splash visible until the first screen has painted (no white flash).
void SplashScreen.preventAutoHideAsync();

type KioskStep = "categories" | "products" | "customize" | "customer" | "ticket" | "collect";
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "https://finesse-api-ogyt.onrender.com";

type KioskCat = { id: string; label: string; description: string };

const DEFAULT_CATEGORIES: KioskCat[] = [
  { id: "apparel", label: "Apparel, Sublimation & Fashion", description: "T-shirts, golf, hoodies, tracksuits, kits, school uniforms, embroidery, overalls, jumpsuits, wedding & traditional dress, trousers." },
  { id: "signage", label: "Banners & Signage", description: "X-banners, flag banners, pull-ups, corex boards, gazebos, pop-up walls." },
  { id: "promotional", label: "Branding & Promo", description: "Umbrellas, table cloths, oval boards, and branded gifts." }
];

export default function App() {
  useKeepAwake("printflow-kiosk");

  const [step, setStep] = useState<KioskStep>("categories");
  const [selectedCategory, setSelectedCategory] = useState<string>("apparel");
  const [selectedProductId, setSelectedProductId] = useState(kioskData.catalog[0]?.id ?? "apparel-tshirt");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [queuePosition, setQueuePosition] = useState(1);
  const [lookupReference, setLookupReference] = useState("");
  const [lookupResult, setLookupResult] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [checking, setChecking] = useState(false);
  const { width } = useWindowDimensions();
  // Tablet: keep content in a centered ~760px column instead of stretching edge-to-edge.
  const sidePad = width >= 768 ? Math.max(18, (width - 760) / 2) : 18;

  const [categories, setCategories] = useState<KioskCat[]>(DEFAULT_CATEGORIES);

  useEffect(() => { void SplashScreen.hideAsync(); }, []);
  useEffect(() => {
    fetch(`${apiUrl}/kiosk/categories`)
      .then((response) => response.json())
      .then((payload: { categories: KioskCat[] }) => { if (payload.categories?.length) setCategories(payload.categories); })
      .catch(() => undefined);
  }, []);
  const product = kioskData.catalog.find((item) => item.id === selectedProductId) ?? kioskData.catalog[0]!;
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  // Reset selections to each product's defaults when the product changes.
  useEffect(() => {
    setSelectedOptions(Object.fromEntries(Object.entries(product.options).map(([group, options]) => [group, options[0]?.id ?? ""])));
    setQuantity(1);
  }, [product.id]);
  const quote = useMemo(() => {
    return priceQuote([{ productId: product.id, quantity, selectedOptions }]);
  }, [product, quantity, selectedOptions]);
  const deposit = calculateRequiredDeposit(quote.total, quote.items);

  // On the ticket screen, auto-return home after a short while so the kiosk is ready for the next person.
  useEffect(() => {
    if (step !== "ticket") return undefined;
    const timer = setTimeout(() => goHome(), 25000);
    return () => clearTimeout(timer);
  }, [step]);

  // Reset everything and return to the home screen for the next customer.
  function goHome() {
    setCustomerName("");
    setCustomerMobile("");
    setQuantity(1);
    setTicketNumber("");
    setCreateError("");
    setLookupReference("");
    setLookupResult("");
    setSelectedCategory("apparel");
    setStep("categories");
  }

  async function createPreOrder() {
    setCreateError("");
    if (!customerName.trim() || !customerMobile.trim()) { setCreateError("Please enter your name and mobile number."); return; }
    setCreating(true);
    try {
      const response = await fetch(`${apiUrl}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "kiosk",
          customer: { name: customerName.trim(), mobile: customerMobile.trim() },
          items: [{ productId: product.id, quantity, selectedOptions }]
        })
      });
      if (!response.ok) {
        throw new Error(`We couldn't create your ticket (error ${response.status}). Please try again or ask a staff member.`);
      }
      const payload = await response.json();
      if (!payload.order?.orderNumber) throw new Error("No ticket was returned. Please try again.");
      setTicketNumber(payload.order.orderNumber);
      setQueuePosition(payload.counterTicket?.position ?? 1);
      setStep("ticket");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not reach the server. Please ask a staff member.");
    } finally {
      setCreating(false);
    }
  }

  async function lookupOrder() {
    setChecking(true);
    try {
    const response = await fetch(`${apiUrl}/orders/lookup/${encodeURIComponent(lookupReference)}`);
    if (!response.ok) {
      setLookupResult("Order not found. Please check the reference or ask the counter team.");
      return;
    }
    const payload = await response.json();
    const order = payload.order;
    if (order.status === "ready_for_collection") {
      setLookupResult(`Great news! ${order.orderNumber} is ready. Please proceed to the counter for collection.${order.balanceDue > 0 ? ` Balance due R${order.balanceDue.toFixed(2)}.` : ""}`);
    } else if (order.status === "completed") {
      setLookupResult(`${order.orderNumber} has been completed and collected.`);
    } else {
      const eta = order.dueAt ? new Date(order.dueAt).toLocaleString("en-ZA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null;
      setLookupResult(`${order.orderNumber} is ${String(order.status).replaceAll("_", " ")}.${eta ? ` Estimated ready: ${eta}.` : ""} We'll SMS you as soon as it's ready.${order.balanceDue > 0 ? ` Balance R${order.balanceDue.toFixed(2)}.` : ""}`);
    }
    } finally {
      setChecking(false);
    }
  }

  function goBack() {
    if (step === "products") setStep("categories");
    else if (step === "customize") setStep("products");
    else if (step === "customer") setStep("customize");
    else setStep("categories");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { paddingHorizontal: sidePad }]}>
        <View style={styles.headerRow}>
          {step !== "categories" ? (
            <Pressable style={styles.backBtn} onPress={goBack}><Text style={styles.backBtnText}>‹ Back</Text></Pressable>
          ) : null}
          <View style={styles.flex1}>
            <Text style={styles.logo}>Finesse Kiosk</Text>
            <Text style={styles.subtle}>Public customer entrance experience</Text>
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.page, { paddingHorizontal: sidePad }]}>
        {step === "categories" ? (
          <View>
            <Text style={styles.eyebrow}>Welcome</Text>
            <Text style={styles.title}>What can we help you print today?</Text>
            <View style={styles.grid}>
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => {
                    setSelectedCategory(category.id);
                    const firstProduct = kioskData.catalog.find((item) => item.category === category.id);
                    if (firstProduct) setSelectedProductId(firstProduct.id);
                    setStep("products");
                  }}
                  style={styles.tile}
                >
                  <Text style={styles.tileTitle}>{category.label}</Text>
                  <Text style={styles.muted}>{category.description}</Text>
                </Pressable>
              ))}
              <Pressable style={[styles.tile, styles.collectTile]} onPress={() => setStep("collect")}>
                <Text style={styles.tileTitle}>Collect Existing Order</Text>
                <Text style={styles.muted}>Check order status by order number or mobile number.</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {step === "products" ? (
          <View>
            <Text style={styles.eyebrow}>Choose product</Text>
            <Text style={styles.title}>{categories.find((item) => item.id === selectedCategory)?.label}</Text>
            <View style={styles.grid}>
              {kioskData.catalog.filter((item) => item.category === selectedCategory).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setSelectedProductId(item.id);
                    setStep("customize");
                  }}
                  style={styles.tile}
                >
                  <Text style={styles.tileTitle}>{item.name}</Text>
                  <Text style={styles.muted}>{item.description}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {step === "customize" ? (
          <View>
            <Text style={styles.eyebrow}>Guided customization</Text>
            <Text style={styles.title}>{product.name}</Text>
            <View style={styles.panel}>
              {Object.keys(product.options).length === 0 ? <Text style={styles.muted}>No options to choose — continue to the next step.</Text> : null}
              {Object.entries(product.options).map(([group, options]) => (
                <View key={group} style={styles.optionBlock}>
                  <Text style={styles.panelTitle}>{group.replace("_", " ")}</Text>
                  <View style={styles.row}>
                    {options.map((option) => {
                      const selected = selectedOptions[group] === option.id;
                      return (
                        <Pressable
                          key={option.id}
                          style={[styles.optionPill, selected && styles.optionPillActive]}
                          onPress={() => setSelectedOptions((prev) => ({ ...prev, [group]: option.id }))}
                        >
                          <Text style={[styles.optionText, selected && styles.optionTextActive]}>{option.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
              <View style={styles.optionBlock}>
                <Text style={styles.panelTitle}>Quantity</Text>
                <View style={styles.qtyRow}>
                  <Pressable style={styles.qtyBtn} onPress={() => setQuantity((q) => Math.max(1, q - 1))}><Text style={styles.qtyBtnText}>–</Text></Pressable>
                  <TextInput
                    style={styles.qtyInput}
                    keyboardType="number-pad"
                    value={String(quantity)}
                    onChangeText={(t) => setQuantity(Math.max(1, Number(t.replace(/[^0-9]/g, "")) || 1))}
                  />
                  <Pressable style={styles.qtyBtn} onPress={() => setQuantity((q) => q + 1)}><Text style={styles.qtyBtnText}>+</Text></Pressable>
                </View>
              </View>
              <Text style={styles.total}>Estimate R{quote.total.toFixed(2)} | Deposit R{deposit.amount.toFixed(2)}</Text>
              <Pressable style={styles.button} onPress={() => setStep("customer")}><Text style={styles.buttonText}>Continue</Text></Pressable>
            </View>
          </View>
        ) : null}

        {step === "customer" ? (
          <View>
            <Text style={styles.eyebrow}>Paperless ticket</Text>
            <Text style={styles.title}>Where should we send your order link?</Text>
            <View style={styles.panel}>
              <TextInput style={styles.input} placeholder="Mobile number" keyboardType="phone-pad" value={customerMobile} onChangeText={setCustomerMobile} />
              <TextInput style={styles.input} placeholder="Name" value={customerName} onChangeText={setCustomerName} />
              <Text style={styles.muted}>We will send your queue number and secure artwork upload link by SMS.</Text>
              <Pressable style={[styles.button, creating && styles.buttonDisabled]} disabled={creating} onPress={() => void createPreOrder()}>
                {creating ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Create pre-order</Text>}
              </Pressable>
              {createError ? <Text style={styles.errorText}>{createError}</Text> : null}
            </View>
          </View>
        ) : null}

        {step === "ticket" ? (
          <View>
            <Text style={styles.eyebrow}>Queue ticket</Text>
            <Text style={styles.title}>Thank you</Text>
            <View style={styles.panel}>
              <Text style={styles.big}>{ticketNumber}</Text>
              <Text style={styles.panelTitle}>Please wait, a consultant will call you shortly.</Text>
              <Text style={styles.muted}>Your queue position is {queuePosition}. Staff have been alerted. If the counter is unattended, this ticket escalates to the owner or manager.</Text>
              <Pressable style={styles.secondaryButton} onPress={goHome}><Text style={styles.secondaryButtonText}>Done — back to start</Text></Pressable>
              <Text style={styles.muted}>This screen returns to the start shortly for the next customer.</Text>
            </View>
          </View>
        ) : null}

        {step === "collect" ? (
          <View>
            <Text style={styles.eyebrow}>Fast collection</Text>
            <Text style={styles.title}>Check order status</Text>
            <View style={styles.panel}>
              <TextInput style={styles.input} placeholder="Order number or mobile number" value={lookupReference} onChangeText={setLookupReference} />
              <View style={styles.statusBox}>
                <Text style={styles.panelTitle}>Order lookup</Text>
                <Text style={styles.muted}>{lookupResult || "Enter a reference and tap Check status."}</Text>
              </View>
              <Pressable style={[styles.button, checking && styles.buttonDisabled]} disabled={checking} onPress={() => void lookupOrder()}>
                {checking ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Check status</Text>}
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#eef2f8" },
  header: { backgroundColor: "#ffffff", borderBottomColor: "#d6deea", borderBottomWidth: 1, padding: 18 },
  headerRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  flex1: { flex: 1 },
  backBtn: { borderColor: "#0f1f3d", borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  backBtnText: { color: "#0f1f3d", fontWeight: "800" },
  logo: { color: "#0f1f3d", fontSize: 26, fontWeight: "900" },
  subtle: { color: "#5b6b86", marginTop: 4 },
  page: { gap: 16, padding: 18 },
  eyebrow: { color: "#9a7b22", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  title: { color: "#0f1f3d", fontSize: 34, fontWeight: "900", marginBottom: 14, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { backgroundColor: "#ffffff", borderColor: "#d6deea", borderLeftColor: "#c19a3e", borderLeftWidth: 6, borderRadius: 8, borderWidth: 1, minHeight: 150, minWidth: 210, padding: 16 },
  collectTile: { borderLeftColor: "#0f1f3d" },
  tileTitle: { color: "#0f1f3d", fontSize: 18, fontWeight: "900" },
  muted: { color: "#5b6b86", lineHeight: 20, marginTop: 6 },
  panel: { backgroundColor: "#ffffff", borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, marginTop: 14, padding: 16 },
  panelTitle: { color: "#0f1f3d", fontSize: 18, fontWeight: "900" },
  optionBlock: { marginBottom: 14 },
  optionPill: { backgroundColor: "#f3ecd9", borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  optionPillActive: { backgroundColor: "#c19a3e", borderColor: "#c19a3e" },
  optionText: { color: "#0f1f3d", fontWeight: "800" },
  optionTextActive: { color: "#ffffff" },
  total: { color: "#0f1f3d", fontSize: 18, fontWeight: "900", marginTop: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  button: { alignSelf: "center", alignItems: "center", backgroundColor: "#0f1f3d", borderRadius: 8, minHeight: 44, minWidth: 240, justifyContent: "center", marginTop: 14, paddingHorizontal: 28, paddingVertical: 12 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#ffffff", fontWeight: "900" },
  secondaryButton: { alignSelf: "center", alignItems: "center", backgroundColor: "#ffffff", borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, minWidth: 240, marginTop: 14, paddingHorizontal: 28, paddingVertical: 12 },
  secondaryButtonText: { color: "#0f1f3d", fontWeight: "900" },
  input: { borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, marginTop: 12, minHeight: 46, paddingHorizontal: 12 },
  qtyRow: { alignItems: "center", flexDirection: "row", gap: 14, marginTop: 8 },
  qtyBtn: { alignItems: "center", backgroundColor: "#0f1f3d", borderRadius: 8, height: 44, justifyContent: "center", width: 44 },
  qtyBtnText: { color: "#ffffff", fontSize: 22, fontWeight: "900" },
  qtyInput: { borderColor: "#d6deea", borderRadius: 8, borderWidth: 1, fontSize: 18, fontWeight: "800", minHeight: 46, minWidth: 70, paddingHorizontal: 12, textAlign: "center" },
  big: { color: "#0f1f3d", fontSize: 56, fontWeight: "900", marginVertical: 8 },
  statusBox: { backgroundColor: "#f3ecd9", borderRadius: 8, marginTop: 12, padding: 12 },
  errorText: { color: "#b3261e", fontWeight: "700", marginTop: 10, textAlign: "center" }
});
