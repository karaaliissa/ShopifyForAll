  // services/driver.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DriverService {
  private base = ''; // use proxy in dev, full URL in prod

  constructor(private http: HttpClient) {}

   // Admin: create a run and stops
   createRun(payload: { date: string; driverId: string; orderIds: string[]; assigner?: string }) {
    return this.http.post<{ ok: boolean; runId: string }>(`${this.base}/api/runs/create`, payload);
  }

  // Admin: list all runs for a date (all drivers)
  list(date: string): Observable<any[]> {
    const params = new HttpParams({ fromObject: { date } });
    return this.http
      .get<{ ok: boolean; runs?: any[]; items?: any[] }>(`${this.base}/api/runs/list`, { params })
      .pipe(map(r => r.runs || r.items || []));
  }

  // Already used by DriverComponent (keep as is if you have it)
  forDriver(driverId: string, date: string): Observable<any[]> {
    const params = new HttpParams({ fromObject: { driverId, date } });
    return this.http
      .get<{ ok:boolean; items?: any[]; runs?: any[] }>(`${this.base}/api/runs/for-driver`, { params })
      .pipe(map(r => r.runs || r.items || []));
  }

  updateStop(payload: { runId: string; stopId: string|number; status: string; codAmount?: string|number }) {
    return this.http.post<{ ok:boolean }>(`${this.base}/api/runs/stop-status`, payload);
  }

}
