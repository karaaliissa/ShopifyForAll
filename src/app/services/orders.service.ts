import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { OrdersResponse, Order } from '../models/order';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private base = 'https://shopify-sheets-backend.vercel.app/api/orders';
  constructor(private http: HttpClient) {}

  getOrders(params?: { shop?: string; status?: string; limit?: number }) {
    const httpParams = new HttpParams({ fromObject: { ...params } });
    return this.http.get<{ ok: boolean; items: any[] }>(this.base, { params: httpParams });
  }
}
