import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Order, OrdersService, OrdersSummary } from '../services/orders.service';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ExportService } from '../services/export.service';
import { PrintModalComponent } from '../print-modal/print-modal.component';
import { DeliveryDateModalComponent } from '../delivery-date-modal/delivery-date-modal.component';

type UIOrder = Order & { items?: any[] };
type StatusFilter = 'all' | 'pending' | 'processing' | 'shipped' | 'complete' | 'cancel';

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

  activeTab: 'orders' | 'list' | 'done' = 'orders';
  statusFilter: StatusFilter = 'all';    // 👈 which chip is active

  showDateModal = false;
  dateModalOrder: any = null;
  onlyDated = false;
  initialDeliverBy: string | null = null;
  initialNote: string | null = null;
  listCardMax = 20;

  orders: UIOrder[] = [];
  loading = false;
  error = '';
  selectedOrder: any = null;
  showPrint = false;

  // search
  searchTerm: string = '';

  // shipday export
  exportShop = 'cropndtop.myshopify.com';
  exportDate = new Date().toISOString().slice(0, 10);
  printStoreName = 'cropndtop';

  summary: OrdersSummary | null = null;
  pageSize = 25;
  cursor: string | null = null;
  nextCursor: string | null = null;

  constructor(private ordersSvc: OrdersService, private exportSvc: ExportService) {}

  // --- helpers for tags / status -------------------------------------------------
  private has(o: Order, t: string) {
    return o.tags.map(x => x.toLowerCase()).includes(t.toLowerCase());
  }
  private isComplete(o: Order) { return this.has(o, 'complete'); }

  statusOf(o: Order): 'pending' | 'processing' | 'shipped' | 'complete' | 'cancel' {
    if (this.has(o, 'complete'))   return 'complete';
    if (this.has(o, 'cancel'))     return 'cancel';
    if (this.has(o, 'shipped'))    return 'shipped';
    if (this.has(o, 'processing')) return 'processing';

    const f = (o.fulfillmentStatus || '').toString().trim().toLowerCase();
    if (this.has(o, 'pending') || f === '' || f === 'open' || f === 'unfulfilled') {
      return 'pending';
    }
    return 'pending';
  }
  private statusIs(o: Order, s: ReturnType<OrdersBoardComponent['statusOf']>) {
    return this.statusOf(o) === s;
  }

  fulfillmentLabel(o: Order): string {
    const m = this.statusOf(o);
    return m.charAt(0).toUpperCase() + m.slice(1);
  }
  fulfillmentClass(o: Order): string {
    return this.statusOf(o);
  }

  // --- counters ------------------------------------------------------------------
  get pendingCount()    { return this.summary?.pending    ?? this.orders.filter(o => this.statusOf(o) === 'pending').length; }
  get processingCount() { return this.summary?.processing ?? this.orders.filter(o => this.statusOf(o) === 'processing').length; }
  get shippedCount()    { return this.summary?.shipped    ?? this.orders.filter(o => this.statusOf(o) === 'shipped').length; }
  get completeCount()   { return this.summary?.complete   ?? this.orders.filter(o => this.statusOf(o) === 'complete').length; }
  get cancelCount()     { return this.summary?.cancel     ?? this.orders.filter(o => this.statusOf(o) === 'cancel').length; }

  get expressPendingCount()    { return this.summary?.expressPending    ?? this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'pending')).length; }
  get expressProcessingCount() { return this.summary?.expressProcessing ?? this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'processing')).length; }
  get expressShippedCount()    { return this.summary?.expressShipped    ?? this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'shipped')).length; }
  get expressCompleteCount()   { return this.summary?.expressComplete   ?? this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'complete')).length; }
  get expressCancelCount()     { return this.summary?.expressCancel     ?? this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'cancel')).length; }

  // --- totals --------------------------------------------------------------------
  get grandTotal(): number {
    return (this.orders || []).reduce((sum, o: any) => sum + (o.total || 0), 0);
  }
  get totalsCurrency(): string | undefined {
    return this.orders?.find(o => !!o.currency)?.currency;
  }

  // --- search + per-tab filtered lists ------------------------------------------
  private filterBySearch(list: UIOrder[]): UIOrder[] {
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (!term) return list;

    return list.filter(o => {
      const idStr   = ((o.orderName || o.orderId || '') + '').toLowerCase();
      const nameStr = (o.shipTo?.name || '').toLowerCase();
      return idStr.includes(term) || nameStr.includes(term);
    });
  }

  /** Orders tab: Pending + Processing + Shipped, optionally filtered by chip */
  get openOrders(): UIOrder[] {
    const all = this.orders || [];
    let rows = all.filter(o => {
      const s = this.statusOf(o);
      return s === 'pending' || s === 'processing' || s === 'shipped';
    });

    // chip status filter
    if (this.statusFilter !== 'all') {
      rows = rows.filter(o => this.statusOf(o) === this.statusFilter);
    }

    return this.filterBySearch(rows);
  }

  /** Done tab: Complete + Cancel orders, optionally filtered by chip */
  get doneOrders(): UIOrder[] {
    const all = this.orders || [];
    let rows = all.filter(o => {
      const s = this.statusOf(o);
      return s === 'complete' || s === 'cancel';
    });

    if (this.statusFilter === 'complete' || this.statusFilter === 'cancel') {
      rows = rows.filter(o => this.statusOf(o) === this.statusFilter);
    }

    return this.filterBySearch(rows);
  }

  /** Last 3 open orders (ignores filters, always pure status) */
  get last3OpenOrders(): Order[] {
    const open = (this.orders || []).filter(o => {
      const s = this.statusOf(o);
      return s !== 'shipped' && s !== 'complete' && s !== 'cancel';
    });
    open.sort((a, b) =>
      (a.createdAt?.getTime() ?? a.updatedAt?.getTime() ?? 0) -
      (b.createdAt?.getTime() ?? b.updatedAt?.getTime() ?? 0)
    );
    return open.slice(0, 3);
  }

  // set filter when clicking chips
  setStatusFilter(filter: StatusFilter) {
    this.statusFilter = filter;

    if (filter === 'complete' || filter === 'cancel') {
      this.activeTab = 'done';
    } else if (filter === 'pending' || filter === 'processing' || filter === 'shipped') {
      this.activeTab = 'orders';
    }
    // 'all' → keep current tab
  }

  // --- business helpers for list / cards ----------------------------------------
  private escapeHtml(s: string) {
    return (s || '').toString()
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  private isWeekend(d: Date) {
    const day = d.getDay();
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

  private dateLabelFromISO(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString(undefined, {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
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

  public isOutsideLebanon(o: Order): boolean {
    const c = (o.shipTo?.country || '').trim().toLowerCase();
    return !!c && c !== 'lebanon';
  }

  private deliverDateFor(o: Order): string | null {
    if (o.deliverBy) return o.deliverBy;

    const s = this.statusOf(o);
    if (s !== 'pending' && s !== 'processing') return null;

    const created = (o.createdAt instanceof Date && !isNaN(o.createdAt as any))
      ? o.createdAt as Date
      : (o.updatedAt || new Date());

    if (this.isExpress(o)) {
      const d = this.addBusinessDays(created, 2);
      return this.ymd(d);
    }
    if (this.isOutsideLebanon(o)) {
      const d = this.addBusinessDays(created, 1);
      return this.ymd(d);
    }
    return null;
  }

  private startDayForCards(): Date {
    const dates: string[] = [];
    for (const o of (this.orders || [])) {
      const s = this.statusOf(o);
      if (s !== 'pending' && s !== 'processing') continue;
      const d = this.deliverDateFor(o);
      if (d) dates.push(d);
    }

    if (dates.length) {
      dates.sort();
      return this.nextBusinessDay(this.fromYMD(dates[0]));
    }

    const today = this.nextBusinessDay(new Date(new Date().setHours(0,0,0,0)));
    return today;
  }

  get dateCards(): { dateISO: string; dateLabel: string; orders: (Order & { isExpress: boolean })[] }[] {
    const byDay = new Map<string, (Order & { isExpress: boolean })[]>();

    for (const o of (this.orders || [])) {
      const s = this.statusOf(o);
      if (s !== 'pending' && s !== 'processing') continue;

      const key = this.deliverDateFor(o);
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
      d = new Date(d); d.setDate(d.getDate() + 1);
    }
    return out;
  }

  // --- date modal / notes --------------------------------------------------------
  private beirutNowFrom(d: Date): Date {
    return d;
  }
  private autoDeliverByForExpress(o: Order): string {
    const created = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt as any);
    const local = this.beirutNowFrom(created);
    const hr = local.getHours();
    const base = new Date(local);
    base.setDate(base.getDate() + (hr < 12 ? 1 : 2));
    return base.toISOString().slice(0,10);
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

  saveDateModal(payload: { date: string | null, note: string | null }) {
    const o = this.dateModalOrder;
    if (!o) return;

    const prevDate = o.deliverBy ?? null;
    const prevNote = o.noteLocal ?? null;

    o.deliverBy = payload.date ?? null;
    o.noteLocal = payload.note ?? null;

    this.ordersSvc.setDeliverBy(o.shopDomain, o.orderId, o.deliverBy).subscribe({
      next: r => {
        if (!r?.ok) {
          o.deliverBy = prevDate;
        }
        this.ordersSvc.setNoteLocal(o.shopDomain, o.orderId, o.noteLocal).subscribe({
          next: res => { if (!res?.ok) o.noteLocal = prevNote; },
          error: () => { o.noteLocal = prevNote; }
        });
      },
      error: () => {
        o.deliverBy = prevDate;
        this.ordersSvc.setNoteLocal(o.shopDomain, o.orderId, o.noteLocal).subscribe({ error: ()=>{} });
      }
    });

    this.closeDateModal();
  }

  closeDateModal() {
    this.showDateModal = false;
    setTimeout(() => {
      this.dateModalOrder = null;
      this.initialDeliverBy = null;
    }, 0);
  }

  // --- tags / actions -----------------------------------------------------------
  nextActions(o: Order): string[] {
    const hasProcessing = this.has(o, 'processing');
    const hasShipped = this.has(o, 'shipped');
    const hasComplete = this.has(o, 'complete');
    const hasCancel = this.has(o, 'cancel');

    if (hasComplete) return [];
    if (hasShipped)  return ['Complete'];
    if (hasProcessing) return ['Shipped', 'Cancel'];
    if (hasCancel)   return [];
    return ['Processing', 'Cancel'];
  }

  openPrintModal(order: any) {
    this.selectedOrder = order;
    this.showPrint = true;
  }
  onModalClosed() {
    this.showPrint = false;
    setTimeout(() => { this.selectedOrder = null; }, 0);
  }

  onNextAction(o: Order, e: Event) {
    const sel = e.target as HTMLSelectElement;
    const value = sel.value;
    if (!value) return;

    if (this.has(o, 'complete') && value.toLowerCase() !== 'complete') {
      sel.value = '';
      alert('Order is complete. You cannot move it back.');
      return;
    }

    const prev = [...o.tags];
    const already = o.tags.map(t => t.toLowerCase()).includes(value.toLowerCase());
    if (!already) o.tags = [...o.tags, value];

    this.ordersSvc.addTagRemote(o.shopDomain, o.orderId, value).subscribe({
      next: r => { if (!r?.ok) o.tags = prev; },
      error: () => { o.tags = prev; }
    });

    sel.selectedIndex = 0;
  }

  addTag(order: Order, tag: string) {
    if (tag && !order.tags?.includes(tag)) {
      order.tags = [...order.tags, tag];
    }
  }

  onTagChange(o: Order, event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) return;

    const prev = [...(o.tags || [])];
    const already = (o.tags || []).map(t => t.toLowerCase()).includes(value.toLowerCase());
    if (!already) o.tags = [...(o.tags || []), value];

    this.ordersSvc.addTagRemote(o.shopDomain, o.orderId, value).subscribe({
      next: r => { if (!r?.ok) o.tags = prev; },
      error: () => { o.tags = prev; }
    });

    (event.target as HTMLSelectElement).value = '';
  }

  removeTag(o: Order, tag: string) {
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

  private ensureItemsLoaded(o: UIOrder): Promise<void> {
    if (o.items && o.items.length >= 0) return Promise.resolve();
    return firstValueFrom(this.ordersSvc.getOrderItems(o.shopDomain, o.orderId))
      .then(items => { o.items = items || []; })
      .catch(() => {});
  }

  async onPrintAndProcess(o: UIOrder) {
    const already = (o.tags || []).map(t => t.toLowerCase()).includes('processing');
    const prev = [...(o.tags || [])];
    if (!already) {
      o.tags = [...(o.tags || []), 'Processing'];
      this.ordersSvc.addTagRemote(o.shopDomain, o.orderId, 'Processing').subscribe({
        next: r => { if (!r?.ok) o.tags = prev; },
        error: () => { o.tags = prev; }
      });
    }

    await this.ensureItemsLoaded(o);

    this.selectedOrder = o;
    this.showPrint = true;

    setTimeout(async () => {
      try {
        await this.printModal?.printBundle({ invoice: 2, packing: 1 });
      } finally {
        this.onModalClosed();
      }
    }, 50);
  }

  // --- express & old flags ------------------------------------------------------
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

  // --- printing cards for date list ---------------------------------------------
  printCards() {
    const rows: Array<{ store: string, orderName: string, customer: string, city: string, date: string, note?: string }> = [];
    for (const day of this.dateCards) {
      for (const o of (day.orders || [])) {
        rows.push({
          store: this.printStoreName,
          orderName: o.orderName || `#${o.orderId}`,
          customer: o.shipTo?.name || '',
          city: o.shipTo?.city || '',
          date: day.dateISO,
          note: (o.noteLocal || '')
        });
      }
    }

    if (!rows.length) {
      alert('No dated orders to print.');
      return;
    }

    const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (!win) { alert('Popup blocked. Allow popups to print.'); return; }

    const lastThree = (this.last3OpenOrders || [])
      .map(o => this.escapeHtml(o.orderName || `#${o.orderId}`))
      .join(' , ');

    const style = `
      <style>
        body{font-family:Segoe UI,system-ui,sans-serif;padding:16px;color:#111}
        h1{font-size:18px;margin:0 0 8px 0}
        .small{font-size:0.85rem;color:#555;margin-bottom:10px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}
        th{background:#f5f5f5}
        .note{white-space:pre-wrap;font-size:0.95rem;color:#333}
        .last3{margin:6px 0 12px 0;font-size:0.9rem}
        @media print { body{padding:8px} }
      </style>
    `;

    const head = `
      <h1>Delivery cards — ${this.printStoreName}</h1>
      <p class="small">Printed: ${new Date().toLocaleString()}</p>
      <div class="last3"><b>Last 3 open orders:</b> ${lastThree || '(none)'}</div>
    `;

    const tableHead = `<table><thead><tr><th>Order</th><th>Customer</th><th>City</th><th>Deliver Date</th><th>Note (local)</th></tr></thead><tbody>`;
    const tableRows = rows.map(r => `
      <tr>
        <td><strong>${this.escapeHtml(r.orderName)}</strong><div class="small">${this.escapeHtml(r.store)}</div></td>
        <td>${this.escapeHtml(r.customer)}</td>
        <td>${this.escapeHtml(r.city)}</td>
        <td>${this.escapeHtml(r.date)}</td>
        <td class="note">${this.escapeHtml(r.note || '')}</td>
      </tr>
    `).join('');
    const tableFooter = `</tbody></table>`;

    win.document.write(`<html><head><title>Print delivery cards</title>${style}</head><body>${head}${tableHead}${tableRows}${tableFooter}</body></html>`);
    win.document.close();

    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
  }

  // --- Shipday export -----------------------------------------------------------
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

  // --- data loading -------------------------------------------------------------
  ngOnInit() {}

  fetch() {
    this.loading = true;
    this.error = '';
    this.cursor = null;
    this.nextCursor = null;

    this.ordersSvc.getSummary().subscribe({
      next: (s) => { this.summary = s; },
      error: () => { /* ignore summary failure */ }
    });

    this.ordersSvc.getOrdersPage({ limit: this.pageSize, cursor: this.cursor }).subscribe({
      next: (page) => {
        this.orders = page.rows.map<UIOrder>(o => ({ ...o, items: [] }));
        this.nextCursor = page.nextCursor ?? null;
        this.loading = false;

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

  loadMore() {
    if (!this.nextCursor) return;
    this.loading = true;

    this.ordersSvc.getOrdersPage({ limit: this.pageSize, cursor: this.nextCursor }).subscribe({
      next: (page) => {
        const newRows = page.rows.map<UIOrder>(o => ({ ...o, items: [] }));
        this.orders = [...this.orders, ...newRows];
        this.nextCursor = page.nextCursor ?? null;
        this.loading = false;

        newRows.forEach(o => {
          this.ordersSvc.getOrderItems(o.shopDomain, o.orderId).subscribe(items => {
            o.items = items || [];
          });
        });
      },
      error: () => { this.loading = false; }
    });
  }
}
