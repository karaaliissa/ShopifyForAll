//src/pages/OrderDetailsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  getOrderItems,
  updateTags,
  setDeliverBy,
  setNoteLocal,
  getOrdersPage,
} from "../lib/api.js";
import Badge from "../components/Badge.jsx";
import { Card, Input, Button, Muted } from "../components/ui.jsx";
import { ArrowLeft, Save, Plus } from "lucide-react";

function parseTags(tagsStr) {
  if (!tagsStr) return [];
  return String(tagsStr)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
function money(v, c) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "-";
  return `${n.toFixed(2)} ${c || ""}`.trim();
}

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const [sp] = useSearchParams();
  const shop = String(sp.get("shop") || "")
    .toLowerCase()
    .trim();

  const [orderRow, setOrderRow] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [deliverBy, setDeliverByState] = useState("");
  const [noteLocal, setNoteLocalState] = useState("");

  const tags = useMemo(() => parseTags(orderRow?.tags), [orderRow?.tags]);

  async function load() {
    if (!shop) return;
    setLoading(true);
    try {
      const page = await getOrdersPage({
        shop,
        status: "all",
        limit: 200,
        cursor: null,
        search: String(orderId),
      });
      const found =
        (page.items || []).find(
          (x) => String(x.order_id) === String(orderId)
        ) || null;

      setOrderRow(found);
      setDeliverByState(
        found?.deliver_by ? String(found.deliver_by).slice(0, 10) : ""
      );
      setNoteLocalState(found?.note_local || "");

      const its = await getOrderItems({ shop, order_id: orderId });
      setItems(its || []);
    } catch (e) {
      alert(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop, orderId]);

  async function addTag(tag) {
    setBusy(true);
    try {
      const r = await updateTags({ shop, orderId, action: "add", tag });
      setOrderRow((prev) => ({
        ...(prev || {}),
        tags: r.tags_str || prev?.tags || "",
      }));
    } catch (e) {
      alert(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function removeTag(tag) {
    setBusy(true);
    try {
      const r = await updateTags({ shop, orderId, action: "remove", tag });
      setOrderRow((prev) => ({
        ...(prev || {}),
        tags: r.tags_str || prev?.tags || "",
      }));
    } catch (e) {
      alert(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function saveDeliverBy() {
    setBusy(true);
    try {
      await setDeliverBy({ shop, orderId, deliverBy });
      alert("Deliver By saved ✅");
    } catch (e) {
      alert(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function saveNoteLocal() {
    setBusy(true);
    try {
      await setNoteLocal({ shop, orderId, noteLocal });
      alert("Note saved ✅");
    } catch (e) {
      alert(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  if (!shop) {
    return (
      <div className="pt-6">
        <Card className="p-6">
          <Muted>
            Missing <b>shop</b> in URL. Go back to Orders and open details
            again.
          </Muted>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-4 md:pt-6 pb-24 md:pb-8">
      {/* Top row */}
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 font-black"
        >
          <ArrowLeft size={18} /> Back
        </Link>
        <div
          className="text-xs font-black"
          style={{ color: "rgb(var(--muted))" }}
        >
          {shop}
        </div>
      </div>

      {/* Summary */}
      <Card className="mt-4 p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="text-2xl font-black">
              {orderRow?.order_name || orderId}
            </div>
            <Muted>
              <div className="mt-1 text-sm">Order ID: {orderId}</div>
            </Muted>

            <div className="mt-3 grid gap-1 text-sm">
              <div className="font-bold">{orderRow?.ship_name || "-"}</div>
              <Muted>
                <div>{orderRow?.customer_email || "-"}</div>
              </Muted>
              <div className="font-extrabold mt-1">
                Total: {money(orderRow?.total, orderRow?.currency)}
              </div>
            </div>
          </div>

          {/* Quick Tags */}
          <div className="min-w-[280px]">
            <div className="text-sm font-black">Quick Actions</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Processing", "Shipped", "Complete"].map((t) => (
                <Button
                  key={t}
                  variant="soft"
                  disabled={busy}
                  onClick={() => addTag(t)}
                  className="px-3 py-2 text-xs"
                >
                  <Plus size={14} /> {t}
                </Button>
              ))}
            </div>

            <div className="mt-4 text-sm font-black">Current Tags</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.length ? (
                tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => removeTag(t)}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold"
                    style={{
                      borderColor: "rgb(var(--border))",
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--text))",
                    }}
                  >
                    <Badge>{t}</Badge>
                    <span style={{ color: "rgb(var(--muted))" }}>Remove</span>
                  </button>
                ))
              ) : (
                <Muted>No tags</Muted>
              )}
            </div>
          </div>
        </div>
      </Card>
      <Card className="mt-4 p-5">
        <div className="font-black">Shipping Address</div>
        <div className="mt-2 text-sm">
          <div className="font-bold">{orderRow?.ship_name || "-"}</div>
          <div style={{ color: "rgb(var(--muted))" }}>
            {[
              orderRow?.ship_address1,
              orderRow?.ship_address2,
              orderRow?.ship_city,
              orderRow?.ship_province,
              orderRow?.ship_zip,
              orderRow?.ship_country,
            ]
              .filter(Boolean)
              .join(", ")}
          </div>
          {orderRow?.ship_phone ? (
            <div className="mt-1 font-extrabold">📞 {orderRow.ship_phone}</div>
          ) : null}
        </div>
      </Card>

      {/* Deliver By + Note */}
      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <Card className="p-5">
          <div className="font-black">Deliver By</div>
          <Input
            type="date"
            value={deliverBy}
            onChange={(e) => setDeliverByState(e.target.value)}
            className="mt-3"
          />
          <Button
            onClick={saveDeliverBy}
            disabled={busy}
            variant="soft"
            className="mt-3 w-full md:w-auto"
          >
            <Save size={16} /> Save
          </Button>
        </Card>

        <Card className="p-5">
          <div className="font-black">Note (Local)</div>
          <textarea
            value={noteLocal}
            onChange={(e) => setNoteLocalState(e.target.value)}
            rows={4}
            className="mt-3 w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgb(var(--bg))",
              color: "rgb(var(--text))",
            }}
          />
          <Button
            onClick={saveNoteLocal}
            disabled={busy}
            variant="soft"
            className="mt-3 w-full md:w-auto"
          >
            <Save size={16} /> Save
          </Button>
        </Card>
      </div>

      {/* Items */}
      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between">
          <div className="font-black text-lg">Items</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            {loading ? "Loading..." : `${items.length} items`}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="rounded-2xl border p-3 flex gap-3"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgb(var(--bg))",
              }}
            >
              {it.IMAGE ? (
                <img
                  src={it.IMAGE}
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

              <div className="flex-1">
                <div className="font-black">{it.TITLE}</div>
                <Muted>
                  <div className="text-sm">
                    {it.VARIANT_TITLE || "-"} • SKU: {it.SKU || "-"}
                  </div>
                </Muted>
                <div className="mt-1 text-sm font-extrabold">
                  Qty: {it.QUANTITY} • Total:{" "}
                  {money(it.LINE_TOTAL, it.CURRENCY)}
                </div>
              </div>
            </div>
          ))}

          {!loading && items.length === 0 ? <Muted>No items.</Muted> : null}
        </div>
      </Card>
    </div>
  );
}
