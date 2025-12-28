// src/pages/ProductionPage.jsx
import { useEffect, useMemo, useState } from "react";
import { getOrdersPage, getOrderItems } from "../lib/api.js";
import { groupPickingItems } from "../utils/picking.js";
import { Card, Input, Select, Button, Muted } from "../components/ui.jsx";
import { Printer, RefreshCw } from "lucide-react";

async function fetchItemsForOrdersInBatches(shop, orders, batchSize = 8) {
  const results = [];

  for (let i = 0; i < orders.length; i += batchSize) {
    const chunk = orders.slice(i, i + batchSize);

    const chunkRes = await Promise.all(
      chunk.map(async (o) => {
        const arr = await getOrderItems({ shop, order_id: o.order_id });

        // ✅ inject order info so grouping can include orders
        return (arr || []).map((it) => ({
          ...it,
          ORDER_ID: o.order_id,
          ORDER_NAME: o.order_name,
        }));
      })
    );

    for (const arr of chunkRes) results.push(...(arr || []));
  }

  return results;
}

export default function ProductionPage() {
  const [shop, setShop] = useState(
    () => localStorage.getItem("shop_domain") || ""
  );
  const [status, setStatus] = useState("processing");
  const [loading, setLoading] = useState(false);

  const [ordersCount, setOrdersCount] = useState(0);
  const [rows, setRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const canLoad = useMemo(() => !!shop.trim(), [shop]);

  useEffect(() => {
    localStorage.setItem("shop_domain", shop.trim());
  }, [shop]);

  async function buildProduction() {
    if (!canLoad) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const page = await getOrdersPage({
        shop: shop.trim().toLowerCase(),
        status,
        limit: 200,
        cursor: null,
        search: "",
      });

      const ord = page.items || [];
      setOrdersCount(ord.length);

      const allItems = await fetchItemsForOrdersInBatches(
        shop.trim().toLowerCase(),
        ord,
        8
      );

      const grouped = groupPickingItems(allItems);
      setRows(grouped);
    } catch (e) {
      setErrorMsg(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  function onPrint() {
    window.print();
  }

  const totalQty = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.QTY || 0), 0),
    [rows]
  );

  return (
    <div className="pt-4 md:pt-6 pb-24 md:pb-8">
      {/* Print Header (only visible on print) */}
      <div className="hidden print:block mb-4">
        <div className="text-2xl font-black">Production</div>
        <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
          Shop: {shop || "-"} • Status: {status} • Orders: {ordersCount} • Total
          Qty: {totalQty}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl md:text-3xl font-black">Production</div>
          <div className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
            Grouped by SKU (fallback: Title + Variant) • Print-ready
          </div>
        </div>

        <div className="hidden md:flex gap-2">
          <Button
            onClick={buildProduction}
            disabled={!canLoad || loading}
            variant="soft"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Build
          </Button>
          <Button onClick={onPrint} disabled={rows.length === 0} variant="soft">
            <Printer size={16} />
            Print
          </Button>
        </div>
      </div>

      <Card className="mt-4 p-4 print:hidden">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_260px] md:items-end">
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
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="complete">Complete</option>
              <option value="all">All</option>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={buildProduction}
              disabled={!canLoad || loading}
              variant="soft"
              className="flex-1"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Build
            </Button>
            <Button
              onClick={onPrint}
              disabled={rows.length === 0}
              variant="soft"
              className="flex-1"
            >
              <Printer size={16} />
              Print
            </Button>
          </div>
        </div>
      </Card>

      {!canLoad ? (
        <Card className="mt-4 p-6 print:hidden">
          <Muted>
            Enter your <span className="font-black">shop domain</span> to build
            production list.
          </Muted>
        </Card>
      ) : null}

      {errorMsg ? (
        <Card className="mt-4 p-4 print:hidden">
          <div className="font-black">Error</div>
          <div className="text-sm mt-1" style={{ color: "rgb(var(--muted))" }}>
            {errorMsg}
          </div>
        </Card>
      ) : null}

      {/* Summary */}
      {canLoad ? (
        <Card className="mt-4 p-4 print:hidden">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="text-sm">
              <span className="font-black">Orders:</span>{" "}
              <span style={{ color: "rgb(var(--muted))" }}>{ordersCount}</span>
            </div>
            <div className="text-sm">
              <span className="font-black">Lines:</span>{" "}
              <span style={{ color: "rgb(var(--muted))" }}>{rows.length}</span>
            </div>
            <div className="text-sm">
              <span className="font-black">Total Qty:</span>{" "}
              <span style={{ color: "rgb(var(--muted))" }}>{totalQty}</span>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Screen View: cards */}
      <div className="mt-4 space-y-3 print:hidden">
        {rows.map((r) => (
          <Card key={r.key} className="p-4">
            <div className="flex items-start gap-3">
              <div
                className="h-14 w-14 rounded-xl border overflow-hidden shrink-0"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgb(var(--bg))",
                }}
              >
                {r.IMAGE ? (
                  <img
                    src={r.IMAGE}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-black truncate">
                    {r.TITLE || r.SKU || "Item"}
                  </div>
                  <div className="text-lg font-black">{r.QTY}</div>
                </div>

                <div
                  className="mt-1 text-xs"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  {r.SKU ? `SKU: ${r.SKU}` : "SKU: -"}
                  {r.VARIANT_TITLE ? ` • ${r.VARIANT_TITLE}` : ""}
                </div>

                {r.ORDERS_COUNT ? (
                  <div
                    className="mt-2 text-xs"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    Orders: {r.ORDERS.slice(0, 4).join(", ")}
                    {r.ORDERS.length > 4 ? ` +${r.ORDERS.length - 4}` : ""}
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        ))}

        {rows.length === 0 && !loading ? (
          <Card className="p-6">
            <div style={{ color: "rgb(var(--muted))" }}>
              No rows yet. Click <span className="font-black">Build</span>.
            </div>
          </Card>
        ) : null}

        {loading ? (
          <Card className="p-6">
            <div style={{ color: "rgb(var(--muted))" }}>Building…</div>
          </Card>
        ) : null}
      </div>

      {/* Print View: table */}
      <Card className="hidden print:block mt-4 overflow-hidden">
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          <div className="font-black">Production List</div>
          <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
            Lines: {rows.length} • Total Qty: {totalQty}
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead style={{ color: "rgb(var(--muted))" }}>
              <tr style={{ borderBottom: "1px solid rgb(var(--border))" }}>
                <th className="text-left p-3">Qty</th>
                <th className="text-left p-3">SKU</th>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Variant</th>
                <th className="text-left p-3">Orders</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.key}
                  style={{ borderBottom: "1px solid rgb(var(--border))" }}
                >
                  <td className="p-3 font-black">{r.QTY}</td>
                  <td className="p-3">{r.SKU || "-"}</td>
                  <td className="p-3">{r.TITLE || "-"}</td>
                  <td className="p-3">{r.VARIANT_TITLE || "-"}</td>
                  <td className="p-3">
                    {r.ORDERS_COUNT ? `${r.ORDERS_COUNT} order(s)` : "-"}
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td
                    className="p-6"
                    colSpan={5}
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    Empty.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
