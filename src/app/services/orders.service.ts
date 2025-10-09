import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of, shareReplay, catchError } from 'rxjs';

export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled' | 'restocked' | 'cancelled' | '' ;
export type FinancialStatus   = 'paid' | 'pending' | 'authorized' | 'partially_paid' | 'refunded' | 'voided' | '' ;

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

  // NEW:
  NOTE?: string;
  NOTE_ATTRIBUTES?: string; 
  SOURCE_NAME?: string;
  DISCOUNT_CODES?: string;
}

export interface OrdersApiResponse { ok: boolean; items: SheetOrderRow[]; }

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
    name?: string; address1?: string; address2?: string; city?: string;
    province?: string; zip?: string; country?: string; phone?: string;
  };
  tags: string[];
  total?: number;
  currency?: string;
  customerEmail?: string;

  // NEW (for UI columns):
  note?: string;
  noteAttributes?: { name: string; value: any }[];
  sourceName?: string;
  discountCodes?: string[];
}

export interface GetOrdersOptions {
  shop?: string; status?: FulfillmentStatus | string; financial?: FinancialStatus | string;
  from?: string; to?: string; limit?: number; search?: string;
  notTagged?: boolean; tag?: string; hideComplete?: boolean;
  
}

const parseJson = <T = any>(s?: string): T | undefined => {
  if (!s) return undefined;
  try { return JSON.parse(s) as T; } catch { return undefined; }
};
// helpers
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

// row -> model
const adaptRow = (x: SheetOrderRow): Order => ({
  shopDomain: x.SHOP_DOMAIN,
  orderId: String(x.ORDER_ID),
  orderName: x.ORDER_NAME,
  createdAt: toDate(x.CREATED_AT),
  updatedAt: toDate(x.UPDATED_AT),
  cancelledAt: toDate(x.CANCELLED_AT),
  fulfillmentStatus: (x.FULFILLMENT_STATUS ?? '') as FulfillmentStatus | string,
  financialStatus: (x.FINANCIAL_STATUS ?? '') as FinancialStatus | string,
  paymentGateway: x.PAYMENT_GATEWAY,
  shippingMethod: x.SHIPPING_METHOD,
  shipTo: {
    name: x.SHIP_NAME,
    address1: x.SHIP_ADDRESS1,
    address2: x.SHIP_ADDRESS2,
    city: x.SHIP_CITY,
    province: x.SHIP_PROVINCE,
    zip: x.SHIP_ZIP,
    country: x.SHIP_COUNTRY,
    phone: x.SHIP_PHONE,
  },
  tags: splitTags(x.TAGS),
  total: toNumber(x.TOTAL),
  currency: x.CURRENCY,
  customerEmail: x.CUSTOMER_EMAIL,

  // NEW:
  note: x.NOTE,
  noteAttributes: parseJson<{name:string; value:any}[]>(x.NOTE_ATTRIBUTES) || [],
  sourceName: x.SOURCE_NAME,
  discountCodes: splitTags(x.DISCOUNT_CODES),
});
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
  refresh?: boolean; // <-- added
}
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private base = 'https://shopify-sheets-backend.vercel.app';
  private itemsCache = new Map<string, any[]>();
  constructor(private http: HttpClient) {}

  // getOrders(opts?: GetOrdersOptions): Observable<Order[]> {
  //   let params = new HttpParams();
  //   if (opts?.shop)   params = params.set('shop', opts.shop);
  //   if (opts?.status) params = params.set('status', String(opts.status));
  //   if (opts?.limit)  params = params.set('limit', String(opts.limit));

  //   return this.http.get<OrdersApiResponse>(`${this.base}/api/orders`, { params }).pipe(
  //     catchError(() => of({ ok: false, items: [] } as OrdersApiResponse)),
  //     map(res => Array.isArray(res?.items) ? res.items : []),
  //     map(rows => rows.map(adaptRow)),
  //     map(rows => this.clientFilter(rows, opts))
  //   );
  // }
  getOrders(opts?: GetOrdersOptions): Observable<Order[]> {
    let params = new HttpParams();
    if (opts?.shop)   params = params.set('shop', opts.shop);
    if (opts?.status) params = params.set('status', String(opts.status));
    if (opts?.limit)  params = params.set('limit', String(opts.limit));
    if (opts?.refresh) {
      params = params.set('refresh', '1')
                     .set('ts', String(Date.now())); // CDN key-buster
    }
  
    return this.http.get<OrdersApiResponse>(`${this.base}/api/orders`, { params }).pipe(
      catchError(() => of({ ok: false, items: [] } as OrdersApiResponse)),
      map(res => Array.isArray(res?.items) ? res.items : []),
      map(rows => rows.map(adaptRow)),
      map(rows => this.clientFilter(rows, opts))
    );
  }
  getOrderItems(shop: string, orderId: string | number): Observable<OrderItem[]> {
    const key = `${shop}|${orderId}`;
    if (this.itemsCache.has(key)) return of(this.itemsCache.get(key)!);
    const params = new HttpParams().set('shop', shop).set('order_id', String(orderId));

    return this.http.get<{ ok: boolean; items?: OrderItem[] }>(`${this.base}/api/items`, { params }).pipe(
      catchError(() => of({ ok: false, items: [] })),
      map(r => Array.isArray(r?.items) ? r.items : []),
      map(list => { this.itemsCache.set(key, list); return list; }),
      shareReplay(1)
    );
  }

  private clientFilter(rows: Order[], o?: GetOrdersOptions): Order[] {
    let r = [...rows];
    if (o?.from || o?.to) {
      const from = o.from ? new Date(o.from).getTime() : -Infinity;
      const to   = o.to   ? new Date(o.to).getTime()   :  Infinity;
      r = r.filter(x => (x.createdAt?.getTime() ?? x.updatedAt?.getTime() ?? 0) >= from
                      && (x.createdAt?.getTime() ?? x.updatedAt?.getTime() ?? 0) <= to);
    }
    if (o?.financial) r = r.filter(x => (x.financialStatus ?? '').toLowerCase() === String(o.financial).toLowerCase());
    if (o?.status)    r = r.filter(x => (x.fulfillmentStatus ?? '').toLowerCase() === String(o.status).toLowerCase());
    if (o?.hideComplete) r = r.filter(x => !x.cancelledAt);
    if (o?.notTagged) r = r.filter(x => x.tags.length === 0);
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

  // addTagRemote(shop: string, orderId: string | number, tag: string) {
  //   const url = `${this.base}/api/orders/tag`; // <-- add the slash
  //   return this.http.post<{ ok:boolean; tags:string[]; error?:string }>(url, {
  //     shop, orderId, action: 'add', tag
  //   }).pipe(
  //     catchError(err => {
  //       console.error('addTagRemote failed', err); // network/CORS
  //       return of({ ok:false, tags:[], error: err?.message || 'request failed' });
  //     })
  //   );
  // }
  // services/orders.service.ts
addTagRemote(shop: string, orderId: string | number, tag: string) {
  const url = `${this.base}/api/orders/tag`;
  const body = new URLSearchParams({
    shop,
    orderId: String(orderId),
    action: 'add',
    tag
  }).toString();

  // form post => no preflight
  return this.http.post<{ ok:boolean; tags:string[]; error?:string }>(
    url,
    body,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
}

  removeTagRemote(shop: string, orderId: string | number, tag: string) {
    const url = `${this.base}/api/orders/tag`;
    return this.http.post<{ok:boolean; tags:string[]; error?:string}>(url, {
      shop, orderId, action: 'remove', tag
    });
  }
  
}
