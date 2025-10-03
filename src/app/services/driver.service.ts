// src/app/services/driver.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class DriverService {
  private base = environment.API_BASE_URL;

  constructor(private http: HttpClient) {}

  forDriver(driverId: string, date: string) {
    const params = new HttpParams({ fromObject: { driverId, date } });
    return this.http
      .get<{ ok: boolean; items?: any[]; runs?: any[] }>(`${this.base}/api/runs/for-driver`, { params })
      .pipe(map(r => r.items ?? r.runs ?? []));
  }

  createRun(payload: { date: string; driverId: string; orderIds: string[]; assigner?: string }) {
    return this.http.post<{ ok: boolean; runId: string }>(`${this.base}/api/runs/create`, payload);
  }

  list(date: string) {
    const params = new HttpParams({ fromObject: { date } });
    return this.http
      .get<{ ok: boolean; runs?: any[]; items?: any[] }>(`${this.base}/api/runs/list`, { params })
      .pipe(map(r => r.runs ?? r.items ?? []));
  }

  updateStop(payload: { runId: string; stopId: string|number; status: string; codAmount?: string|number }) {
    return this.http.post<{ ok:boolean }>(`${this.base}/api/runs/stop-status`, payload);
  }
}
