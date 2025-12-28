// src/pages/OrdersPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getOrdersPage,
  updateTags,
  getOrderItems,
  setDeliverBy,
  setNoteLocal,
} from "../lib/api.js";
import Badge from "../components/Badge.jsx";
import {
  RefreshCw,
  ChevronRight,
  Plus,
  Printer,
  CalendarDays,
} from "lucide-react";
import { Card, Input, Select, Button, Muted } from "../components/ui.jsx";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
const PREVIEW_DESKTOP = 50;
const PREVIEW_MOBILE = 50;
/* =========================
   Helpers
   ========================= */
function cleanText(v) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.replace(/^string\s*:\s*/i, "").trim(); // removes "String:" / "string:"
}
function getLineTotal(it) {
  const candidates = [
    it.LINE_TOTAL,
    it.line_total,
    it.TOTAL,
    it.total,
    it.total_price,
    it.line_price,
    it.FINAL_LINE_PRICE,
    it.final_line_price,
  ];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }

  // fallback: unit * qty (if unit exists)
  const unit = Number(it.UNIT_PRICE ?? it.unit_price ?? it.PRICE ?? it.price);
  const qty = Number(it.QUANTITY ?? it.quantity ?? 1);
  if (Number.isFinite(unit) && Number.isFinite(qty)) return unit * qty;

  return null;
}

function getPreviewItems(order, productsByOrder) {
  // const inline = getProductsPreview(order);
  // if (Array.isArray(inline) && inline.length) return inline;

  const cached = productsByOrder?.[String(order.order_id)];
  if (Array.isArray(cached) && cached.length) return cached;
  const inline = getProductsPreview(order);
  if (Array.isArray(inline) && inline.length) return inline;
  return [];
}

function getCity(o) {
  const v =
    o.ship_city ||
    o.shipping_city ||
    o.city ||
    (o.ship_address && o.ship_address.city) ||
    "";
  return cleanText(v) || "-";
}

function getMethod(o) {
  return (
    o.shipping_method ||
    o.shipping_title ||
    o.shipping_line_title ||
    o.method ||
    "-"
  );
}

function getShopifyNote(o) {
  return o.note || o.order_note || o.shopify_note || "";
}

// IMPORTANT: backend should return preview items for speed
function getProductsPreview(o) {
  const arr =
    o.products ||
    o.items ||
    o.line_items ||
    o.products_preview ||
    o.items_preview ||
    [];
  return Array.isArray(arr) ? arr : [];
}

function getSource(o) {
  return o.source_name || o.source || o.order_source || "-";
}

function parseTags(tagsStr) {
  if (!tagsStr) return [];
  return String(tagsStr)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function nonStatusTags(order) {
  const tags = parseTags(order?.tags);
  const banned = new Set(["processing", "shipped", "complete"]);
  return tags.filter((t) => !banned.has(String(t).toLowerCase()));
}

function hasTag(order, tag) {
  const tags = parseTags(order?.tags);
  return tags.some((t) => t.toLowerCase() === String(tag).toLowerCase());
}

function canAddTag(order, tag) {
  const t = String(tag).toLowerCase();
  const hasProcessing = hasTag(order, "Processing");
  const hasShipped = hasTag(order, "Shipped");

  // rules:
  // - Shipped only after Processing
  // - Complete only after Shipped
  if (t === "shipped") return hasProcessing && !hasTag(order, "Shipped");
  if (t === "complete") return hasShipped && !hasTag(order, "Complete");
  if (t === "processing") return !hasTag(order, "Processing");
  return true;
}

function money(v, c) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "-";
  return `${n.toFixed(2)} ${c || ""}`.trim();
}

function statusLabel(o) {
  const tags = parseTags(o?.tags).map((t) => t.toLowerCase());
  if (tags.includes("complete")) return "Complete";
  if (tags.includes("shipped")) return "Shipped";
  if (tags.includes("processing")) return "Processing";
  return "Pending";
}

