// src/app/services/orders.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of, shareReplay, catchError } from 'rxjs';
import { environment } from '../environments/environment';

export type FulfillmentStatus =
  | 'unfulfilled'
  | 'partial'
  | 'fulfilled'
  | 'restocked'
  | 'cancelled'
  | '';

export type FinancialStatus =
  | 'paid'
  | 'pending'
  | 'authorized'
  | 'partially_paid'
  | 'refunded'
  | 'voided'
  | '';

export interface OrdersPage {
  rows: Order[];
  nextCursor?: string | null;
  total?: number;
}

export interface OrdersSummary {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  complete: number;
  cancel: number;

  expressPending: number;
  expressProcessing: number;
  expressShipped: number;
  expressComplete: number;
  expressCancel: number;
}

export interface OrderItem {
  TITLE: string;
  VARIANT_TITLE?: string;
  QUANTITY: number;
  FULFILLABLE_QUANTITY?: number;
  SKU?: string;
  IMAGE?: string;
  UNIT_PRICE?: number;
  LINE_TOTAL?: number;
  CURRENCY?: string;
  PROPERTIES_JSON?: string;
}

/** Backend legacy shape (UPPERCASE keys). */
export interface SheetOrderRow {
  SHOP_DOMAIN: string;
  ORDER_ID: string;
  ORDER_NAME?: string;
  CREATED_AT?: string;
  UPDATED_AT?: string;
  CANCELLED_AT?: string;
  FULFILLMENT_STATUS?: FulfillmentStatus | string;
  FINANCIAL_STATUS?: FinancialStatus | string;
  PAYMENT_GATEWAY?: string;
  SHIPPING_METHOD?: string;
  SHIP_NAME?: string;
  SHIP_ADDRESS1?: string;
  SHIP_ADDRESS2?: string;
  SHIP_CITY?: string;
  SHIP_PROVINCE?: string;
  SHIP_ZIP?: string;
  SHIP_COUNTRY?: string;
  SHIP_PHONE?: string;
  TAGS?: string;
  TOTAL?: string | number;
  CURRENCY?: string;
  CUSTOMER_EMAIL?: string;

  NOTE?: string;
  NOTE_ATTRIBUTES?: string; // JSON string
  SOURCE_NAME?: string;
  DISCOUNT_CODES?: string;
  DELIVER_BY?: string;
  NOTE_LOCAL?: string;
}

export interface OrdersApiResponse {
  ok: boolean;
  items: SheetOrderRow[];
}

export interface Order {
  shopDomain: string;
  orderId: string;
  orderName?: string;
  createdAt?: Date;
  updatedAt?: Date;
  cancelledAt?: Date;
  fulfillmentStatus?: FulfillmentStatus | string;
  financialStatus?: FinancialStatus | string;
  paymentGateway?: string;
  shippingMethod?: string;
  shipTo?: {
    name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    zip?: string;
    country?: string;
    phone?: string;
  };
  tags: string[];
  total?: number;
  currency?: string;
  customerEmail?: string;

  note?: string;
  noteAttributes?: { name: string; value: any }[];
  sourceName?: string;
  discountCodes?: string[];

  deliverBy?: string | null;
  noteLocal?: string | null;
}

export interface GetOrdersOptions {
  shop?: string;
  status?: FulfillmentStatus | string;
  financial?: FinancialStatus | string;
  from?: string;
  to?: string;
  limit?: number;
  search?: string;
  notTagged?: boolean;
  tag?: string;
  hideComplete?: boolean;
  refresh?: boolean;
}

// ---------- helpers ----------
const parseJson = <T = any>(s?: string): T | undefined => {
  if (!s) return undefined;
  try { return JSON.parse(s) as T; } catch { return undefined; }
};

