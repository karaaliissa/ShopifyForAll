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
  createRun(payload: {
    date?: string; driverId: string;
    orderStops: {orderId:string; customerName?:string; address?:string; phone?:string; codAmount?:number; eta?:string; notes?:string}[];
    notes?: string; assigner?: string;
  })
   {
    return this.http.post<{ok:boolean; runId:string; stops:number}>(`${this.base}/api/runs/create`, payload);
  }

  getRunForDriver(driverId: string, date?: string) {
    const params = new HttpParams({ fromObject: { driverId, ...(date?{date}:{}) } });
    return this.http.get<{ok:boolean; run:any; stops:any[]}>(`${this.base}/api/runs/for-driver`, { params });
  }

  stopStatus(runId: string, stopId: number, status: string, codAmount?: number) {
    return this.http.post<{ok:boolean}>(`${this.base}/api/runs/stop-status`, { runId, stopId, status, codAmount });
  }

  remit(runId: string, driverId: string, amount: number, receiver: string) {
    return this.http.post<{ok:boolean}>(`${this.base}/api/runs/remit`, { runId, driverId, amount, receiver });
  }

}
