  // services/driver.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DriverService {
  private base = ''; // use proxy in dev, full URL in prod

  constructor(private http: HttpClient) {}

  createRun(payload: { date?: string; driverId: string; orderIds: (string|number)[]; assigner?: string }) {
    return this.http.post<{ok:boolean; runId:string; stopsCount:number}>(`${this.base}/api/runs/create`, payload);
  }

  list(date?: string) {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.http.get<{ok:boolean; items:any[]}>(`${this.base}/api/runs/list`, { params }).pipe(map(r => r?.ok ? r.items : []));
  }

  updateStop(payload: { runId: string; stopId: string; status: string; codAmount?: number|string; notes?: string }) {
    return this.http.post<{ok:boolean}>(`${this.base}/api/runs/stop-status`, payload);
  }

  forDriver(driverId: string, date?: string) {
  const params = new HttpParams({ fromObject: { driverId, ...(date ? { date } : {}) }});
  return this.http
    .get<{ ok: boolean; items: any[] }>(`/api/runs/for-driver`, { params })
    .pipe(map(r => r?.ok ? r.items : []));
}

}
