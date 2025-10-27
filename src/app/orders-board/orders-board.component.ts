import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Order, OrdersService } from '../services/orders.service';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ExportService } from '../services/export.service';
import { PrintModalComponent } from '../print-modal/print-modal.component';
import { DeliveryDateModalComponent } from '../delivery-date-modal/delivery-date-modal.component';

@Component({
  selector: 'app-orders-board',
  standalone: true,
  imports: [CommonModule, FormsModule, PrintModalComponent, DeliveryDateModalComponent],
  providers: [DatePipe],
  templateUrl: './orders-board.component.html',
  styleUrls: ['./orders-board.component.css']
})

export class OrdersBoardComponent implements OnInit {
  @ViewChild(PrintModalComponent) printModal?: PrintModalComponent;
  activeTab: 'orders' | 'list' = 'orders';
  showDateModal = false;
  dateModalOrder: any = null;
  onlyDated = false; // optional toggle in List tab
  initialDeliverBy: string | null = null;
  initialNote : string | null = null;
  listCardMax = 20; // show up to 20 non-empty day cards
  orders: (Order & { items?: any[] })[] = [];
  loading = false;
  error = '';
  selectedOrder: any = null;
  showPrint = false;
  // shipday export controls (unchanged)
  exportShop = 'cropndtop.myshopify.com';
  exportDate = new Date().toISOString().slice(0, 10);
  printStoreName = 'cropndtop';
  private has(o: Order, t: string) { return o.tags.map(x => x.toLowerCase()).includes(t.toLowerCase()); }
  private isComplete(o: Order) { return this.has(o, 'complete'); }

  constructor(private ordersSvc: OrdersService, private exportSvc: ExportService) { 
    
  }
  printCards() {
    // collect rows: flatten dateCards order entries
    const rows: Array<{ store: string, orderName: string, customer: string, city: string, dateLabel: string, note?: string }> = [];
    for (const day of this.dateCards) {
      for (const o of (day.orders || [])) {
        rows.push({
          store: this.printStoreName,
          orderName: o.orderName || `#${o.orderId}`,
          customer: o.shipTo?.name || '',
          city: o.shipTo?.city || '',
          dateLabel: day.dateLabel,                // human-friendly date label (Mon, 01/01/2025)
          note: (o.noteLocal || '')                // local note entered in date modal
        });
      }
    }
  
    if (!rows.length) {
      alert('No dated orders to print.');
      return;
    }
  
    // build simple printable HTML
    const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (!win) { alert('Popup blocked. Allow popups to print.'); return; }
  
    const style = `
      <style>
        body{font-family:Segoe UI,system-ui,sans-serif;padding:16px;color:#111}
        h1{font-size:18px;margin:0 0 12px 0}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}
        th{background:#f5f5f5}
        .note{white-space:pre-wrap;font-size:0.95rem;color:#333}
        .small{font-size:0.85rem;color:#555}
        @media print { body{padding:8px} }
      </style>
    `;
  
    const head = `<h1>Delivery cards — ${this.printStoreName}</h1><p class="small">Printed: ${new Date().toLocaleString()}</p>`;
    const tableHead = `<table><thead><tr><th>Order</th><th>Customer</th><th>City</th><th>Deliver Date</th><th>Note (local)</th></tr></thead><tbody>`;
    const tableRows = rows.map(r => `
      <tr>
        <td><strong>${this.escapeHtml(r.orderName)}</strong><div class="small">${this.escapeHtml(r.store)}</div></td>
        <td>${this.escapeHtml(r.customer)}</td>
        <td>${this.escapeHtml(r.city)}</td>
        <td>${this.escapeHtml(r.dateLabel)}</td>
        <td class="note">${this.escapeHtml(r.note || '')}</td>
      </tr>
    `).join('');
    const tableFooter = `</tbody></table>`;
  
    win.document.write(`<html><head><title>Print delivery cards</title>${style}</head><body>${head}${tableHead}${tableRows}${tableFooter}</body></html>`);
    win.document.close();
  
    // small helper to wait a tick before printing
    setTimeout(() => {
      win.focus();
      win.print();
      // optionally close window after printing:
      // setTimeout(()=>win.close(), 500);
    }, 300);
  }
  
  private escapeHtml(s: string) {
    return (s || '').toString()
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }
// ── helpers: weekdays ────────────────────────────────────────────────────────
private isWeekend(d: Date) {
  const day = d.getDay(); // 0 Sun .. 6 Sat
  return day === 0 || day === 6;
}
private nextBusinessDay(d: Date): Date {
  const x = new Date(d);
  while (this.isWeekend(x)) x.setDate(x.getDate() + 1);
  return x;
}
private addBusinessDays(d: Date, n: number): Date {
  const x = new Date(d);
  let added = 0;
  while (added < n) {
    x.setDate(x.getDate() + 1);
    if (!this.isWeekend(x)) added++;
  }
  return x;
}

// keep your UTC-safe label
private dateLabelFromISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString(undefined, {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'
  });
}
private ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
private fromYMD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ── business rules: auto date when missing ───────────────────────────────────
public isOutsideLebanon(o: Order): boolean {
  const c = (o.shipTo?.country || '').trim().toLowerCase();
  return !!c && c !== 'lebanon';
}


