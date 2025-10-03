// src/app/driver/driver.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DriverService } from '../services/driver.service';

type Stop = {
  RUN_ID: string; STOP_ID: string; ORDER_ID: string;
  CUSTOMER_NAME: string; ADDRESS: string; PHONE: string;
  COD_AMOUNT?: string | number; STATUS: string;
};

@Component({
  standalone: true,
  selector: 'app-driver',
  imports: [CommonModule, FormsModule],
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.css']
})
export class DriverComponent implements OnInit {
  driverId = '';
  date = new Date().toISOString().slice(0,10);
  loading = false; error = '';

  runs = signal<any[]>([]);
  cod: Record<string,string> = {}; // key: RUN|STOP -> COD

  constructor(private api: DriverService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.driverId = (this.route.snapshot.queryParamMap.get('driverId') || '').trim();
    if (!this.driverId) {
      // allow typing driverId in UI; or redirect from link with ?driverId=
    }
    this.refresh();
  }

  refresh() {
    if (!this.driverId) return;
    this.loading = true; this.error = '';
    this.api.forDriver(this.driverId, this.date).subscribe({
      next: items => { this.runs.set(items); this.loading = false; },
      error: e => { this.error = e?.message ?? 'Failed'; this.loading = false; }
    });
  }

  wKey(runId: string, stopId: string) { return `${runId}|${stopId}`; }

  waLink(phone?: string) {
    const p = (phone || '').replace(/[^\d]/g, '');
    return p ? `https://wa.me/${p}` : '';
  }
  mapLink(addr?: string) { return addr ? `https://maps.google.com/?q=${encodeURIComponent(addr)}` : '#'; }
  telLink(phone?: string) { return phone ? `tel:${phone}` : '#'; }

  setStatus(runId: string, stopId: string, status: 'out_for_delivery'|'delivered'|'delayed') {
    const key = this.wKey(runId, stopId);
    const codAmount = this.cod[key];
    this.loading = true;
    this.api.updateStop({ runId, stopId, status, codAmount }).subscribe({
      next: () => { this.loading = false; this.refresh(); },
      error: e => { this.error = e?.message ?? 'Failed'; this.loading = false; }
    });
  }

  setDriverId(id: string) {
    this.driverId = id.trim();
    this.router.navigate([], { queryParams: { driverId: this.driverId || null }, queryParamsHandling: 'merge' });
    this.refresh();
  }
}
