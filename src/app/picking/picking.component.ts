// src/app/picking/picking.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickingService, PickingRow } from '../services/picking.service';
import { environment } from '../environments/environment';
@Component({
  selector: 'app-picking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './picking.component.html',
  styleUrls: ['./picking.component.css'],
})
export class PickingComponent implements OnInit {
  shop = 'cropndtop.myshopify.com';
  from = ''; // ISO date
  to = '';   // ISO date
  loading = false;
  error = '';
  now = new Date();
  rows = signal<PickingRow[]>([]);
  q = signal(''); // search

  filtered = computed(() => {
    const term = this.q().toLowerCase().trim();
    const list = this.rows();
    if (!term) return list;
    return list.filter(x =>
      (x.SKU || '').toLowerCase().includes(term) ||
      (x.TITLE || '').toLowerCase().includes(term) ||
      (x.VARIANT_TITLE || '').toLowerCase().includes(term)
    );
  });

  constructor(private api: PickingService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading = true; this.error = '';
    this.api.getPickingList({ shop: this.shop, from: this.from, to: this.to })
      .subscribe({
        next: items => { this.rows.set(items); this.loading = false; },
        error: e => { this.error = e?.message ?? 'Failed to load'; this.loading = false; }
      });
  }
// picking.component.ts (add method)
print() {
  const params = new URLSearchParams();
  params.set('shop', this.shop);
  if (this.q()?.trim()) params.set('q', this.q().trim());

  const url = `${environment.API_BASE_URL}/api/print/picking?${params.toString()}`;
  window.open(url, '_blank', 'noopener'); // top-level navigation → CORS not needed
}
}
