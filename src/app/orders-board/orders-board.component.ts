import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Order, OrdersService } from '../services/orders.service';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ExportService } from '../services/export.service';
import { PrintModalComponent } from '../print-modal/print-modal.component';

@Component({
  selector: 'app-orders-board',
  standalone: true,
  imports: [CommonModule, FormsModule, PrintModalComponent],
  providers: [DatePipe],
  templateUrl: './orders-board.component.html',
  styleUrls: ['./orders-board.component.css']
})

export class OrdersBoardComponent implements OnInit {
  @ViewChild(PrintModalComponent) printModal?: PrintModalComponent;
  activeTab: 'orders' | 'list' = 'orders';
  orders: (Order & { items?: any[] })[] = [];
  loading = false;
  error = '';
  selectedOrder: any = null;
  showPrint = false;
  // shipday export controls (unchanged)
  exportShop = 'cropndtop.myshopify.com';
  exportDate = new Date().toISOString().slice(0, 10);
  private has(o: Order, t: string) { return o.tags.map(x => x.toLowerCase()).includes(t.toLowerCase()); }
  private isComplete(o: Order) { return this.has(o, 'complete'); }

  constructor(private ordersSvc: OrdersService, private exportSvc: ExportService) { }
  // get filteredOrders(): (Order & { items?: any[] })[] {
  //   if (this.activeTab === 'complete') return this.orders.filter(o => this.isComplete(o));
  //   return this.orders.filter(o => !this.isComplete(o));
  // }
  // ---- Canonical status per order ----
  statusOf(o: Order): 'pending' | 'processing' | 'shipped' | 'complete' | 'cancel' {
    // priority by business flow
    if (this.has(o, 'complete'))   return 'complete';
    if (this.has(o, 'cancel'))     return 'cancel';
    if (this.has(o, 'shipped'))    return 'shipped';
    if (this.has(o, 'processing')) return 'processing';

    // else: pending if tag says so OR fulfillment looks open/unfulfilled/empty
    const f = (o.fulfillmentStatus || '').toString().trim().toLowerCase();
    if (this.has(o, 'pending') || f === '' || f === 'open' || f === 'unfulfilled') {
      return 'pending';
    }
    // fallback: treat unknowns as pending
    return 'pending';
  }
  private statusIs(o: Order, s: ReturnType<OrdersBoardComponent['statusOf']>) {
    return this.statusOf(o) === s;
  }
  get pendingCount()    { return this.orders.filter(o => this.statusOf(o) === 'pending').length; }
  get processingCount() { return this.orders.filter(o => this.statusOf(o) === 'processing').length; }
  get shippedCount()    { return this.orders.filter(o => this.statusOf(o) === 'shipped').length; }
  get completeCount()   { return this.orders.filter(o => this.statusOf(o) === 'complete').length; }
  get cancelCount()     { return this.orders.filter(o => this.statusOf(o) === 'cancel').length; }
  get expressPendingCount() {
    return this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'pending')).length;
  }
  get expressProcessingCount() {
    return this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'processing')).length;
  }
  get expressShippedCount() {
    return this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'shipped')).length;
  }
  get expressCompleteCount() {
    return this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'complete')).length;
  }
  get expressCancelCount() {
    return this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'cancel')).length;
  }
  // Left badge label/class (use the same canonical status)
  fulfillmentLabel(o: Order): string {
    const m = this.statusOf(o);
    // Capitalize for display
    return m.charAt(0).toUpperCase() + m.slice(1);
  }
  fulfillmentClass(o: Order): string {
    return this.statusOf(o); // maps to .badge.pending / .badge.processing ...
  }
 // Totals (all orders)
 get grandTotal(): number {
  return (this.orders || []).reduce((sum, o: any) => sum + (o.total || 0), 0);
}
get totalsCurrency(): string | undefined {
  return this.orders?.find(o => !!o.currency)?.currency;
}
  // (totalsCurrency unchanged)

  nextActions(o: Order): string[] {
    const hasProcessing = this.has(o, 'processing');
    const hasShipped = this.has(o, 'shipped');
    const hasComplete = this.has(o, 'complete');
    const hasCancel = this.has(o, 'cancel');

    if (hasComplete) return [];                 // locked
    if (hasShipped) return ['Complete'];       // only move to complete
    if (hasProcessing) return ['Shipped', 'Cancel'];
    if (hasCancel) return [];                   // cancelled → no further actions
    return ['Processing', 'Cancel'];             // start state
  }

  // onNextAction(o: Order, e: Event) {
  //   const value = (e.target as HTMLSelectElement).value;
  //   if (!value) return;

  //   // Prevent regress after Complete
  //   if (this.has(o, 'complete') && value.toLowerCase() !== 'complete') {
  //     (e.target as HTMLSelectElement).value = '';
  //     alert('Order is complete. You cannot move it back.');
  //     return;
  //   }
  // }
  openPrintModal(order: any) {
    this.selectedOrder = order;
    this.showPrint = true;
  }
  onModalClosed() {
    // hide + fully reset so reopening the same order works
    this.showPrint = false;
    setTimeout(() => { this.selectedOrder = null; }, 0);
  }
  onNextAction(o: Order, e: Event) {
    const sel = e.target as HTMLSelectElement;
    const value = sel.value;
    if (!value) return;

    // guard: don't allow regress after Complete
    if (this.has(o, 'complete') && value.toLowerCase() !== 'complete') {
      sel.value = '';
      alert('Order is complete. You cannot move it back.');
      return;
    }

    // optimistic add (keep history)
    const prev = [...o.tags];
    const already = o.tags.map(t => t.toLowerCase()).includes(value.toLowerCase());
    if (!already) o.tags = [...o.tags, value];

    this.ordersSvc.addTagRemote(o.shopDomain, o.orderId, value).subscribe({
      next: r => { if (!r?.ok) o.tags = prev; },  // rollback on soft error
      error: () => { o.tags = prev; }             // rollback on network error
    });

    // reset dropdown to "Add tag"
    sel.selectedIndex = 0;
  }
  // 🚫 No auto-load. Leave empty if you truly want manual fetch only.
  ngOnInit() { }

  /** Manually fetch orders + their items */
  fetch() {
    this.loading = true;
    this.error = '';
    this.ordersSvc.getOrders({ limit: 100 /* no refresh param */ }).subscribe({
      next: (rows) => {
        this.orders = rows;
        this.loading = false;

        // fetch items for each order once per click (manual, no timers)
        this.orders.forEach(o => {
          this.ordersSvc.getOrderItems(o.shopDomain, o.orderId).subscribe(items => {
            o.items = items || [];
          });
        });
      },
      error: (err) => {
        this.error = err?.message ?? 'Failed to load orders';
        this.loading = false;
      }
    });
  }

  /** Optional Shipday export (manual action) */
  exportShipday() {
    this.exportSvc.shipday(this.exportShop, this.exportDate).subscribe({
      next: res => {
        const cd = res.headers.get('Content-Disposition') || '';
        const match = /filename="?([^"]+)"?/.exec(cd);
        const filename = match?.[1] || `shipday-${this.exportDate}.csv`;

        const blob = new Blob([res.body!], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
      error: () => alert('Failed to export Shipday CSV.')
    });
  }

  // --- UI helpers unchanged ---
  isExpress(o: Order): boolean {
    return /\bexpress\b/i.test(o.shippingMethod || '');
  }

  isOld(o: Order): boolean {
    const d = o.createdAt || o.updatedAt;
    if (!d) return false;
    const ageDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    const tags = (o.tags || []).join(',');
    const shippedOrComplete = /\b(shipped|complete)\b/i.test(tags);
    return ageDays > 7 && !shippedOrComplete;
  }

  addTag(order: Order, tag: string) {
    if (tag && !order.tags?.includes(tag)) {
      order.tags = [...order.tags, tag];
    }
  }

  /** Tag change = optimistic update only; NO automatic refetch */
  // onTagChange(o: Order, event: Event) {
  //   const value = (event.target as HTMLSelectElement).value;
  //   if (!value) return;

  //   const prev = [...(o.tags || [])];
  //   if (!o.tags.includes(value)) o.tags = [...o.tags, value];

  //   this.ordersSvc.addTagRemote(o.shopDomain, o.orderId, value).subscribe({
  //     next: (res) => {
  //       if (!res?.ok) o.tags = prev; // rollback on soft error
  //       // No automatic refresh here; manual fetch button controls reload.
  //     },
  //     error: () => { o.tags = prev; } // rollback on network error
  //   });

  //   (event.target as HTMLSelectElement).value = '';
  // }
  onTagChange(o: Order, event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) return;

    // Add and persist (keep history), optimistic UI
    const prev = [...(o.tags || [])];
    const already = (o.tags || []).map(t => t.toLowerCase()).includes(value.toLowerCase());
    if (!already) o.tags = [...(o.tags || []), value];

    this.ordersSvc.addTagRemote(o.shopDomain, o.orderId, value).subscribe({
      next: r => { if (!r?.ok) o.tags = prev; },   // rollback on soft error
      error: () => { o.tags = prev; }              // rollback on network error
    });

    (event.target as HTMLSelectElement).value = '';
  }

  removeTag(o: Order, tag: string) {
    // Optional guard: don’t allow removing 'complete' without confirmation
    if (tag.toLowerCase() === 'complete') {
      if (!confirm('This order is Complete. Are you sure you want to remove that status?')) return;
    }

    const prev = [...o.tags];
    o.tags = o.tags.filter(t => t.toLowerCase() !== tag.toLowerCase());

    this.ordersSvc.removeTagRemote(o.shopDomain, o.orderId, tag).subscribe({
      next: r => { if (!r?.ok) o.tags = prev; },
      error: () => { o.tags = prev; }
    });
  }
  getTags(tags?: string[]): string[] {
    return (tags || []).map(t => t.trim()).filter(t => t.length > 0);
  }

  
  parseProps(json?: string): { name: string; value: any }[] {
    if (!json) return [];
    try { return JSON.parse(json); } catch { return []; }
  }
  private ensureItemsLoaded(o: Order & { items?: any[] }): Promise<void> {
    if (o.items && o.items.length >= 0) return Promise.resolve();
    return firstValueFrom(this.ordersSvc.getOrderItems(o.shopDomain, o.orderId))
      .then(items => { o.items = items || []; })
      .catch(() => { /* ignore; print still works without thumbs */ });
  }
  // NEW
  async onPrintAndProcess(o: Order & { items?: any[] }) {
    // 1) Optimistically add "Processing" tag (if not already)
    const already = (o.tags || []).map(t => t.toLowerCase()).includes('processing');
    const prev = [...(o.tags || [])];
    if (!already) {
      o.tags = [...(o.tags || []), 'Processing'];
      this.ordersSvc.addTagRemote(o.shopDomain, o.orderId, 'Processing').subscribe({
        next: r => { if (!r?.ok) o.tags = prev; },
        error: () => { o.tags = prev; }
      });
    }

    // 2) Make sure item images are loaded (optional)
    await this.ensureItemsLoaded(o);

    // 3) Open modal and trigger multi-print
    this.selectedOrder = o;
    this.showPrint = true;

    // Wait a tick for the modal to mount, then call printBundle
    setTimeout(async () => {
      try {
        await this.printModal?.printBundle({ invoice: 2, packing: 1 });
      } finally {
        // 4) Close modal after print
        this.onModalClosed();
      }
    }, 50);
  }
}
