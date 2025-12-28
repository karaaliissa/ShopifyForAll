// src/pages/PickingListPage.jsx
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

        // inject order info so we can show orders count later
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

export default function PickingListPage() {
  const [shop, setShop] = useState(() => localStorage.getItem("shop_domain") || "");
  const [status, setStatus] = useState("processing");
  const [loading, setLoading] = useState(false);

  const [ordersCount, setOrdersCount] = useState(0);
  const [rows, setRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const canLoad = useMemo(() => !!shop.trim(), [shop]);

  useEffect(() => {
    localStorage.setItem("shop_domain", shop.trim());
  }, [shop]);

  async function buildPicking() {
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
        <div className="text-2xl font-black">Picking List</div>
        <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
          Shop: {shop || "-"} • Status: {status} • Orders: {ordersCount} • Total Qty: {totalQty}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 print:hidden">
        <div>
          <div className="text-2xl md:text-3xl font-black">Picking List</div>
          <Muted>
            <div className="mt-1 text-sm">
              Orders: <b>{ordersCount}</b> • Lines: <b>{rows.length}</b> • Total Qty:{" "}
              <b>{totalQty}</b>
            </div>
          </Muted>
        </div>

        <div className="hidden md:flex gap-2">
          <Button onClick={buildPicking} disabled={!canLoad || loading} variant="soft">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Build
          </Button>
          <Button onClick={onPrint} disabled={rows.length === 0} variant="soft">
            <Printer size={16} /> Print
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card className="mt-4 p-4 print:hidden">
        <div className="grid md:grid-cols-3 gap-3">
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

          <div className="flex items-end gap-2">
            <Button
              onClick={buildPicking}
              disabled={!canLoad || loading}
              variant="soft"
              className="w-full"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Build Picking List
            </Button>

            <Button
              onClick={onPrint}
              disabled={rows.length === 0}
              variant="soft"
              className="md:hidden"
            >
              <Printer size={16} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Error */}
      {errorMsg ? (
        <Card className="mt-4 p-4 print:hidden">
          <div className="font-black">Error</div>
          <div className="text-sm mt-1" style={{ color: "rgb(var(--muted))" }}>
            {errorMsg}
          </div>
        </Card>
      ) : null}

      {/* Screen view: cards */}
      <div className="mt-4 grid gap-3 print:hidden">
        {rows.map((r) => (
          <Card key={r.key} className="p-4 flex gap-3">
            {r.IMAGE ? (
              <img
                src={r.IMAGE}
                alt=""
                className="w-14 h-14 rounded-xl object-cover border"
                style={{ borderColor: "rgb(var(--border))" }}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl border"
                style={{ borderColor: "rgb(var(--border))" }}
              />
            )}

            <div className="flex-1 min-w-0">
              <div className="font-black truncate">{r.TITLE || r.SKU || "Item"}</div>
              <Muted>
                <div className="text-sm">
                  {r.VARIANT_TITLE || "-"} • SKU: {r.SKU || "-"}
                </div>
              </Muted>

              {r.ORDERS_COUNT ? (
                <div className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
                  Orders: {r.ORDERS.slice(0, 4).join(", ")}
                  {r.ORDERS.length > 4 ? ` +${r.ORDERS.length - 4}` : ""}
                </div>
              ) : null}
            </div>

            <div className="text-right">
              <div className="text-2xl font-black">{r.QTY}</div>
              <Muted>
                <div className="text-xs">Total Qty</div>
              </Muted>
            </div>
          </Card>
        ))}

        {!loading && canLoad && rows.length === 0 ? (
          <Card className="p-6">
            <Muted>No items to pick. Click Build.</Muted>
          </Card>
        ) : null}

        {loading ? (
          <Card className="p-6">
            <Muted>Building…</Muted>
          </Card>
        ) : null}
      </div>

      {/* Print view: table */}
      <Card className="hidden print:block mt-4 overflow-hidden">
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          <div className="font-black">Picking List</div>
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
                <tr key={r.key} style={{ borderBottom: "1px solid rgb(var(--border))" }}>
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
                  <td className="p-6" colSpan={5} style={{ color: "rgb(var(--muted))" }}>
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
