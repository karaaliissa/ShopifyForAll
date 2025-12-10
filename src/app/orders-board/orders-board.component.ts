import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Order, OrdersService, OrdersSummary } from '../services/orders.service';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ExportService } from '../services/export.service';
import { PrintModalComponent } from '../print-modal/print-modal.component';
import { DeliveryDateModalComponent } from '../delivery-date-modal/delivery-date-modal.component';

type UIOrder = Order & { items?: any[] };

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

  showDateModal = false;
  dateModalOrder: any = null;
  onlyDated = false; // optional toggle in List tab
  initialDeliverBy: string | null = null;
  initialNote: string | null = null;
  listCardMax = 20; // show up to 20 non-empty day cards

  orders: UIOrder[] = [];

  loading = false;
  error = '';
  selectedOrder: any = null;
  showPrint = false;

  // shipday export controls (unchanged)
  exportShop = 'cropndtop.myshopify.com';
  exportDate = new Date().toISOString().slice(0, 10);
  printStoreName = 'cropndtop';

  summary: OrdersSummary | null = null;   // global counters
  // pageSize = 25;                          // page size
  // cursor: string | null = null;          // current cursor (request)
  // nextCursor: string | null = null;      // next page cursor (response)

  // 🔍 search + status filter
  searchTerm = '';
  statusFilter: 'all' | 'pending' | 'processing' | 'shipped' = 'all';

  private has(o: Order, t: string) { return o.tags.map(x => x.toLowerCase()).includes(t.toLowerCase()); }
  private isComplete(o: Order) { return this.has(o, 'complete'); }

  constructor(private ordersSvc: OrdersService, private exportSvc: ExportService) { }

  private todayMidnight(): Date {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }
  // ========== PRINT CARDS (list tab) =========================================
  printCards() {
    const rows: Array<{ store: string, orderName: string, customer: string, city: string, date: string, note?: string, status: string }> = [];


    for (const day of this.dateCards) {
      for (const o of (day.orders || [])) {

        // لا نطبع إلا Express / International / Notes — بدون OLD
        if (!this.shouldPrintCard(o)) continue;
        const status = this.getPrintStatus(o);
        if (!status) continue;  // ← مانع الطباعة
        const baseNote = (o.noteLocal || '').trim();
        const autoNote = this.buildPrintNote(o);

        // نجمع الملاحظات (local + auto) و نشيل التكرار
        const noteParts: string[] = [];
        if (baseNote) noteParts.push(baseNote);
        if (autoNote) noteParts.push(autoNote);

        const seen = new Set<string>();
        const combinedNote = noteParts.filter(p => {
          const key = p.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).join(' — ');

        rows.push({
          store: this.printStoreName,
          orderName: o.orderName || `#${o.orderId}`,
          customer: o.shipTo?.name || '',
          city: o.shipTo?.city || '',
          date: day.dateISO,
          note: combinedNote,
          status: status
        });

      }
    }

    if (!rows.length) {
      alert('No dated orders to print.');
      return;
    }

    // ... باقي الكود تبع window.open نفس ما هو ...


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
      <div class="last3"><b>Last 5 open orders:</b> ${lastThree || '(none)'}</div>
    `;

    const tableHead = `
<table>
  <thead>
    <tr>
      <th>Order</th>
      <th>Status</th>
      <th>Customer</th>
      <th>City</th>
      <th>Deliver Date</th>
      <th>Note (local)</th>
    </tr>
  </thead>
  <tbody>
`;

    const tableRows = rows.map(r => `
  <tr>
    <td><strong>${this.escapeHtml(r.orderName)}</strong><div class="small">${this.escapeHtml(r.store)}</div></td>
    <td>${this.escapeHtml(r.status)}</td>
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

  private escapeHtml(s: string) {
    return (s || '').toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
    const status = this.statusOf(o);
    const today = this.todayMidnight();

    // Only manage dates for pending/processing
    if (status !== 'pending' && status !== 'processing') {
      return o.deliverBy || null;
    }

    const isOld = this.isOld(o);
    const isExpress = this.isExpress(o);
    const isIntl = this.isOutsideLebanon(o);

    // --- 1) Already has a deliver date ---
    if (o.deliverBy) {
      const d = this.fromYMD(o.deliverBy);
      d.setHours(0, 0, 0, 0);

      if (d < today) {
        // Overdue → move depending on category
        if (isOld) {
          const future = this.addBusinessDays(today, 10);
          return this.ymd(future);
        } else {
          const tomorrow = this.addBusinessDays(today, 1);
          return this.ymd(tomorrow);
        }
      }

      return o.deliverBy;
    }

    // --- 2) No deliver date yet → auto assign ---
    const created = o.createdAt || o.updatedAt || new Date();
    const base = new Date(created);
    base.setHours(0, 0, 0, 0);

    let auto: Date;

    if (isOld) {
      // old → 10 business days
      auto = this.addBusinessDays(today, 10);
    } else if (isExpress || isIntl) {
      // express / Intl → next business day
      auto = this.addBusinessDays(base, 1);
    } else {
      // regular → 7 business days
      auto = this.addBusinessDays(base, 7);
    }

    // if still in the past → bump again
    if (auto < today) {
      auto = isOld
        ? this.addBusinessDays(today, 10)
        : this.addBusinessDays(today, 1);
    }

    return this.ymd(auto);
  }
  private listCategoryRank(o: Order & { isExpress: boolean }): number {
    // 0 = Express
    if (o.isExpress) return 0;

    // 1 = International (outside Lebanon)
    if (!o.isExpress && this.isOutsideLebanon(o)) return 1;

    const isExchange = this.isExchangeOrder(o);

    // 2 = orders with notes (but NOT exchange)
    const hasNote =
      !!(o as any).noteLocal ||
      !!o.note ||
      (o.noteAttributes && o.noteAttributes.length > 0);

    if (hasNote && !isExchange) return 2;

    // 3 = Exchange orders (always after other notes)
    if (isExchange) return 3;

    // 4 = OLD orders
    if (this.isOld(o)) return 4;

    // 5 = everything else
    return 5;
  }





  private startDayForCards(): Date {
    const today = this.todayMidnight();
    // أول كرت في اللست يكون دائماً "غداً" (أقرب يوم عمل)
    return this.addBusinessDays(today, 1);
  }

  // ── dateCards: 20 *weekdays* continuous ─────────────────────────────────────
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
        const orders = (byDay.get(iso) || []).sort((a, b) => {
          const ra = this.listCategoryRank(a);
          const rb = this.listCategoryRank(b);
          if (ra !== rb) return ra - rb;
          return (a.orderName || a.orderId).localeCompare(b.orderName || b.orderId);
        });
        out.push({ dateISO: iso, dateLabel: this.dateLabelFromISO(iso), orders });

      }
      d = new Date(d);
      d.setDate(d.getDate() + 1);
    }

    return out;
  }
  private shouldPrintCard(o: Order & { noteLocal?: string | null }): boolean {
    // Express
    const isExpress = this.isExpress(o);

    // International (خارج لبنان)
    const isIntl = this.isOutsideLebanon(o);

    // Notes (من Shopify NOTE أو من Google Sheets NOTE_LOCAL أو noteAttributes)
    const hasNote =
      !!(o.noteLocal && o.noteLocal.toString().trim()) ||
      !!(o.note && o.note.toString().trim()) ||
      (!!o.noteAttributes && o.noteAttributes.length > 0);

    // Old order
    const isOld = this.isOld(o);

    // Exchange: من التاغز أو من أي نوت
    const tagsText = (o.tags || []).join(' ').toLowerCase();
    const notesText = ((o.noteLocal || '') + ' ' + (o.note || '')).toLowerCase();
    const isExchange =
      tagsText.includes('exchange') || notesText.includes('exchange');

    // 🔴 شرط خاص للـ OLD:
    // إذا الطلب Old وما عنده أي note → لا نطبعه أبداً
    if (isOld && !hasNote) {
      return false;
    }

    // ✅ غير هيك: نطبعه إذا كان Express أو International أو عنده Notes أو Exchange
    return isExpress || isIntl || hasNote || isExchange;
  }

  private getPrintStatus(o: Order): string | null {
    const tags = (o.tags || []).map(t => t.toLowerCase());

    const hasProcessing = tags.includes('processing');
    const hasShipped = tags.includes('shipped');
    const hasComplete = tags.includes('complete');
    const hasCancel = tags.includes('cancel');

    // ❌ Do NOT print these orders at all
    if (hasShipped || hasComplete || hasCancel) return null;
    if (hasProcessing && hasShipped) return null;

    // ✔ Processing only
    if (hasProcessing) return 'Processing';

    // ✔ Default if no tags → Pending
    return 'Pending';
  }

  private isExchangeOrder(o: Order): boolean {
    // tag "Exchange" OR sourceName == "Exchange"
    const sourceIsExchange = (o.sourceName || '').trim().toLowerCase() === 'exchange';
    const tagIsExchange = this.has(o, 'exchange'); // uses your private has()
    return sourceIsExchange || tagIsExchange;
  }
  get last3OpenOrders(): Order[] {
    const open = (this.orders || []).filter(o => {
      const s = this.statusOf(o);
      return s !== 'shipped' && s !== 'complete' && s !== 'cancel';
    });
    open.sort((a, b) =>
      (a.createdAt?.getTime() ?? a.updatedAt?.getTime() ?? 0)
      - (b.createdAt?.getTime() ?? b.updatedAt?.getTime() ?? 0)
    );
    return open.slice(0, 5);
  }

  private beirutNowFrom(d: Date): Date {
    return d;
  }
  private autoDeliverByForExpress(o: Order): string {
    const created = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt as any);
    const local = this.beirutNowFrom(created);
    const hr = local.getHours();
    const base = new Date(local);
    base.setDate(base.getDate() + (hr < 12 ? 1 : 2));
    return base.toISOString().slice(0, 10);
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
        this.ordersSvc.setNoteLocal(o.shopDomain, o.orderId, o.noteLocal).subscribe({ error: () => { } });
      }
    });

    this.closeDateModal();
  }

  closeDateModal() {
    this.showDateModal = false;
    setTimeout(() => {
      this.dateModalOrder = null;
      this.initialDeliverBy = null;
      this.initialNote = null;
    }, 0);
  }

  // ---- Canonical status per order ----
  statusOf(o: Order): 'pending' | 'processing' | 'shipped' | 'complete' | 'cancel' {
    if (this.has(o, 'complete')) return 'complete';
    if (this.has(o, 'cancel')) return 'cancel';
    if (this.has(o, 'shipped')) return 'shipped';
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

  // 🔢 Counters
  // get pendingCount() { return this.summary?.pending ?? this.orders.filter(o => this.statusOf(o) === 'pending').length; }
  get processingCount() { return this.summary?.processing ?? this.orders.filter(o => this.statusOf(o) === 'processing').length; }
  get shippedCount() { return this.summary?.shipped ?? this.orders.filter(o => this.statusOf(o) === 'shipped').length; }
  get completeCount() { return this.summary?.complete ?? this.orders.filter(o => this.statusOf(o) === 'complete').length; }
  get cancelCount() { return this.summary?.cancel ?? this.orders.filter(o => this.statusOf(o) === 'cancel').length; }

  get expressPendingCount() { return this.summary?.expressPending ?? this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'pending')).length; }
  get expressProcessingCount() { return this.summary?.expressProcessing ?? this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'processing')).length; }
  get expressShippedCount() { return this.summary?.expressShipped ?? this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'shipped')).length; }
  get expressCompleteCount() { return this.summary?.expressComplete ?? this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'complete')).length; }
  get expressCancelCount() { return this.summary?.expressCancel ?? this.orders.filter(o => this.isExpress(o) && this.statusIs(o, 'cancel')).length; }

  // status pill
  fulfillmentLabel(o: Order): string {
    const m = this.statusOf(o);
    return m.charAt(0).toUpperCase() + m.slice(1);
  }
  fulfillmentClass(o: Order): string {
    return this.statusOf(o);
  }

  // Totals
  get grandTotal(): number {
    return (this.orders || []).reduce((sum, o: any) => sum + (o.total || 0), 0);
  }
  get totalsCurrency(): string | undefined {
    return this.orders?.find(o => !!o.currency)?.currency;
  }

  // ========= FILTERED LISTS FOR TABS =========================================
  get openOrders(): UIOrder[] {
    return (this.orders || []).filter(o => {
      const s = this.statusOf(o);
      return s === 'pending' || s === 'processing' || s === 'shipped';
    });
  }

  get doneOrders(): UIOrder[] {
    return (this.orders || []).filter(o => {
      const s = this.statusOf(o);
      return s === 'complete' || s === 'cancel';
    });
  }

  // 🔍 apply statusFilter + search
  get filteredOpenOrders(): UIOrder[] {
    let list = this.openOrders;

    if (this.statusFilter !== 'all') {
      list = list.filter(o => this.statusOf(o) === this.statusFilter);
    }

    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(o =>
        (o.orderName || '').toLowerCase().includes(q) ||
        String(o.orderId).toLowerCase().includes(q) ||
        (o.shipTo?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  get filteredDoneOrders(): UIOrder[] {
    let list = this.doneOrders;
    const q = this.searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(o =>
        (o.orderName || '').toLowerCase().includes(q) ||
        String(o.orderId).toLowerCase().includes(q) ||
        (o.shipTo?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  setStatusFilter(mode: 'all' | 'pending' | 'processing' | 'shipped') {
    this.statusFilter = mode;
  }

  // ========= Actions / tags / Shopify fulfill ================================
  nextActions(o: Order): string[] {
    const hasProcessing = this.has(o, 'processing');
    const hasShipped = this.has(o, 'shipped');
    const hasComplete = this.has(o, 'complete');
    const hasCancel = this.has(o, 'cancel');

    if (hasComplete) return [];
    if (hasShipped) return ['Complete'];
    if (hasProcessing) return ['Shipped', 'Cancel'];
    if (hasCancel) return [];
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
      next: r => {
        if (!r?.ok) {
          o.tags = prev;
        } else {
          // ✅ If user chose "Shipped", trigger Shopify fulfillment
          if (value.toLowerCase() === 'shipped') {
            const ok = confirm('Mark all items as fulfilled in Shopify for this order?');
            if (ok) {
              this.ordersSvc.fulfillOrder(o.shopDomain, o.orderId).subscribe({
                next: (res) => {
                  if (!res.ok) {
                    alert('Fulfillment failed: ' + (res.error || 'Unknown error'));
                  } else {
                    // maybe refetch or update tag in UI
                  }
                },
                error: (err) => {
                  alert('Network error while fulfilling: ' + (err?.message || err));
                }
              });
            }
          }

        }
      },
      error: () => {
        o.tags = prev;
      }
    });

    sel.selectedIndex = 0;
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

  private ensureItemsLoaded(o: Order & { items?: any[] }): Promise<void> {
    if (o.items && o.items.length >= 0) return Promise.resolve();
    return firstValueFrom(this.ordersSvc.getOrderItems(o.shopDomain, o.orderId))
      .then(items => { o.items = items || []; })
      .catch(() => { });
  }

  async onPrintAndProcess(o: Order & { items?: any[] }) {
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

  // ========= BASIC HELPERS ====================================================
  isExpress(o: Order): boolean {
    return /\bexpress\b/i.test(o.shippingMethod || '');
  }

  isOld(o: Order): boolean {
    const d = o.createdAt || o.updatedAt;
    if (!d) return false;

    const ageDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    const shippedOrComplete = /\b(shipped|complete)\b/i.test((o.tags || []).join(','));

    // old = more than 10 days and still not shipped/complete
    return ageDays > 10 && !shippedOrComplete;
  }

  private buildPrintNote(o: Order): string {
    const parts: string[] = [];

    // 0) إذا الـ NOTE من Shopify فيه كلمة Exchange
    const shopifyNote = (o.note || '').trim();
    if (shopifyNote && /exchange/i.test(shopifyNote)) {
      parts.push('Exchange');
    }

    // 1) Express flag
    if (this.isExpress(o)) {
      parts.push('Express');
    }

    // 2) Outside Lebanon -> add country
    const country = (o.shipTo?.country || '').trim();
    if (country && country.toLowerCase() !== 'lebanon') {
      parts.push(country);
    }

    // 3) Old order: more than 10 days, still pending/processing
    const d = o.createdAt || o.updatedAt;
    if (d instanceof Date && !isNaN(d.getTime())) {
      const ageDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
      const s = this.statusOf(o);
      if (ageDays > 10 && (s === 'pending' || s === 'processing')) {
        parts.push('Old order (10+ days, not shipped)');
      }
    }

    // إزالة التكرار
    const seen = new Set<string>();
    return parts.filter(p => {
      const key = p.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).join(' | ');
  }


  // ========= FETCHING / PAGINATION ============================================
  ngOnInit() { }
  fetch() {
    this.loading = true;
    this.error = '';
    this.summary = null;   // let getters fall back to computing from orders
  
    // 🔹 Do NOT pass limit or cursor → backend returns ALL orders
    this.ordersSvc.getOrdersPage({}).subscribe({
      next: (page) => {
        // page.rows contains ALL orders
        this.orders = page.rows.map<UIOrder>(o => ({ ...o, items: [] }));
  
        // optional: if you want total for the header
        this.summary = {
          ok: true,
          total: page.total ?? this.orders.length,
          pending: 0, processing: 0, shipped: 0, complete: 0, cancel: 0,
          expressPending: 0, expressProcessing: 0, expressShipped: 0,
          expressComplete: 0, expressCancel: 0
        } as any; // or adjust the type
  
        this.loading = false;
  
        // prefetch line items (same as before)
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
  
  // fetch() {
  //   this.loading = true;
  //   this.error = '';
  //   this.cursor = null;
  //   this.nextCursor = null;

  //   this.ordersSvc.getSummary().subscribe({
  //     next: (s) => { this.summary = s; },
  //     error: () => { }
  //   });

  //   this.ordersSvc.getOrdersPage({ limit: this.pageSize, cursor: this.cursor }).subscribe({
  //     next: (page) => {
  //       this.orders = page.rows.map<UIOrder>(o => ({ ...o, items: [] }));
  //       this.nextCursor = page.nextCursor ?? null;
  //       this.loading = false;

  //       this.orders.forEach(o => {
  //         this.ordersSvc.getOrderItems(o.shopDomain, o.orderId).subscribe(items => {
  //           o.items = items || [];
  //         });
  //       });
  //     },
  //     error: (err) => {
  //       this.error = err?.message ?? 'Failed to load orders';
  //       this.loading = false;
  //     }
  //   });
  // }

  // loadMore() {
  //   if (!this.nextCursor) return;
  //   this.loading = true;

  //   this.ordersSvc.getOrdersPage({ limit: this.pageSize, cursor: this.nextCursor }).subscribe({
  //     next: (page) => {
  //       const newRows = page.rows.map<UIOrder>(o => ({ ...o, items: [] }));
  //       this.orders = [...this.orders, ...newRows];
  //       this.nextCursor = page.nextCursor ?? null;
  //       this.loading = false;

  //       newRows.forEach(o => {
  //         this.ordersSvc.getOrderItems(o.shopDomain, o.orderId).subscribe(items => {
  //           o.items = items || [];
  //         });
  //       });
  //     },
  //     error: () => { this.loading = false; }
  //   });
  // }

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
  // 💰 Totals by status (only pending + processing)
get pendingTotal(): number {
  return (this.orders || [])
    .filter(o => this.statusOf(o) === 'pending')
    .reduce((sum, o: any) => sum + (o.total || 0), 0);
}

get processingTotal(): number {
  return (this.orders || [])
    .filter(o => this.statusOf(o) === 'processing')
    .reduce((sum, o: any) => sum + (o.total || 0), 0);
}
get pendingProcessingTotal(): number {
  return this.pendingTotal + this.processingTotal;
}
}
