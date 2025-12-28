// src/lib/api.js
import axios from "axios";

const API_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

// helpful debug (shows once in console)
if (import.meta.env.DEV) {
  console.log("[API_BASE]", API_BASE || "(missing VITE_API_BASE)");
}

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Optional: log requests in dev
if (import.meta.env.DEV) {
  api.interceptors.request.use((config) => {
    console.log(
      "[API] ->",
      config.method?.toUpperCase(),
      config.baseURL + config.url,
      config.params || ""
    );
    return config;
  });
  api.interceptors.response.use(
    (res) => {
      console.log("[API] <-", res.status, res.config.url, res.data?.ok);
      return res;
    },
    (err) => {
      console.log("[API] !!", err?.message || err);
      throw err;
    }
  );
}

export async function ping() {
  const { data } = await api.get("/api/ping");
  return data;
}

export async function getOrdersPage({
  shop,
  status = "all",
  limit = 50,
  cursor = null,
  search = "",
} = {}) {
  if (!shop) throw new Error("Missing shop");
  const params = { shop, status, limit };
  if (cursor) params.cursor = cursor;
  if (search) params.search = search;

  const { data } = await api.get("/api/orders/page", { params });
  if (!data?.ok) throw new Error(data?.error || "Failed to load orders");
  return data; // { ok, items, nextCursor }
}

export async function getOrderItems({ shop, order_id } = {}) {
  if (!shop || !order_id) throw new Error("Missing shop/order_id");
  const { data } = await api.get("/api/order-items", {
    params: { shop, order_id },
  });
  if (!data?.ok) throw new Error(data?.error || "Failed to load items");
  return data.items || [];
}

export async function updateTags({ shop, orderId, action, tag } = {}) {
  if (!shop || !orderId) throw new Error("Missing shop/orderId");
  const form = new URLSearchParams({
    shop,
    orderId: String(orderId),
    action: String(action || ""),
    tag: String(tag || ""),
  });

  const { data } = await api.post("/api/orders/tags", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!data?.ok) throw new Error(data?.error || "Failed to update tags");
  return data; // { ok, tags, tags_str }
}

export async function setDeliverBy({ shop, orderId, deliverBy } = {}) {
  if (!shop || !orderId) throw new Error("Missing shop/orderId");
  const form = new URLSearchParams({
    shop,
    orderId: String(orderId),
    deliverBy: deliverBy ? String(deliverBy) : "",
  });

  const { data } = await api.post("/api/orders/deliver-by", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!data?.ok) throw new Error(data?.error || "Failed to save deliverBy");
  return data; // { ok, deliverBy }
}

export async function setNoteLocal({ shop, orderId, noteLocal } = {}) {
  if (!shop || !orderId) throw new Error("Missing shop/orderId");
  const form = new URLSearchParams({
    shop,
    orderId: String(orderId),
    noteLocal: noteLocal ? String(noteLocal) : "",
  });

  const { data } = await api.post("/api/orders/note-local", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!data?.ok) throw new Error(data?.error || "Failed to save note");
  return data; // { ok, noteLocal }
}
