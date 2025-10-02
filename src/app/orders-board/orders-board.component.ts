import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of, shareReplay } from 'rxjs';

export interface OrderRow {
  SHOP_DOMAIN: string;
  ORDER_ID: string;
  ORDER_NAME?: string;
  CREATED_AT?: string;
  UPDATED_AT?: string;
  CANCELLED_AT?: string;
  FULFILLMENT_STATUS?: string;
  FINANCIAL_STATUS?: string;
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
}

export interface OrdersApiResponse { ok: boolean; items: OrderRow[]; }

@Injectable({ providedIn: 'root' })
export class OrdersService {
  // keep your deployed endpoint here
  private base = 'https://shopify-sheets-backend.vercel.app';

  private itemsCache = new Map<string, any[]>(); // key = `${shop}|${orderId}`

  constructor(private http: HttpClient) {}

  getOrders(opts?: {
    shop?: string;
    status?: string;          // fulfillment status
    financial?: string;       // e.g. "paid", "pending"
    from?: string;            // ISO date
    to?: string;              // ISO date
    limit?: number;
    search?: string;          // free text search on order name
    notTagged?: boolean;      // filter "Not tagged"
    tag?: string;             // filter by tag
    hideComplete?: boolean;   // omit cancelled/closed (if you add "CLOSED" later)
  }): Observable<OrderRow[]> {
    let p = new HttpParams();
    if (opts?.shop) p = p.set('shop', opts.shop);
    if (opts?.status) p = p.set('status', opts.status);
    if (opts?.limit) p = p.set('limit', String(opts.limit));
    // Leaves room for future server filters; for now we filter client-side.
    return this.http
      .get<OrdersApiResponse>(`${this.base}/api/orders`, { params: p })
      .pipe(
        map(res => (res?.ok ? res.items : [])),
        map(rows => this.clientFilter(rows, opts))
      );
  }

  // Pull latest items for one order and cache them
  getOrderItems(shop: string, orderId: string | number): Observable<any[]> {
    const key = `${shop}|${orderId}`;
    if (this.itemsCache.has(key)) return of(this.itemsCache.get(key)!);
    const params = new HttpParams().set('shop', shop).set('order_id', String(orderId));
    return this.http
      .get<{ ok: boolean; items: any[] }>(`${this.base}/api/items`, { params })
      .pipe(
        map(r => (r?.ok ? r.items : [])),
        map(list => {
          this.itemsCache.set(key, list);
          return list;
        }),
        shareReplay(1)
      );
  }

  private clientFilter(rows: OrderRow[], o?: any): OrderRow[] {
    let r = [...rows];

    // date window (client-side, uses CREATED_AT)
    if (o?.from || o?.to) {
      const from = o.from ? new Date(o.from).getTime() : -Infinity;
      const to   = o.to   ? new Date(o.to).getTime()   :  Infinity;
      r = r.filter(x => {
        const t = new Date(x.CREATED_AT ?? x.UPDATED_AT ?? 0).getTime();
        return t >= from && t <= to;
      });
    }

    if (o?.financial) {
      r = r.filter(x => (x.FINANCIAL_STATUS || '').toLowerCase() === o.financial.toLowerCase());
    }

    if (o?.status) {
      r = r.filter(x => (x.FULFILLMENT_STATUS || '').toLowerCase() === o.status.toLowerCase());
    }

    if (o?.hideComplete) {
      r = r.filter(x => !x.CANCELLED_AT); // simple "open" filter
    }

    if (o?.notTagged) {
      r = r.filter(x => !(x.TAGS || '').trim());
    }

    if (o?.tag) {
      const tg = o.tag.toLowerCase();
      r = r.filter(x => (x.TAGS || '').toLowerCase().split(',').map(s => s.trim()).includes(tg));
    }

    if (o?.search) {
      const q = o.search.toLowerCase();
      r = r.filter(x =>
        (x.ORDER_NAME || '').toLowerCase().includes(q) ||
        (x.CUSTOMER_EMAIL || '').toLowerCase().includes(q) ||
        (x.SHIP_NAME || '').toLowerCase().includes(q) ||
        (x.ORDER_ID || '').toLowerCase().includes(q)
      );
    }

    // newest first
    r.sort((a,b) => (a.UPDATED_AT! < b.UPDATED_AT! ? 1 : -1));
    return r;
  }
}
