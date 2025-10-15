import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
  constructor(private sanitizer: DomSanitizer) { }
  @ViewChild('printArea') printArea!: ElementRef<HTMLDivElement>;
  private applyPrintColorArabic(html: string): string {
    // Map: normalized key -> {ar, hex}
    const colors: Record<string, { ar: string; hex: string }> = {
      'black - crystal': { ar: 'أسود - كريستال', hex: '#000000' },
      'black - black': { ar: 'أسود - أسود', hex: '#000000' },

      'slate blue grey': { ar: 'أزرق رمادي أردوازي', hex: '#708090' },
      'electric blue': { ar: 'أزرق كهربائي', hex: '#007FFF' },
      'dusty blue': { ar: 'أزرق باهت', hex: '#7AA5C3' },
      'baby blue': { ar: 'أزرق فاتح', hex: '#A3C7F3' },
      'light blue wash': { ar: 'أزرق فاتح مغسول', hex: '#9EC1E6' },
      'mid blue wash': { ar: 'أزرق متوسط مغسول', hex: '#5F8FBF' },
      'navy blue': { ar: 'كحلي', hex: '#0A3D62' },
      'royal blue': { ar: 'أزرق ملكي', hex: '#4169E1' },

      'hot pink': { ar: 'وردي فاقع', hex: '#FF69B4' },
      'baby pink': { ar: 'وردي فاتح', hex: '#F8BBD0' },
      'pastel pink': { ar: 'وردي باستيل', hex: '#FFD1DC' },
      'pink': { ar: 'وردي', hex: '#FFC0CB' },

      'cherry red': { ar: 'أحمر كرزي', hex: '#D2042D' },
      'red': { ar: 'أحمر', hex: '#FF0000' },
      'burgundy': { ar: 'خمري', hex: '#800020' },
      'brick': { ar: 'طوبي', hex: '#B55239' },

      'dark green': { ar: 'أخضر داكن', hex: '#006400' },
      'sage green': { ar: 'أخضر مريمي', hex: '#9CAF88' },
      'mint': { ar: 'نعناعي', hex: '#98FF98' },
      'green': { ar: 'أخضر', hex: '#008000' },

      'aqua': { ar: 'تركوازي', hex: '#00BCD4' },
      'orange': { ar: 'برتقالي', hex: '#FFA500' },
      'yellow': { ar: 'أصفر', hex: '#FFD000' },

      'aubergine': { ar: 'بنفسجي غامق', hex: '#580F41' },
      'lilac': { ar: 'ليلكي', hex: '#C8A2C8' },

      'ivory': { ar: 'عاجي', hex: '#FFFFF0' },
      'off white': { ar: 'أوف وايت', hex: '#F8F8F2' },
      'white': { ar: 'أبيض', hex: '#FFFFFF' },

      'grey': { ar: 'رمادي', hex: '#808080' },
      'gray': { ar: 'رمادي', hex: '#808080' },

      'choco': { ar: 'بني شوكولا', hex: '#5D3A1A' },
      'brown': { ar: 'بني', hex: '#8B4513' },
      'nude': { ar: 'جلدي', hex: '#C8AD7F' },
      'khaki': { ar: 'كاكي', hex: '#BDB76B' },

      'black': { ar: 'أسود', hex: '#000000' },

      // Not clear color — keep transliteration + neutral shade
      'chala': { ar: 'شالا', hex: '#555555' },
    };

    // Longer keys first to avoid partial matches (e.g., "navy blue" before "blue")
    const keys = Object.keys(colors).sort((a, b) => b.length - a.length);

    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let out = html;
    for (const key of keys) {
      const { ar, hex } = colors[key];
      // word-ish boundaries: allow spaces / hyphens within keys
      const rx = new RegExp(`(?<![\\w/])${esc(key)}(?![\\w/])`, 'gi');
      out = out.replace(
        rx,
        () => `<span class="color-ar" style="color:${hex}; font-weight:inherit;">${ar}</span>`
      );
    }
    return out;
  }
  variantWithSizeRing(v?: string): SafeHtml {
    if (!v) return '';
    const re = /\b(XXL|XL|XS|[SML])\b/i;
    return this.sanitizer.bypassSecurityTrustHtml(
      v.replace(re, m => `<span class="size-ring">${m.toUpperCase()}</span>`)
    );
  }
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
  get zone(): 'N' | 'S' | 'M' | 'B' | null {
    const sm = (this.order?.shippingMethod || '').toLowerCase();

    // NOTE: express handled separately
    if (/\bexpress\b/.test(sm)) return null;

    if (/north\s*lebanon/.test(sm)) return 'N';
    if (/south\s*lebanon/.test(sm)) return 'S';
    if (/mount\s*lebanon/.test(sm)) return 'M';
    if (/bekaa/.test(sm)) return 'B';

    // Beirut or anything else → no badge
    return null;
  }
  extractSize(text: string): string | null {
    const sizeMatch = text.match(/\b(xs|s|m|l|xl|xxl)\b/i);
    return sizeMatch ? sizeMatch[1].toUpperCase() : null;
  }


  get zoneColor(): string {
    switch (this.zone) {
      case 'N': return '#16a34a'; // green
      case 'S': return '#2563eb'; // blue
      case 'M': return '#9333ea'; // purple
      case 'B': return '#eab308'; // yellow
      default: return '#999999';
    }
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

    let html = host.innerHTML;
    html = this.applyPrintColorArabic(html);
    // minimal print styles for the popup/iframe only
    // print-modal.component.ts  → inside print()  → replace the value of `css`:
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
    position:fixed;
    top:8mm;                 /* higher, sits in the white margin */
    left:50%;
    transform:translateX(-50%);
    z-index:99999;
    text-align:center;
    pointer-events:none;
  }
  .zone-badge .circle{
    --badge-size:120px;      /* smaller circle */
    width:var(--badge-size);
    height:var(--badge-size);
    border-radius:50%;
    border:8px solid var(--badge-color,#1FA64A);
    color:var(--badge-color,#1FA64A);
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:900;
    font-size:68px;          /* smaller letter */
    line-height:1;
    margin:0 auto;
  }
  .zone-badge.express .circle{ display:none; }
  .zone-badge.express .express-text{
    color:#d61f1f;
    font-weight:900;
    font-size:54px;          /* smaller EXPRESS */
    line-height:1.05;
  }
  .zone-badge.express .express-text .ar{
    font-size:30px;
  }

  /* Bigger images on packing slip for print */
  .packing-wrapper .items-table .thumb{
    width:100px !important;
    height:100px !important;

    
  }
/* ---------- SIZE RING (appears only in print) ---------- */
.size-ring {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 2px solid #d61f1f; /* 🔴 red circle border */
  border-radius: 50%;
  line-height: 1;
  font-size: inherit;       /* keep size text unchanged */
  font-weight: inherit;
  color: inherit;           /* keep text color same */
  vertical-align: baseline;
  margin: 0 2px;
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