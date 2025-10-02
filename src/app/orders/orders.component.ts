import { Component, OnInit } from '@angular/core';
import { OrdersService } from '../services/orders.service';
import { Order } from '../models/order';
import { CommonModule, DatePipe } from '@angular/common';
import { interval, switchMap, startWith } from 'rxjs';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
  imports: [CommonModule, DatePipe]
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = false;
  error = '';

  constructor(private ordersSvc: OrdersService) { }

  ngOnInit() {
    interval(15000).pipe(
      startWith(0),
      switchMap(() => this.ordersSvc.getOrders())
    ).subscribe({
      next: items => this.orders = items,
      error: err => this.error = err?.message ?? 'Failed to load'
    });
    this.fetch();
  }

  fetch() {
    this.loading = true;
    this.error = '';
    this.ordersSvc.getOrders().subscribe({
      next: (items) => {
        this.orders = items;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message ?? 'Failed to load orders';
        this.loading = false;
      },
    });
  }
}