private deliverDateFor(o: Order): string | null {
  // if explicitly set, use it as-is
  if (o.deliverBy) return o.deliverBy;

  // only auto-place for pending/processing
  const s = this.statusOf(o);
  if (s !== 'pending' && s !== 'processing') return null;

  const created = (o.createdAt instanceof Date && !isNaN(o.createdAt as any))
    ? o.createdAt as Date
    : (o.updatedAt || new Date());

  if (this.isExpress(o)) {
    // 2 business days after created
    const d = this.addBusinessDays(created, 2);
    return this.ymd(d);
  }
  if (this.isOutsideLebanon(o)) {
    // next business day
    const d = this.addBusinessDays(created, 1);
    return this.ymd(d);
  }

  return null; // otherwise leave un-dated
}
// earliest start = earliest (explicit OR auto) date, then snap to weekday
private startDayForCards(): Date {
  const dates: string[] = [];

  for (const o of (this.orders || [])) {
    const s = this.statusOf(o);
    if (s !== 'pending' && s !== 'processing') continue;
    const d = this.deliverDateFor(o);
    if (d) dates.push(d);
  }

  if (dates.length) {
    dates.sort(); // ISO asc
    return this.nextBusinessDay(this.fromYMD(dates[0]));
  }

  const today = this.nextBusinessDay(new Date(new Date().setHours(0,0,0,0)));
  return today;
}

// ── dateCards: 20 *weekdays* continuous; includes auto-dated orders ─────────
get dateCards(): { dateISO: string; dateLabel: string; orders: (Order & { isExpress: boolean })[] }[] {
  // index orders by final “display date”
  const byDay = new Map<string, (Order & { isExpress: boolean })[]>();

  for (const o of (this.orders || [])) {
    const s = this.statusOf(o);
    if (s !== 'pending' && s !== 'processing') continue;

    const key = this.deliverDateFor(o); // explicit or auto per rules
    if (!key) continue;

    const arr = byDay.get(key) ?? [];
    arr.push({ ...(o as any), isExpress: this.isExpress(o) });
    byDay.set(key, arr);
  }

  const out: { dateISO: string; dateLabel: string; orders: (Order & { isExpress: boolean })[] }[] = [];
  let d = this.startDayForCards();

  while (out.length < this.listCardMax) {
    if (!this.isWeekend(d)) {
      const iso = this.ymd(d);
      const orders = (byDay.get(iso) || []).sort((a, b) =>
        (a.orderName || a.orderId).localeCompare(b.orderName || b.orderId)
      );
      out.push({ dateISO: iso, dateLabel: this.dateLabelFromISO(iso), orders });
    }
    d = new Date(d); d.setDate(d.getDate() + 1); // advance calendar one day; weekend days will be skipped
  }

  return out;
}

get last3OpenOrders(): Order[] {
  const open = (this.orders || []).filter(o => {
    const s = this.statusOf(o);
    return s !== 'shipped' && s !== 'complete' && s !== 'cancel';
  });
  open.sort((a,b) => (a.createdAt?.getTime() ?? a.updatedAt?.getTime() ?? 0)
                   - (b.createdAt?.getTime() ?? b.updatedAt?.getTime() ?? 0)); // oldest first
  return open.slice(0,3);
}




  private beirutNowFrom(d: Date): Date {
    // your browser is already Asia/Beirut; if you want to be explicit you can keep as-is.
    return d; 
  }
  private autoDeliverByForExpress(o: Order): string {
    const created = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt as any);
    const local = this.beirutNowFrom(created);
    const hr = local.getHours();
    const base = new Date(local);
    base.setDate(base.getDate() + (hr < 12 ? 1 : 2));
    return base.toISOString().slice(0,10); // YYYY-MM-DD
  }
  
  canEditDate(o: Order) {
    const s = this.statusOf(o);
    return s === 'pending' || s === 'processing';
  }
  
  openDateModal(o: Order) {
    if (!this.canEditDate(o)) return;
    this.dateModalOrder = o;
  
    let initial: string | null = o.deliverBy ?? null;
    if (!initial && this.isExpress(o)) {
      initial = this.autoDeliverByForExpress(o);
    }
    this.initialDeliverBy = initial;
    this.initialNote = o.noteLocal ?? null;
    this.showDateModal = true;
  }
  
  // update signature: saveDateModal(payload)
  saveDateModal(payload: { date: string | null, note: string | null }) {
    const o = this.dateModalOrder;
    if (!o) return;
  
    const prevDate = o.deliverBy ?? null;
    const prevNote = o.noteLocal ?? null;
  
    // optimistic UI
    o.deliverBy = payload.date ?? null;
    o.noteLocal = payload.note ?? null;
  
    // persist both: first deliverBy (existing endpoint) then note
    this.ordersSvc.setDeliverBy(o.shopDomain, o.orderId, o.deliverBy).subscribe({
      next: r => {
        if (!r?.ok) {
          o.deliverBy = prevDate;
        }
        // now persist note
        this.ordersSvc.setNoteLocal(o.shopDomain, o.orderId, o.noteLocal).subscribe({
          next: res => { if (!res?.ok) o.noteLocal = prevNote; },
          error: () => { o.noteLocal = prevNote; }
        });
      },
      error: () => {
        o.deliverBy = prevDate;
        // still try to persist note fallback if desired
        this.ordersSvc.setNoteLocal(o.shopDomain, o.orderId, o.noteLocal).subscribe({ error: ()=>{} });
      }
    });
  
    this.closeDateModal();
  }
closeDateModal() {
  this.showDateModal = false;
  setTimeout(() => {
    this.dateModalOrder = null;
    this.initialDeliverBy = null; // cleanup
  }, 0);
}
  

  
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
