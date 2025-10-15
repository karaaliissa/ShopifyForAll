import { Component, ElementRef, Input, ViewChild } from '@angular/core';
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
  mode: 'invoice' | 'packing' = 'invoice';
  @ViewChild('printArea') printArea!: ElementRef<HTMLDivElement>;
  close() { this.show = false; }
  switch(mode: 'invoice' | 'packing') { this.mode = mode; }
  // print() { window.print(); }

  /** Returns a displayable gateway string. */
  paymentGatewayDisplay(): string {
    const gw = (this.order?.paymentGateway
      ?? this.order?.paymentGatewayNames?.[0]
      ?? '').toString();
    return gw || '—';
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
        img.addEventListener('load',  () => { if (--left === 0) done(); });
        img.addEventListener('error', () => { if (--left === 0) done(); });
      }
    });
  }
  
}