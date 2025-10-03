import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductionService, WorkRow } from '../services/production.service';

const STAGES = ['cutting','sewing','qa_ready','packed']; // extend later

@Component({
  selector: 'app-production-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './production-board.component.html',
  styleUrls: ['./production-board.component.css']
})
export class ProductionBoardComponent implements OnInit {
  shop = 'cropndtop.myshopify.com';
  date = ''; // optional YYYY-MM-DD
  loading = false; error = '';
  columns = signal<Record<string, WorkRow[]>>(STAGES.reduce((acc, s) => {
    acc[s] = [];
    return acc;
  }, {} as Record<string, WorkRow[]>));

  constructor(private api: ProductionService) {}

  ngOnInit() { this.refreshAll(); }

  refreshAll() {
    this.loading = true; this.error = '';
    Promise.all(
      STAGES.map(s => this.api.list({ stage: s, shop: this.shop, date: this.date }).toPromise())
    ).then(results => {
      const col: Record<string, WorkRow[]> = {};
      STAGES.forEach((s,i) => col[s] = results[i] || []);
      this.columns.set(col);
      this.loading = false;
    }).catch(e => { this.error = e?.message ?? 'Failed'; this.loading = false; });
  }

  markDone(w: WorkRow) {
    this.api.done(w.WORK_ID).subscribe({
      next: () => this.refreshAll(),
      error: e => this.error = e?.message ?? 'Failed to mark done'
    });
  }

  moveTo(nextStage: string, w: WorkRow) {
    // close current
    this.api.done(w.WORK_ID).subscribe({
      next: () => {
        // open new stage as a new work row
        this.api.start({
          shopDomain: w.SHOP_DOMAIN, orderId: w.ORDER_ID, lineId: w.LINE_ID,
          stage: nextStage, qty: w.QTY, sku: w.SKU, title: w.TITLE, variantTitle: w.VARIANT_TITLE
        }).subscribe({ next: () => this.refreshAll() });
      },
      error: e => this.error = e?.message ?? 'Failed to move'
    });
  }

  nextStage(s: string) {
    const i = STAGES.indexOf(s);
    return i >= 0 && i < STAGES.length - 1 ? STAGES[i+1] : null;
  }
}