function StatusPill({ order }) {
  const s = statusLabel(order);

  const tone =
    s === "Complete"
      ? { bg: "16 185 129", border: "16 185 129" }
      : s === "Shipped"
      ? { bg: "56 189 248", border: "56 189 248" }
      : s === "Processing"
      ? { bg: "245 158 11", border: "245 158 11" }
      : { bg: "100 116 139", border: "100 116 139" };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-extrabold"
      style={{
        background: `rgba(${tone.bg}, 0.12)`,
        borderColor: `rgba(${tone.border}, 0.22)`,
        color: "rgb(var(--text))",
      }}
    >
      {s}
    </span>
  );
}

function useDebouncedValue(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function clampText(s, max = 120) {
  const str = String(s || "");
  if (!str) return "";
  return str.length > max ? str.slice(0, max).trim() + "…" : str;
}

/* =========================
   Toolbar
   ========================= */
function Toolbar({
  shop,
  setShop,
  status,
  setStatus,
  search,
  setSearch,
  onReload,
  loading,
}) {
  return (
    <Card className="mt-4 p-4 print:hidden">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_320px_140px] md:items-end">
        <div>
          <div className="text-sm font-black">Shop Domain</div>
          <Input
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            placeholder="my-store.myshopify.com"
            className="mt-2"
          />
        </div>

        <div>
          <div className="text-sm font-black">Status</div>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-2"
          >
            <option value="all">All</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="complete">Complete</option>
          </Select>
        </div>

        <div>
          <div className="text-sm font-black">Search</div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="order name, email, name, id..."
            className="mt-2"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onReload}
            disabled={loading}
            variant="soft"
            className="w-full"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Sync
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* =========================
   Desktop Table
   ========================= */
function DesktopTable({
  items,
  shop,
  onSetTag,
  busyKey,
  onPrint,
  onOpenSetDate,
  productsByOrder,
}) {
  return (
    <Card className="hidden md:block mt-4 overflow-hidden">
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: "rgb(var(--border))" }}
      >
        <div className="font-black">Orders</div>
        <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
          {items.length} shown
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead style={{ color: "rgb(var(--muted))" }}>
            <tr style={{ borderBottom: "1px solid rgb(var(--border))" }}>
              <th className="text-left p-3">Order</th>
              <th className="text-left p-3">Tags</th>
              <th className="text-left p-3">Products</th>
              <th className="text-left p-3">City</th>
              <th className="text-left p-3">Method / Notes</th>
              <th className="text-left p-3">Total</th>
              <th className="text-left p-3">Source</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((o) => {
              const key = `${o.order_id}`;

              const procOn = hasTag(o, "Processing");
              const shipOn = hasTag(o, "Shipped");
              const compOn = hasTag(o, "Complete");

              const prods = getPreviewItems(o, productsByOrder);

              const city = getCity(o);
              const method = getMethod(o);
              const note = getShopifyNote(o);
              const source = getSource(o);

              return (
                <tr
                  key={key}
                  style={{ borderBottom: "1px solid rgb(var(--border))" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {/* Order */}
                  <td className="p-3">
                    <div className="font-extrabold">
                      {o.order_name || o.order_id}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      {o.ship_name ? `${o.ship_name} • ` : ""}
                      {o.order_id}
                    </div>
                  </td>

                  {/* Tags */}
                  <td className="p-3">
                    <div className="mb-2">
                      <StatusPill order={o} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() =>
                          onSetTag(o, procOn ? "remove" : "add", "Processing")
                        }
                        disabled={busyKey === key}
                        variant="soft"
                        className="px-3 py-1.5 text-xs"
                      >
                        {procOn ? "Remove Processing" : "+ Processing"}
                      </Button>

                      <Button
                        onClick={() =>
                          onSetTag(o, shipOn ? "remove" : "add", "Shipped")
                        }
                        disabled={
                          busyKey === key ||
                          (!shipOn && !canAddTag(o, "Shipped"))
                        }
                        variant="soft"
                        className="px-3 py-1.5 text-xs"
                        title={
                          !shipOn && !canAddTag(o, "Shipped")
                            ? "Requires Processing"
                            : ""
                        }
                      >
                        {shipOn ? "Remove Shipped" : "+ Shipped"}
                      </Button>

                      <Button
                        onClick={() =>
                          onSetTag(o, compOn ? "remove" : "add", "Complete")
                        }
                        disabled={
                          busyKey === key ||
                          (!compOn && !canAddTag(o, "Complete"))
                        }
                        variant="soft"
                        className="px-3 py-1.5 text-xs"
                        title={
                          !compOn && !canAddTag(o, "Complete")
                            ? "Requires Shipped"
                            : ""
                        }
                      >
                        {compOn ? "Remove Complete" : "+ Complete"}
                      </Button>
                    </div>
                  </td>

                  {/* Products */}
                  <td className="p-3">
                    {prods && prods.length ? (
                      <div className="space-y-2">
                        {prods.slice(0, PREVIEW_DESKTOP).map((it, idx) => {
                          const img =
                            it.IMAGE || it.image || it.product_image || "";
                          const title =
                            it.TITLE || it.title || it.name || "Item";
                          const qty = it.QUANTITY ?? it.quantity ?? 1;

                          const lineTotal = getLineTotal(it);
                          const totalText =
                            lineTotal != null
                              ? ` • Total: ${money(lineTotal, o.currency)}`
                              : "";

                          const variant =
                            it.VARIANT_TITLE || it.variant_title || "";

                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <div
                                className="w-10 h-10 rounded-lg overflow-hidden border shrink-0"
                                style={{
                                  borderColor: "rgb(var(--border))",
                                  background: "rgb(var(--bg))",
                                }}
                              >
                                {img ? (
                                  <img
                                    src={img}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : null}
                              </div>

                              <div className="min-w-0">
                                <div className="font-bold truncate">
                                  {title}
                                </div>
                                <div
                                  className="text-xs"
                                  style={{ color: "rgb(var(--muted))" }}
                                >
                                  {variant ? `${variant} • ` : ""}x{qty}
                                  {totalText}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {prods.length > PREVIEW_DESKTOP ? (
                          <div
                            className="text-xs"
                            style={{ color: "rgb(var(--muted))" }}
                          >
                            +{prods.length - PREVIEW_DESKTOP} more
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div
                        className="text-xs"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        —
                      </div>
                    )}
                  </td>

                  {/* City */}
                  <td className="p-3">
                    <div className="font-bold">{city}</div>
                  </td>

                  {/* Method / Notes */}
                  <td className="p-3">
                    <div className="font-bold">{method}</div>
                    <div
                      className="text-xs mt-1"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      {note ? clampText(note, 120) : "—"}
                    </div>
                  </td>

                  {/* Total */}
                  <td className="p-3 font-extrabold">
                    {money(o.total, o.currency)}
                  </td>

                  {/* Source */}
                  <td className="p-3">
                    <div className="text-sm">{source}</div>
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button
                        onClick={() => onPrint(o)}
                        disabled={busyKey === key}
                        variant="soft"
                        className="px-3 py-1.5 text-xs"
                        title="Print (auto set Processing if pending)"
                      >
                        <Printer size={14} />
                        Print
                      </Button>

                      <Button
                        onClick={() => onOpenSetDate(o)}
                        disabled={busyKey === key}
                        variant="soft"
                        className="px-3 py-1.5 text-xs"
                        title="Set deliver-by date + local note"
                      >
                        <CalendarDays size={14} />
                        Set date
                      </Button>

                      <Link
                        to={`/orders/${o.order_id}?shop=${encodeURIComponent(
                          shop
                        )}`}
                        className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition"
                        style={{
                          borderColor: "rgb(var(--border))",
                          background: "rgb(var(--bg))",
                          color: "rgb(var(--text))",
                        }}
                      >
                        View <ChevronRight size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}

            {items.length === 0 ? (
              <tr>
                <td
                  className="p-6"
                  colSpan={8}
                  style={{ color: "rgb(var(--muted))" }}
                >
                  No orders found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* =========================
   Mobile Cards
   ========================= */
function MobileCards({
  items,
  shop,
  onSetTag,
  busyKey,
  onPrint,
  onOpenSetDate,
  productsByOrder,
}) {
  return (
    <div className="md:hidden mt-4 space-y-3 pb-24">
      {items.map((o) => {
        const key = `${o.order_id}`;

        const procOn = hasTag(o, "Processing");
        const shipOn = hasTag(o, "Shipped");
        const compOn = hasTag(o, "Complete");

        const prods = getPreviewItems(o, productsByOrder);

        const city = getCity(o);
        const method = getMethod(o);
        const note = getShopifyNote(o);
        const source = getSource(o);

        // show non-status tags on mobile (clean)
        const extraTags = nonStatusTags(o);

        return (
          <Card key={key} className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-black truncate">
                  {o.order_name || o.order_id}
                </div>

                <div
                  className="mt-1 text-xs"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  {o.ship_name || "-"} • {city} • {source}
                </div>

                <div className="mt-2">
                  <StatusPill order={o} />
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-extrabold">
                  {money(o.total, o.currency)}
                </div>
                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  {method}
                </div>
              </div>
            </div>

            {/* Products preview */}
            {prods && prods.length ? (
              <div className="mt-3 space-y-2">
                {prods.slice(0, PREVIEW_MOBILE).map((it, idx) => {
                  const img = it.IMAGE || it.image || it.product_image || "";
                  const title = it.TITLE || it.title || it.name || "Item";
                  const qty = it.QUANTITY ?? it.quantity ?? 1;

                  const lineTotal = getLineTotal(it);
                  const totalText =
                    lineTotal != null
                      ? ` • Total: ${money(lineTotal, o.currency)}`
                      : "";

                  const variant = it.VARIANT_TITLE || it.variant_title || "";

                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-lg overflow-hidden border shrink-0"
                        style={{
                          borderColor: "rgb(var(--border))",
                          background: "rgb(var(--bg))",
                        }}
                      >
                        {img ? (
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold truncate">{title}</div>
                        <div
                          className="text-xs"
                          style={{ color: "rgb(var(--muted))" }}
                        >
                          {variant ? `${variant} • ` : ""}x{qty}
                          {totalText}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {prods.length > PREVIEW_MOBILE ? (
                  <div
                    className="text-xs"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    {prods.length > PREVIEW_MOBILE
                      ? (() => {
                          const hidden = prods.slice(PREVIEW_MOBILE);
                          const extraCount = hidden.length;
                          const extraSum = hidden.reduce((sum, it) => {
                            const v = getLineTotal(it);
                            return sum + (Number.isFinite(v) ? v : 0);
                          }, 0);

                          return (
                            <div
                              className="text-xs"
                              style={{ color: "rgb(var(--muted))" }}
                            >
                              +{extraCount} more
                              {extraSum > 0
                                ? ` • Extra: ${money(extraSum, o.currency)}`
                                : ""}
                            </div>
                          );
                        })()
                      : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Shopify Note */}
            <div
              className="mt-3 text-xs"
              style={{ color: "rgb(var(--muted))" }}
            >
              {note ? clampText(note, 120) : "—"}
            </div>

            {/* Extra tags */}
            {extraTags.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {extraTags.slice(0, 6).map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
                {extraTags.length > 6 ? (
                  <Badge>+{extraTags.length - 6}</Badge>
                ) : null}
              </div>
            ) : null}

            {/* Tag toggles */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                onClick={() =>
                  onSetTag(o, procOn ? "remove" : "add", "Processing")
                }
                disabled={busyKey === key}
                variant="soft"
                className="text-xs py-2"
              >
                {procOn ? "Remove Processing" : "+ Processing"}
              </Button>

              <Button
                onClick={() =>
                  onSetTag(o, shipOn ? "remove" : "add", "Shipped")
                }
                disabled={
                  busyKey === key || (!shipOn && !canAddTag(o, "Shipped"))
                }
                variant="soft"
                className="text-xs py-2"
                title={
                  !shipOn && !canAddTag(o, "Shipped")
                    ? "Requires Processing"
                    : ""
                }
              >
                {shipOn ? "Remove Shipped" : "+ Shipped"}
              </Button>

              <Button
                onClick={() =>
                  onSetTag(o, compOn ? "remove" : "add", "Complete")
                }
                disabled={
                  busyKey === key || (!compOn && !canAddTag(o, "Complete"))
                }
                variant="soft"
                className="text-xs py-2"
                title={
                  !compOn && !canAddTag(o, "Complete") ? "Requires Shipped" : ""
                }
              >
                {compOn ? "Remove Complete" : "+ Complete"}
              </Button>

              <Link
                to={`/orders/${o.order_id}?shop=${encodeURIComponent(shop)}`}
                className="rounded-xl border px-3 py-2 text-center text-xs font-extrabold transition"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgb(var(--bg))",
                  color: "rgb(var(--text))",
                }}
              >
                View
              </Link>
            </div>

            {/* Actions */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                onClick={() => onPrint(o)}
                disabled={busyKey === key}
                variant="soft"
                className="text-xs py-2"
              >
                <Printer size={14} />
                Print
              </Button>

              <Button
                onClick={() => onOpenSetDate(o)}
                disabled={busyKey === key}
                variant="soft"
                className="text-xs py-2"
              >
                <CalendarDays size={14} />
                Set date
              </Button>
            </div>
          </Card>
        );
      })}

      {items.length === 0 ? (
        <Card className="p-6">
          <div style={{ color: "rgb(var(--muted))" }}>No orders found.</div>
        </Card>
      ) : null}
    </div>
  );
}

/* =========================
   Page
   ========================= */
export default function OrdersPage() {
  const [productsByOrder, setProductsByOrder] = useState({});
  const productsLoadingRef = useRef(false);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [shop, setShop] = useState(() => {
    const fromUrl = searchParams.get("shop");
    const saved = localStorage.getItem("shop_domain");
    return (fromUrl || saved || "").trim();
  });

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  const [busyKey, setBusyKey] = useState("");
  const [tab, setTab] = useState("active"); // active | history
  const [errorMsg, setErrorMsg] = useState("");

  // Set date modal
  const [dateOpen, setDateOpen] = useState(false);
  const [dateOrder, setDateOrder] = useState(null);
  const [deliverBy, setDeliverBy] = useState("");
  const [localNote, setLocalNote] = useState("");

  const shopKey = useMemo(() => shop.trim().toLowerCase(), [shop]);
  const canLoad = useMemo(() => !!shopKey, [shopKey]);

  useEffect(() => {
    localStorage.setItem("shop_domain", shop.trim());
  }, [shop]);

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    dataUpdatedAt,
  } = useInfiniteQuery({
    queryKey: ["orders-page", shopKey, status, debouncedSearch],
    enabled: canLoad,
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      getOrdersPage({
        shop: shopKey,
        status,
        limit: 50,
        cursor: pageParam,
        search: debouncedSearch,
      }),
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  const items = useMemo(() => {
    const pages = data?.pages || [];
    return pages.flatMap((p) => p.items || []);
  }, [data]);

  const filteredItems = useMemo(() => {
    const arr = items || [];
    if (tab === "history") return arr.filter((o) => hasTag(o, "Complete"));
    return arr.filter((o) => !hasTag(o, "Complete"));
  }, [items, tab]);

  const loading = isLoading || isFetching || isFetchingNextPage;
  async function fetchProductsPreviewForOrders(orders, batchSize = 6) {
    const out = {}; // { [orderId]: items[] }

    for (let i = 0; i < orders.length; i += batchSize) {
      const chunk = orders.slice(i, i + batchSize);

      const res = await Promise.all(
        chunk.map(async (o) => {
          const orderId = String(o.order_id);
          const arr = await getOrderItems({ shop: shopKey, order_id: orderId });
          // keep only first 2 for preview (fast)
          return [orderId, Array.isArray(arr) ? arr : []];
        })
      );

      for (const [orderId, items] of res) out[orderId] = items;
    }

    return out;
  }
  useEffect(() => {
    if (!canLoad) return;
    if (productsLoadingRef.current) return;

    // only fetch preview for first 20 shown orders (avoid hammering)
    const target = filteredItems.slice(0, 20);

    const missing = target.filter((o) => {
      const id = String(o.order_id);
      const hasInline = (getProductsPreview(o) || []).length > 0;
      const hasCached =
        Array.isArray(productsByOrder[id]) && productsByOrder[id].length > 0;
      return !hasInline && !hasCached;
    });

    if (missing.length === 0) return;

    productsLoadingRef.current = true;

    (async () => {
      try {
        const map = await fetchProductsPreviewForOrders(missing, 6);
        setProductsByOrder((prev) => ({ ...prev, ...map }));
      } catch (e) {
        // ignore (don’t break orders page)
        console.warn("preview fetch failed:", e);
      } finally {
        productsLoadingRef.current = false;
      }
    })();
  }, [canLoad, shopKey, filteredItems, productsByOrder]);

  async function setTag(order, action, tag) {
    const key = `${order.order_id}`;
    setBusyKey(key);
    setErrorMsg("");

    try {
      const r = await updateTags({
        shop: shopKey,
        orderId: String(order.order_id),
        action,
        tag,
      });

      const newTagsStr = r?.tags_str;

      // Update cache instantly (current query)
      queryClient.setQueryData(
        ["orders-page", shopKey, status, debouncedSearch],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((pg) => ({
              ...pg,
              items: (pg.items || []).map((x) =>
                String(x.order_id) === String(order.order_id)
                  ? { ...x, tags: newTagsStr || x.tags }
                  : x
              ),
            })),
          };
        }
      );

      // Invalidate all orders-page for this shop (handles moving tabs/status etc)
      queryClient.invalidateQueries({
        queryKey: ["orders-page", shopKey],
        exact: false,
      });
    } catch (e) {
      setErrorMsg(String(e?.message || e));
    } finally {
      setBusyKey("");
    }
  }

  // ✅ Print: auto set Processing if still Pending, then open popup print mode
  async function handlePrint(order) {
    const isPending =
      !hasTag(order, "Processing") &&
      !hasTag(order, "Shipped") &&
      !hasTag(order, "Complete");

    if (isPending) {
      await setTag(order, "add", "Processing");
    }

    const url = `/orders/${order.order_id}?shop=${encodeURIComponent(
      shopKey
    )}&print=1`;

    const w = window.open(
      url,
      "print",
      "noopener,noreferrer,width=980,height=900"
    );
    if (w) w.focus();
  }

  function openSetDate(order) {
    setDateOrder(order);
    setDeliverBy("");
    setLocalNote("");
    setDateOpen(true);
  }

  async function saveSetDate() {
    if (!dateOrder) return;
    setErrorMsg("");

    try {
      const orderId = String(dateOrder.order_id);

      if (deliverBy) {
        await setDeliverBy({ shop: shopKey, orderId, deliverBy });
      }
      await setNoteLocal({ shop: shopKey, orderId, noteLocal: localNote });

      setDateOpen(false);
      setDateOrder(null);

      queryClient.invalidateQueries({
        queryKey: ["orders-page", shopKey],
        exact: false,
      });
    } catch (e) {
      setErrorMsg(String(e?.message || e));
    }
  }

  return (
    <div>
      <div className="pt-4 md:pt-6">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <div className="text-2xl md:text-3xl font-black">Orders</div>
            {canLoad ? (
              <div
                className="mt-1 text-xs"
                style={{ color: "rgb(var(--muted))" }}
              >
                {isFetching
                  ? "Updating…"
                  : `Updated: ${new Date(dataUpdatedAt).toLocaleTimeString()}`}
              </div>
            ) : null}
          </div>

          <div className="hidden md:block">
            <Button
              onClick={refetch}
              disabled={!canLoad || loading}
              variant="soft"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Sync
            </Button>
          </div>
        </div>

        <Toolbar
          shop={shop}
          setShop={setShop}
          status={status}
          setStatus={setStatus}
          search={search}
          setSearch={setSearch}
          onReload={refetch}
          loading={!canLoad || loading}
        />

        {!canLoad ? (
          <Card className="mt-4 p-6 print:hidden">
            <Muted>
              Enter your <span className="font-black">shop domain</span> to load
              orders.
            </Muted>
          </Card>
        ) : (
          <>
            {errorMsg ? (
              <Card className="mt-4 p-4 print:hidden">
                <div className="font-black">Error</div>
                <div
                  className="text-sm mt-1"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  {errorMsg}
                </div>
              </Card>
            ) : null}

            {/* Tabs */}
            <Card className="mt-4 p-2 print:hidden">
              <div className="flex gap-2">
                <Button
                  variant="soft"
                  onClick={() => setTab("active")}
                  className="flex-1"
                  style={{ opacity: tab === "active" ? 1 : 0.55 }}
                >
                  Active
                </Button>
                <Button
                  variant="soft"
                  onClick={() => setTab("history")}
                  className="flex-1"
                  style={{ opacity: tab === "history" ? 1 : 0.55 }}
                >
                  History
                </Button>
              </div>
            </Card>

            <DesktopTable
              items={filteredItems}
              shop={shopKey}
              onSetTag={setTag}
              busyKey={busyKey}
              onPrint={handlePrint}
              onOpenSetDate={openSetDate}
              productsByOrder={productsByOrder}
            />

            <MobileCards
              items={filteredItems}
              shop={shopKey}
              onSetTag={setTag}
              busyKey={busyKey}
              onPrint={handlePrint}
              onOpenSetDate={openSetDate}
              productsByOrder={productsByOrder}
            />

            {/* Sticky Mobile Actions */}
            <div
              className="md:hidden fixed left-0 right-0 z-30 px-3 pb-3 print:hidden"
              style={{ bottom: 72 }}
            >
              <div
                className="rounded-2xl border p-3 backdrop-blur"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgba(var(--card-rgb), 0.85)",
                }}
              >
                <div className="flex gap-2">
                  <Button
                    onClick={refetch}
                    disabled={!canLoad || loading}
                    variant="soft"
                    className="flex-1"
                  >
                    <RefreshCw
                      size={16}
                      className={loading ? "animate-spin" : ""}
                    />
                    Sync
                  </Button>

                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || loading}
                    variant="soft"
                    className="flex-1"
                  >
                    <Plus size={16} />
                    {hasNextPage ? "Load More" : "No more"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center md:pb-6 print:hidden">
              <Button
                onClick={() => fetchNextPage()}
                disabled={!hasNextPage || loading}
                variant="soft"
                className="px-5"
              >
                <Plus size={16} />
                {hasNextPage ? "Load More" : "No more"}
              </Button>
            </div>
          </>
        )}

        {/* Set Date Modal */}
        {dateOpen && dateOrder ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
            <div
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.45)" }}
              onClick={() => setDateOpen(false)}
            />

            <Card className="relative w-full max-w-lg p-5">
              <div className="text-xl font-black">Set deliver-by date</div>
              <div
                className="mt-1 text-sm"
                style={{ color: "rgb(var(--muted))" }}
              >
                Order: <b>{dateOrder.order_name || dateOrder.order_id}</b> (
                {getMethod(dateOrder)})
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                  <div className="font-bold">Date</div>
                  <Input
                    type="date"
                    value={deliverBy}
                    onChange={(e) => setDeliverBy(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-[90px_1fr] items-start gap-3">
                  <div className="font-bold">Note</div>
                  <textarea
                    value={localNote}
                    onChange={(e) => setLocalNote(e.target.value)}
                    placeholder="Exchange / deadline / brief note..."
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    style={{
                      borderColor: "rgb(var(--border))",
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--text))",
                      minHeight: 96,
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button variant="soft" onClick={() => setDateOpen(false)}>
                  Cancel
                </Button>
                <Button variant="soft" onClick={saveSetDate}>
                  Save
                </Button>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
