import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';

export interface WorkRow {
  WORK_ID: string; SHOP_DOMAIN: string; ORDER_ID: string; LINE_ID: string;
  SKU: string; TITLE: string; VARIANT_TITLE: string; QTY: number|string;
  STAGE: string; ASSIGNEE: string; START_TS: string; STATUS: string; NOTES?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private base = 'https://shopify-sheets-backend.vercel.app';
  constructor(private http: HttpClient) {}

  list(params: { stage?: string; shop?: string; date?: string }) {
    const p = new HttpParams({ fromObject: { ...(params||{}) }});
    return this.http.get<{ok:boolean; items:WorkRow[]}>(`${this.base}/api/work/list`, { params: p })
      .pipe(map(r => r?.ok ? r.items : []));
  }

  start(payload: any) {
    return this.http.post<{ok:boolean; workId:string}>(`${this.base}/api/work/start`, payload);
  }

  done(workId: string) {
    return this.http.post<{ok:boolean}>(`${this.base}/api/work/done`, { workId });
  }
}
