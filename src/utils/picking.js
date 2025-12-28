// src/utils/picking.js
export function groupPickingItems(allItems) {
  const map = new Map();

  for (const it of allItems || []) {
    const sku = String(it.SKU || "").trim();
    const title = String(it.TITLE || "").trim();
    const variant = String(it.VARIANT_TITLE || "").trim();
    const key = sku ? `sku:${sku}` : `t:${title}__v:${variant}`;

    const qty = Number(it.QUANTITY || 0) || 0;

    if (!map.has(key)) {
      map.set(key, {
        key,
        SKU: sku,
        TITLE: title,
        VARIANT_TITLE: variant,
        QTY: 0,
        IMAGE: it.IMAGE || "",
        ORDERS: new Set(),
      });
    }

    const row = map.get(key);
    row.QTY += qty;

    if (!row.IMAGE && it.IMAGE) row.IMAGE = it.IMAGE;

    // ✅ If items include order info, collect it
    // ProductionPage will inject ORDER_ID/ORDER_NAME into items.
    const oid = it.ORDER_ID ? String(it.ORDER_ID) : "";
    const oname = it.ORDER_NAME ? String(it.ORDER_NAME) : "";
    const label = (oname || oid).trim();
    if (label) row.ORDERS.add(label);
  }

  const out = Array.from(map.values()).map((x) => ({
    ...x,
    ORDERS: Array.from(x.ORDERS).sort(),
    ORDERS_COUNT: x.ORDERS.size,
  }));

  // sort: SKU first then title
  out.sort((a, b) => {
    const as = a.SKU || "";
    const bs = b.SKU || "";
    if (as && bs) return as.localeCompare(bs);
    if (as) return -1;
    if (bs) return 1;
    return (a.TITLE || "").localeCompare(b.TITLE || "");
  });

  return out;
}
