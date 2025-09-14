import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ShopifyService {
  private apiUrl = 'http://localhost:5155/api'; // change later to your domain

  constructor(private http: HttpClient) {}

  getOrders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/orders`);
  }

  getOrderDetail(orderId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/orders/${orderId}`);
  }
}
