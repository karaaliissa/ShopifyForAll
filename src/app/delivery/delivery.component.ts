// src/app/delivery/delivery.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DriverService } from '../services/driver.service';
import { OrdersService, Order } from '../services/orders.service';

@Component({
  standalone: true,
  selector: 'app-delivery',
  imports: [CommonModule, FormsModule, NgIf, NgFor],
  templateUrl: './delivery.component.html',
  styleUrls: ['./delivery.component.css']
})
export class DeliveryComponent implements OnInit {
  driverId = '';
  selected = new Set<string>(); // orderIds
  today = new Date().toISOString().slice(0,10);
  loading = false; error = '';
  trackOrder = (_: number, o: Order) => o.orderId;
  trackRun   = (_: number, r: any)    => r.RUN_ID;
  trackStop  = (_: number, s: any)    => s.RUN_ID + '|' + s.STOP_ID;
  orders: Order[] = [];
  runs = signal<any[]>([]);

  constructor(private drivers: DriverService, private ordersSvc: OrdersService) {}

  ngOnInit() {
    this.ordersSvc.getOrders({ limit: 50 }).subscribe(o => this.orders = o);
    this.refreshRuns();
  }

  toggle(orderId: string) {
    this.selected.has(orderId) ? this.selected.delete(orderId) : this.selected.add(orderId);
  }

  createRun() {
    if (!this.driverId || this.selected.size === 0) return;
    this.loading = true; this.error = '';
    this.drivers.createRun({ date: this.today, driverId: this.driverId, orderIds: [...this.selected] })
      .subscribe({
        next: () => { this.selected.clear(); this.loading = false; this.refreshRuns(); },
        error: e => { this.error = e?.message ?? 'Failed'; this.loading = false; }
      });
  }

  refreshRuns() {
    this.drivers.list(this.today).subscribe(items => this.runs.set(items));
  }
}