const toNumber = (v: unknown): number | undefined => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const toDate = (v?: string): Date | undefined => {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

const splitTags = (tags?: string): string[] =>
  (tags ?? '').split(',').map(s => s.trim()).filter(Boolean);

const adaptRow = (x: any): Order => {
  // ✅ accept: UPPER, camelCase, snake_case
  const shopDomain =
    x.SHOP_DOMAIN ?? x.shopDomain ?? x.shop_domain ?? x.shop ?? x.SHOP;

  const orderId =
    x.ORDER_ID ?? x.orderId ?? x.order_id ?? x.id ?? x.ORDERID;

  const orderName =
    x.ORDER_NAME ?? x.orderName ?? x.order_name ?? x.name;

  const createdAt =
    x.CREATED_AT ?? x.createdAt ?? x.created_at;

  const updatedAt =
    x.UPDATED_AT ?? x.updatedAt ?? x.updated_at;

  const cancelledAt =
    x.CANCELLED_AT ?? x.cancelledAt ?? x.cancelled_at;

  const fulfillmentStatus =
    x.FULFILLMENT_STATUS ?? x.fulfillmentStatus ?? x.fulfillment_status ?? '';

  const financialStatus =
    x.FINANCIAL_STATUS ?? x.financialStatus ?? x.financial_status ?? '';

  const shippingMethod =
    x.SHIPPING_METHOD ?? x.shippingMethod ?? x.shipping_method ?? '';

  const tagsRaw =
    x.TAGS ?? x.tags ?? x.tags_raw ?? '';

  const totalRaw =
    x.TOTAL ?? x.total ?? x.total_price ?? x.total_raw;

  const currency =
    x.CURRENCY ?? x.currency ?? x.currency_code;

  const shipToObj = x.shipTo ?? x.ship_to ?? {
    name: x.SHIP_NAME ?? x.ship_name,
    address1: x.SHIP_ADDRESS1 ?? x.ship_address1,
    address2: x.SHIP_ADDRESS2 ?? x.ship_address2,
    city: x.SHIP_CITY ?? x.ship_city,
    province: x.SHIP_PROVINCE ?? x.ship_province,
    zip: x.SHIP_ZIP ?? x.ship_zip,
    country: x.SHIP_COUNTRY ?? x.ship_country,
    phone: x.SHIP_PHONE ?? x.ship_phone,
  };

  // tags ممكن تكون string أو array
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map((t: any) => String(t).trim()).filter(Boolean)
    : splitTags(String(tagsRaw || ''));

  return {
    shopDomain: String(shopDomain || '').toLowerCase().trim(),
    orderId: String(orderId || '').trim(),
    orderName: orderName ? String(orderName) : undefined,

    createdAt: createdAt ? toDate(String(createdAt)) : undefined,
    updatedAt: updatedAt ? toDate(String(updatedAt)) : undefined,
    cancelledAt: cancelledAt ? toDate(String(cancelledAt)) : undefined,

    fulfillmentStatus: String(fulfillmentStatus || ''),
    financialStatus: String(financialStatus || ''),

    paymentGateway: x.PAYMENT_GATEWAY ?? x.paymentGateway ?? x.payment_gateway,
    shippingMethod: String(shippingMethod || ''),

    shipTo: {
      name: shipToObj?.name,
      address1: shipToObj?.address1,
      address2: shipToObj?.address2,
      city: shipToObj?.city,
      province: shipToObj?.province,
      zip: shipToObj?.zip,
      country: shipToObj?.country,
      phone: shipToObj?.phone,
    },

    tags,
    total: toNumber(totalRaw),
    currency,
    customerEmail: x.CUSTOMER_EMAIL ?? x.customerEmail ?? x.customer_email,

    note: x.NOTE ?? x.note,
    noteAttributes:
      parseJson<{ name: string; value: any }[]>(
        x.NOTE_ATTRIBUTES ?? x.noteAttributes ?? x.note_attributes
      ) || [],

    sourceName: x.SOURCE_NAME ?? x.sourceName ?? x.source_name,
    discountCodes: Array.isArray(x.discountCodes)
      ? x.discountCodes
      : splitTags(x.DISCOUNT_CODES ?? x.discount_codes),

    deliverBy: (x.DELIVER_BY ?? x.deliverBy ?? x.deliver_by)
      ? String(x.DELIVER_BY ?? x.deliverBy ?? x.deliver_by).slice(0, 10)
      : null,

    noteLocal: String(x.NOTE_LOCAL ?? x.noteLocal ?? x.note_local ?? '').trim() || null,
  };
};


@Injectable({ providedIn: 'root' })
export class OrdersService {
  private base = (environment.API_BASE_URL || '').replace(/\/$/, '');

  private itemsCache$ = new Map<string, Observable<OrderItem[]>>();

  constructor(private http: HttpClient) { }

  // ----------------------------
  // Small updates (POST, form-urlencoded) -> avoids preflight
  // ----------------------------
  setDeliverBy(shopDomain: string, orderId: string | number, deliverBy: string | null) {
    const url = `${this.base}/api/orders/deliver-by`;
    const body = new URLSearchParams({
      shop: shopDomain,
      orderId: String(orderId),
      deliverBy: deliverBy ?? '',
    }).toString();

    return this.http.post<{ ok: boolean; deliverBy?: string | null; error?: string }>(
      url,
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  }

  setNoteLocal(shopDomain: string, orderId: string | number, noteLocal: string | null) {
    const url = `${this.base}/api/orders/note-local`;
    const body = new URLSearchParams({
      shop: shopDomain,
      orderId: String(orderId),
      noteLocal: noteLocal ?? '',
    }).toString();

    return this.http.post<{ ok: boolean; noteLocal?: string | null; error?: string }>(
      url,
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  }

  addTagRemote(shop: string, orderId: string | number, tag: string) {
    const url = `${this.base}/api/orders/tags`;
    const body = new URLSearchParams({
      shop,
      orderId: String(orderId),
      action: 'add',
      tag,
    }).toString();

    return this.http.post<{ ok: boolean; tags: string[]; error?: string }>(
      url,
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  }

  removeTagRemote(shop: string, orderId: string | number, tag: string) {
    const url = `${this.base}/api/orders/tags`;
    const body = new URLSearchParams({
      shop,
      orderId: String(orderId),
      action: 'remove',
      tag,
    }).toString();

    return this.http.post<{ ok: boolean; tags: string[]; error?: string }>(
      url,
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  }

  fulfillOrder(shop: string, orderId: string | number) {
    const url = `${this.base}/api/orders/fulfill`;
    const body = new URLSearchParams({
      shop,
      orderId: String(orderId),
    }).toString();

    return this.http.post<{ ok: boolean; error?: string; note?: string }>(
      url,
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  }

  // ----------------------------
  // Orders list (legacy endpoint)
  // ----------------------------
  getOrders(opts?: GetOrdersOptions): Observable<Order[]> {
    let params = new HttpParams();
    if (opts?.shop) params = params.set('shop', opts.shop);
    if (opts?.status) params = params.set('status', String(opts.status));
    if (opts?.limit) params = params.set('limit', String(opts.limit));
    if (opts?.refresh) params = params.set('refresh', '1').set('ts', String(Date.now()));

    return this.http.get<OrdersApiResponse>(`${this.base}/api/orders`, { params }).pipe(
      catchError(() => of({ ok: false, items: [] } as OrdersApiResponse)),
      map(res => Array.isArray(res?.items) ? res.items : []),
      map(rows => rows.map(adaptRow)),
      map(rows => this.clientFilter(rows, opts))
    );
  }

  // ----------------------------
  // Pagination endpoint (recommended)
  // ----------------------------
  getOrdersPage(opts: GetOrdersOptions & { cursor?: string | null } = {}): Observable<OrdersPage> {
    let params = new HttpParams();
    if (opts.shop) params = params.set('shop', opts.shop);
    if (opts.status) params = params.set('status', String(opts.status));
    if (opts.limit) params = params.set('limit', String(opts.limit));
    if (opts.search) params = params.set('search', String(opts.search));
    if (opts.cursor) params = params.set('cursor', String(opts.cursor));
    if (opts.refresh) params = params.set('refresh', '1').set('ts', String(Date.now()));
    if (opts.financial) params = params.set('financial', String(opts.financial));
    if (opts.from) params = params.set('from', String(opts.from));
    if (opts.to) params = params.set('to', String(opts.to));
    if (opts.notTagged) params = params.set('notTagged', '1');
    if (opts.tag) params = params.set('tag', String(opts.tag));
    if (opts.hideComplete) params = params.set('hideComplete', '1');

    return this.http.get<any>(`${this.base}/api/orders/page`, { params }).pipe(
      map((res: any): OrdersPage => {
        // ✅ backend بيرجع items (snake_case) مثل اللي بالصورة
        const raw = Array.isArray(res?.items) ? res.items : [];
        console.log("RAW ITEM SAMPLE", res?.items?.[0]);

        // ✅ تطبيع واحد فقط
        const rows = this.clientFilter(raw.map(adaptRow), opts);
        const mapped = raw.map(adaptRow);
        console.log("MAPPED ITEM SAMPLE", mapped?.[0]);

        // ✅ backend بيرجع nextCursor (مش next_cursor)
        const nextCursor =
          typeof res?.nextCursor === 'string'
            ? res.nextCursor
            : (typeof res?.next_cursor === 'string' ? res.next_cursor : null);

        const total =
          typeof res?.total === 'number'
            ? res.total
            : undefined;

        return { rows, nextCursor, total };
      }),
      catchError(() => of({ rows: [], nextCursor: null, total: 0 }))
    );
  }



  // ----------------------------
  // Summary (global counters)
  // ----------------------------
  getSummary(shop?: string): Observable<OrdersSummary> {
    let params = new HttpParams();
    if (shop) params = params.set('shop', shop);

    return this.http.get<OrdersSummary>(`${this.base}/api/orders/summary`, { params }).pipe(
      catchError(() => of({
        total: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        complete: 0,
        cancel: 0,
        expressPending: 0,
        expressProcessing: 0,
        expressShipped: 0,
        expressComplete: 0,
        expressCancel: 0,
      } as OrdersSummary))
    );
  }

  // ----------------------------
  // Items per order
  // NOTE: backend should expose /api/order-items
  // ----------------------------
  getOrderItems(shop: string, orderId: string | number): Observable<OrderItem[]> {
    const key = `${shop}|${orderId}`;

    // ✅ cached observable
    const cached = this.itemsCache$.get(key);
    if (cached) return cached;

    const params = new HttpParams()
      .set('shop', shop)
      .set('order_id', String(orderId));

    const req$ = this.http
      .get<{ ok: boolean; items?: OrderItem[] }>(`${this.base}/api/order-items`, { params })
      .pipe(
        catchError(() => of({ ok: false, items: [] })),
        map(r => Array.isArray(r?.items) ? r.items : []),
        shareReplay(1)
      );

    this.itemsCache$.set(key, req$);
    return req$;
  }


  // ----------------------------
  // Client-side filtering (unchanged)
  // ----------------------------
  private clientFilter(rows: Order[], o?: GetOrdersOptions): Order[] {
    let r = [...rows];

    if (o?.from || o?.to) {
      const from = o.from ? new Date(o.from).getTime() : -Infinity;
      const to = o.to ? new Date(o.to).getTime() : Infinity;
      r = r.filter(x =>
        (x.createdAt?.getTime() ?? x.updatedAt?.getTime() ?? 0) >= from &&
        (x.createdAt?.getTime() ?? x.updatedAt?.getTime() ?? 0) <= to
      );
    }

    if (o?.financial) {
      r = r.filter(x => (x.financialStatus ?? '').toLowerCase() === String(o.financial).toLowerCase());
    }
    if (o?.status) {
      r = r.filter(x => (x.fulfillmentStatus ?? '').toLowerCase() === String(o.status).toLowerCase());
    }
    if (o?.hideComplete) {
      r = r.filter(x => !x.cancelledAt);
    }
    if (o?.notTagged) {
      r = r.filter(x => x.tags.length === 0);
    }
    if (o?.tag) {
      const tg = o.tag.toLowerCase();
      r = r.filter(x => x.tags.map(t => t.toLowerCase()).includes(tg));
    }
    if (o?.search) {
      const q = o.search.toLowerCase();
      r = r.filter(x =>
        (x.orderName ?? '').toLowerCase().includes(q) ||
        (x.customerEmail ?? '').toLowerCase().includes(q) ||
        (x.shipTo?.name ?? '').toLowerCase().includes(q) ||
        x.orderId.toLowerCase().includes(q)
      );
    }

    r.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
    return r;
  }
}