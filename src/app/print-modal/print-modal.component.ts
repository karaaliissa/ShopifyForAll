import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-print-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './print-modal.component.html',
  styleUrls: ['./print-modal.component.css']
})
export class PrintModalComponent {
  @Input() order: any;
  @Input() show = false;
  @Output() closed = new EventEmitter<void>();
  mode: 'invoice' | 'packing' = 'invoice';
  @ViewChild('printArea') printArea!: ElementRef<HTMLDivElement>;
  close() {
    this.show = false;
    this.closed.emit();
  }
  switch(mode: 'invoice' | 'packing') { this.mode = mode; }
  selectedOrder: any = null;
  showPrint = false;
  openPrintModal(order: any) {
    this.selectedOrder = order;
    this.showPrint = true;
  }
  
  onModalClosed() {
    // fully reset so opening the same order again works
    this.showPrint = false;
    setTimeout(() => { this.selectedOrder = null; }, 0);
  }
  
  /** Returns a displayable gateway string. */
  paymentGatewayDisplay(): string {
    const gw = (this.order?.paymentGateway
      ?? this.order?.paymentGatewayNames?.[0]
      ?? '').toString();
    return gw || '—';
  }
  get zone(): 'N' | 'A' | null {
    const sm = (this.order?.shippingMethod || '').toLowerCase();
    if (/north\s*lebanon/.test(sm)) return 'N';
    if (/south\s*lebanon/.test(sm)) return 'A';
    return null;
  }
  
  get zoneColor(): string {
    // green for N, blue for A
    return this.zone === 'N' ? '#1FA64A' : '#1E90FF';
  }
  
  get isExpress(): boolean {
    return /\bexpress\b/i.test(this.order?.shippingMethod || '');
  }
  get packingMarker():
    | { text: string; sub?: string; color: string; ring?: boolean }
    | null {
    const method = (this.order?.shippingMethod || '').toLowerCase();

    if (this.isExpress) {
      return { text: 'EXPRESS', sub: 'مستعجل', color: '#b91c1c' }; // red
    }
    if (method.includes('north lebanon')) {
      return { text: 'N', color: '#16a34a', ring: true };          // green
    }
    if (method.includes('south lebanon')) {
      return { text: 'A', color: '#2563eb', ring: true };          // blue
    }
    return null;
  }
  /** Returns 'Yes' if the gateway implies Cash on Delivery, else 'No'. */
  codText(): string {
    const gw = (this.order?.paymentGateway
      ?? this.order?.paymentGatewayNames?.[0]
      ?? '')
      .toString()
      .toLowerCase();
    return (gw.includes('cod') || gw.includes('cash on delivery')) ? 'Yes' : 'No';
  }
  print() {
    const host = this.printArea?.nativeElement;
    if (!host) { window.print(); return; }

    const html = host.innerHTML;

    // minimal print styles for the popup/iframe only
    const css = `
  <style>
    @page { margin: 12mm; }
    html, body { padding:0; margin:0; font-family:"Segoe UI",system-ui,sans-serif; color:#111; }

    .header-line{display:flex;justify-content:space-between;align-items:flex-start;}
    .logo{width:240px;height:auto}
    .order-info{text-align:right;font-size:14px}
    .cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;margin:8px 0 16px}
    .col h3{margin:0 0 6px}
    hr{border:0;border-top:1px solid #e5e7eb;margin:12px 0}

    .items-table{width:100%;border-collapse:collapse;margin-top:.5rem}
    .items-table th,.items-table td{padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:14px}
    .items-table th{text-align:left;font-weight:600}
    .right{text-align:right}
    .prod{display:flex;align-items:center;gap:8px}
    .thumb{width:45px;height:45px;object-fit:cover;border-radius:6px;border:1px solid #ddd}
    .muted{font-size:12px;color:#666}
    .total-line{display:flex;justify-content:flex-end;margin-top:1rem;font-size:18px;font-weight:600}
    .footer-note{text-align:center;margin-top:2rem;font-size:14px;color:#555}

    /* ---------- PRINT BADGE (N/A/EXPRESS) ---------- */
    .zone-badge{
      position:fixed;         /* always at page top */
      top:20mm;
      left:50%;
      transform:translateX(-50%);
      z-index:99999;
      text-align:center;
      pointer-events:none;
    }
    .zone-badge .circle{
      --badge-size:180px;     /* make it bigger/smaller here */
      width:var(--badge-size);
      height:var(--badge-size);
      border-radius:50%;
      border:12px solid var(--badge-color,#1FA64A);
      color:var(--badge-color,#1FA64A);
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:900;
      font-size:110px;
      line-height:1;
      margin:0 auto;
    }
    .zone-badge.express .circle{ display:none; }
    .zone-badge.express .express-text{
      color:#d61f1f;
      font-weight:900;
      font-size:72px;
      line-height:1.05;
    }
    .zone-badge.express .express-text .ar{
      font-size:38px;
    }

    /* Bigger images on packing slip for print */
    .packing-wrapper .items-table .thumb{
      width:100px !important;
      height:100px !important;
    }

    @media print { .cols{grid-template-columns:1fr 1fr} }
  </style>
`;


    // create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    // write content into the iframe
    const doc = iframe.contentWindow!.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print</title>${css}</head><body>${html}</body></html>`);
    doc.close();

    // wait for images, then print that iframe and remove it
    const w = iframe.contentWindow!;
    const imgs = Array.from(doc.images || []);
    const done = () => { w.focus(); w.print(); setTimeout(() => document.body.removeChild(iframe), 50); };

    if (!imgs.length) { done(); return; }
    let left = imgs.length;
    imgs.forEach(img => {
      if (img.complete) { if (--left === 0) done(); }
      else {
        img.addEventListener('load', () => { if (--left === 0) done(); });
        img.addEventListener('error', () => { if (--left === 0) done(); });
      }
    });
  }

}