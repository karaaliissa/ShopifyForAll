// picking.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface PickingOrderTag {
  NAME: string;
  IS_EXPRESS?: boolean;
}

export interface PickingRow {
  KEY: string;
  SKU: string;
  TITLE: string;
  VARIANT_TITLE: string;
  IMAGE: string;
  TOTAL_QTY: number;
  ORDERS: PickingOrderTag[]; // per-order tag with express flag
}

@Injectable({ providedIn: 'root' })
export class PickingService {
  private base = 'https://shopify-sheets-backend.vercel.app';
  constructor(private http: HttpClient) {}

  getPickingList(params: { shop?: string; from?: string; to?: string }): Observable<PickingRow[]> {
    const httpParams = new HttpParams({ fromObject: { ...(params || {}) } });
    return this.http
      .get<{ ok: boolean; items: any[] }>(`${this.base}/api/picking-list`, { params: httpParams })
      .pipe(
        map(r => (r?.ok ? r.items : [])),
        // Backward compat: if ORDERS are strings, wrap to {NAME}
        map(items =>
          items.map(it => ({
            ...it,
            ORDERS: (it.ORDERS ?? []).map((o: any) =>
              typeof o === 'string' ? { NAME: o } : o
            ),
          })) as PickingRow[]
        )
      );
  }

  startWork(payload: {
    shopDomain: string; orderId: string|number; lineId: string|number;
    stage: string; qty?: number; sku?: string; title?: string; variantTitle?: string; assignee?: string; notes?: string
  }) {
    return this.http.post<{ ok: boolean; workId: string }>(`${this.base}/api/work/start`, payload);
  }

  doneWork(workId: string) {
    return this.http.post<{ ok: boolean }>(`${this.base}/api/work/done`, { workId });
  }
}
