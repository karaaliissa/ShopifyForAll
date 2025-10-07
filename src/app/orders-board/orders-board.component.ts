import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Order, OrdersService } from '../services/orders.service';
import { interval, startWith, switchMap, from, mergeMap, map, catchError, of, filter } from 'rxjs';
import { environment } from '../environments/environment';
import { FormsModule } from '@angular/forms';
import { ExportService } from '../services/export.service';
@Component({
  selector: 'app-orders-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers:[DatePipe],
  templateUrl: './orders-board.component.html',
  styleUrls: ['./orders-board.component.css']
})
export class OrdersBoardComponent implements OnInit {
  orders: (Order & { items?: any[] })[] = [];
  loading = false;
  error = '';
  exportShop = 'cropndtop.myshopify.com';
  exportDate = new Date().toISOString().slice(0,10);
  constructor(private ordersSvc: OrdersService,private exportSvc: ExportService) {}
  exportShipday() {
    this.exportSvc.shipday(this.exportShop, this.exportDate).subscribe({
      next: res => {
        // Get filename from header if available
        const cd = res.headers.get('Content-Disposition') || '';
        const match = /filename="?([^"]+)"?/.exec(cd);
        const filename = match?.[1] || `shipday-${this.exportDate}.csv`;
  
        // Make a Blob and auto-download
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
      error: (e) => {
        console.error(e);
        alert('Failed to export Shipday CSV.');
      }
    });
  }
  isExpress(o: Order): boolean {
    return /\bexpress\b/i.test(o.shippingMethod || '');
  }
  isOld(o: Order): boolean {
    const d = o.createdAt || o.updatedAt;
    if (!d) return false;
    const ageDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    const tags = (o.tags || []).join(','); // your tags are an array already
    const shippedOrComplete = /\b(shipped|complete)\b/i.test(tags);
    return ageDays > 7 && !shippedOrComplete;
  }
  ngOnInit() {
    // Use ONE stream; remove the extra fetch().
    interval(60000).pipe(          // back off to 60s (tune as needed)
      startWith(0),
      switchMap(() => {
        this.loading = true;
        this.error = '';
        return this.ordersSvc.getOrders({ limit: 50 }); // start smaller
      })
    ).subscribe({
      next: rows => {
        this.orders = rows;
        this.loading = false;
        if (!rows.length) this.error = 'No rows from API (check CORS/env/tabs).';
        this.loadItemsForVisibleRows(rows);
      },
      complete: () => this.loading = false,
      error: err => {
        this.loading = false;
        this.error = err?.message ?? 'Failed to load orders';
      }
    });
  }

  private loadItemsForVisibleRows(rows: (Order & { items?: any[] })[]) {
    // Cap concurrency to avoid hammering the backend.
    from(rows).pipe(
      // Skip if we already have items in memory (or let the service cache handle it).
      filter(o => !o.items || o.items.length === 0),
      mergeMap(
        (o) =>
          this.ordersSvc.getOrderItems(o.shopDomain, o.orderId).pipe(
            map(items => ({ o, items })),
            catchError(() => of({ o, items: [] as any[] }))  // don't break the chain
          ),
        4 // <= concurrency cap
      )
    ).subscribe(({ o, items }) => {
      o.items = items;
    });
  }

  addTag(order: Order, tag: string) {
    if (tag && !order.tags?.includes(tag)) {
      order.tags = [...order.tags, tag];
    }
  }

  onTagChange(o: Order, event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) return;
  
    // optimistic UI
    const prev = [...(o.tags || [])];
    if (!o.tags.includes(value)) o.tags = [...o.tags, value];
  
    this.ordersSvc.addTagRemote(o.shopDomain, o.orderId, value).subscribe({
      next: (res) => {
        if (!res?.ok) o.tags = prev; // rollback on soft error
        // else tags already in UI; backend also updated Sheets + busted cache
      },
      error: () => { o.tags = prev; } // rollback on network error
    });
  
    (event.target as HTMLSelectElement).value = ''; // reset dropdown
  }
  

  getTags(tags?: string[]): string[] {
    return (tags || []).map(t => t.trim()).filter(t => t.length > 0);
  }

  fetch() {
    this.loading = true;
    this.error = '';
    this.ordersSvc.getOrders({ limit: 100 }).subscribe({
      next: (rows) => {
        this.orders = rows;
        // fetch items for each order
        this.orders.forEach(o => {
          this.ordersSvc.getOrderItems(o.shopDomain, o.orderId).subscribe(items => {
            o.items = items;
          });
        });
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message ?? 'Failed to load orders';
        this.loading = false;
      }
    });
  }
  get grandTotal(): number {
    return (this.orders || []).reduce((sum, o: any) => sum + (o.total || 0), 0);
  }
  
  // optional: pick a currency to display in the totals row
  get totalsCurrency(): string | undefined {
    return this.orders?.find(o => !!o.currency)?.currency;
  }
}
