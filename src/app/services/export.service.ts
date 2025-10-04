// src/app/services/export.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private base = environment.API_BASE_URL;
  constructor(private http: HttpClient) {}

  shipday(shop: string, date: string): Observable<HttpResponse<Blob>> {
    const params = new HttpParams({ fromObject: { shop, date } });
    return this.http.get(`${this.base}/api/shipday`, {  // <-- changed path
      params,
      responseType: 'blob',
      observe: 'response'
    });
  }
  
}
