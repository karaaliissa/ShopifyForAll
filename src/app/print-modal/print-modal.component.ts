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

  /** Replace color tokens with "English / العربية" and tint them – PRINT ONLY (packing) */
  // private applyPrintColorArabic(html: string): string {
  //   const keywords: Record<string, { ar: string; hex: string }> = {
  //     'black - crystal': { ar: 'أسود - كريستال', hex: '#000000' },
  //     'black - black': { ar: 'أسود - أسود', hex: '#000000' },

  //     'slate blue grey': { ar: 'مادي جديد', hex: '#708090' },
  //     'electric blue': { ar: 'أزرق', hex: '#007FFF' },
  //     'dusty blue': { ar: 'أزرق', hex: '#7AA5C3' },
  //     'baby blue': { ar: 'أزرق فاتح', hex: '#A3C7F3' },
  //     'navy blue': { ar: 'كحلي', hex: '#0A3D62' },
  //     'royal blue': { ar: 'نيلي', hex: '#4169E1' },

  //     'hot pink': { ar: 'زهري', hex: '#FF69B4' },
  //     'baby pink': { ar: 'زهري فاتح', hex: '#F8BBD0' },
  //     'pastel pink': { ar: 'زهري', hex: '#FFD1DC' },
  //     'pink': { ar: 'زهري', hex: '#FFC0CB' },

  //     'cherry red': { ar: 'بوردو فاتح', hex: '#D2042D' },
  //     'red': { ar: 'أحمر', hex: '#FF0000' },
  //     'burgundy': { ar: 'بوردو غامق', hex: '#800020' },
  //     'brick': { ar: 'بريك', hex: '#B55239' },

  //     'dark green': { ar: 'أخضرغامق', hex: '#006400' },
  //     'sage green': { ar: 'أخضر', hex: '#9CAF88' },
  //     'mint': { ar: 'مينت', hex: '#98FF98' },
  //     'green': { ar: 'أخضر', hex: '#008000' },

  //     'aqua': { ar: 'تركوازي', hex: '#00BCD4' },
  //     'orange': { ar: 'أورنج', hex: '#FFA500' },
  //     'yellow': { ar: 'أصفر', hex: '#FFD000' },

  //     'aubergine': { ar: 'اوبرجين', hex: '#580F41' },
  //     'lilac': { ar: 'ليلكي', hex: '#C8A2C8' },

  //     'ivory': { ar: 'عاجي', hex: '#FFFFF0' },
  //     'off white': { ar: 'أوف وايت', hex: '#F8F8F2' },
  //     'white': { ar: 'أبيض', hex: '#000000' },

  //     'grey': { ar: 'رمادي', hex: '#808080' },
  //     'gray': { ar: 'رمادي', hex: '#808080' },

  //     'choco': { ar: 'شوكو', hex: '#5D3A1A' },
  //     'brown': { ar: 'بني', hex: '#8B4513' },
  //     'nude': { ar: 'بيج', hex: '#C8AD7F' },
  //     'khaki': { ar: 'زيتي', hex: '#BDB76B' },

  //     'black': { ar: 'أسود', hex: '#000000' },

  //     'chala': { ar: 'شالا', hex: '#555555' },

  //     // --- FABRICS (tinted text only, keep English token) ---
  //     'cotton': { ar: 'قطن', hex: '#000000' },
  //     'cotton lycra': { ar: 'قطن لايكرا', hex: '#000000' },
  //     'poplin': { ar: 'بوبلين', hex: '#000000' },
  //     'crepe half lycra': { ar: 'كريب نصف لايكرا', hex: '#000000' },
  //     'leather': { ar: 'جلد', hex: '#000000' },
  //     'satin': { ar: 'ساتان', hex: '#000000' },
  //     'stretchy material': { ar: 'جورسيه', hex: '#000000' },
  //     'crepe without lycra': { ar: 'كريب بدون لايكرا', hex: '#000000' },
  //   };

  //   const keys = Object.keys(keywords).sort((a, b) => b.length - a.length);
  //   const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  //   let out = html;
  //   for (const key of keys) {
  //     const { ar, hex } = keywords[key];
  //     const rx = new RegExp(`(?<![\\w/])${esc(key)}(?![\\w/])`, 'gi');
  //     out = out.replace(rx, (match) =>
  //       `<span class="color-ar" style="color:${hex}; font-weight:inherit;">${match} / ${ar}</span>`
  //     );
  //   }
  //   return out;
  // }
/** Replace only fabric/material tokens with Arabic (remove the English fabric text).
 *  Colors remain in English (unchanged). Used only for packing print.
 */
// private applyPrintColorArabic(html: string): string {
//   // Fabrics: only these will be replaced by their Arabic equivalent (English removed).
//   const fabrics: Record<string, { ar: string; hex: string }> = {
//     'cotton': { ar: 'قطن', hex: '#000000' },
//     'cotton lycra': { ar: 'قطن لايكرا', hex: '#000000' },
//     'poplin': { ar: 'بوبلين', hex: '#000000' },
//     'crepe half lycra': { ar: 'كريب نصف لايكرا', hex: '#000000' },
//     'leather': { ar: 'جلد', hex: '#000000' },
//     'satin': { ar: 'ساتان', hex: '#000000' },
//     'stretchy material': { ar: 'جورسيه', hex: '#000000' },
//     'crepe without lycra': { ar: 'كريب بدون لايكرا', hex: '#000000' },
//   };

//   // Colors map (kept here for reference/tinting if needed later) — we will NOT replace these.
//   const colors: Record<string, { ar: string; hex: string }> = {
//     'black - crystal': { ar: 'أسود - كريستال', hex: '#000000' },
//     'black - black': { ar: 'أسود - أسود', hex: '#000000' },
//     'slate blue grey': { ar: 'رمادي جديد', hex: '#708090' },
//     'electric blue': { ar: 'أزرق', hex: '#007FFF' },
//     'dusty blue': { ar: 'أزرق', hex: '#7AA5C3' },
//     'baby blue': { ar: 'أزرق فاتح', hex: '#A3C7F3' },
//     'navy blue': { ar: 'كحلي', hex: '#0A3D62' },
//     'royal blue': { ar: 'نيلي', hex: '#4169E1' },
//     'hot pink': { ar: 'زهري', hex: '#FF69B4' },
//     'baby pink': { ar: 'زهري فاتح', hex: '#F8BBD0' },
//     'pastel pink': { ar: 'زهري', hex: '#FFD1DC' },
//     'pink': { ar: 'زهري', hex: '#FFC0CB' },
//     'cherry red': { ar: 'بوردو فاتح', hex: '#D2042D' },
//     'red': { ar: 'أحمر', hex: '#FF0000' },
//     'burgundy': { ar: 'بوردو غامق', hex: '#800020' },
//     'brick': { ar: 'بريك', hex: '#B55239' },
//     'dark green': { ar: 'أخضرغامق', hex: '#006400' },
//     'sage green': { ar: 'أخضر', hex: '#9CAF88' },
//     'mint': { ar: 'مينت', hex: '#98FF98' },
//     'green': { ar: 'أخضر', hex: '#008000' },
//     'aqua': { ar: 'تركوازي', hex: '#00BCD4' },
//     'orange': { ar: 'أورنج', hex: '#FFA500' },
//     'yellow': { ar: 'أصفر', hex: '#FFD000' },
//     'aubergine': { ar: 'اوبرجين', hex: '#580F41' },
//     'lilac': { ar: 'ليلكي', hex: '#C8A2C8' },
//     'ivory': { ar: 'عاجي', hex: '#FFFFF0' },
//     'off white': { ar: 'أوف وايت', hex: '#F8F8F2' },
//     'white': { ar: 'أبيض', hex: '#000000' },
//     'grey': { ar: 'رمادي', hex: '#808080' },
//     'gray': { ar: 'رمادي', hex: '#808080' },
//     'choco': { ar: 'شوكو', hex: '#5D3A1A' },
//     'brown': { ar: 'بني', hex: '#8B4513' },
//     'nude': { ar: 'بيج', hex: '#C8AD7F' },
//     'khaki': { ar: 'زيتي', hex: '#BDB76B' },
//     'black': { ar: 'أسود', hex: '#000000' },
//     'chala': { ar: 'شالا', hex: '#555555' },
//   };

//   // We'll replace fabrics only. Sort by descending length to avoid partial matches.
//   const fabricKeys = Object.keys(fabrics).sort((a, b) => b.length - a.length);
//   const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

//   let out = html;

//   // Replace fabric tokens with only Arabic text (no English). We preserve spacing and punctuation.
//   for (const key of fabricKeys) {
//     const { ar, hex } = fabrics[key];
//     const rx = new RegExp(`(?<![\\w/])${esc(key)}(?![\\w/])`, 'gi');
//     out = out.replace(rx, () => `<span class="fabric-ar" style="color:${hex}; font-weight:inherit">${ar}</span>`);
//   }
// const colorKeys = Object.keys(colors).sort((a, b) => b.length - a.length);
// for (const key of colorKeys) {
//   const { ar, hex } = colors[key];
//   const rx = new RegExp(`(?<![\\w/])${esc(key)}(?![\\w/])`, 'gi');
//   out = out.replace(
//     rx,
//     () => `<span class="color-ar" style="color:${hex}; font-weight:inherit">${ar}</span>`
//   );
// }
//   // NOTE: we intentionally do NOT replace color tokens here, so English color names remain visible.
//   // If you later want to tint color tokens (but keep English), you could wrap matched color tokens
//   // similarly instead of replacing them.

//   return out;
// }
// 1) NEW: colors bilingual wrapper (does NOT touch size or fabrics)
private applyColorsArabicBilingual(html: string): string {
  const colors: Record<string, { ar: string; hex: string }> = {
    'black - crystal': { ar: 'أسود - كريستال', hex: '#000000' },
    'black - black': { ar: 'أسود - أسود', hex: '#000000' },
    'slate blue grey': { ar: 'رمادي جديد', hex: '#708090' },
    'electric blue': { ar: 'أزرق', hex: '#007FFF' },
    'dusty blue': { ar: 'أزرق', hex: '#7AA5C3' },
    'baby blue': { ar: 'أزرق فاتح', hex: '#A3C7F3' },
    'navy blue': { ar: 'كحلي', hex: '#0A3D62' },
    'royal blue': { ar: 'نيلي', hex: '#4169E1' },
    'hot pink': { ar: 'زهري', hex: '#FF69B4' },
    'baby pink': { ar: 'زهري فاتح', hex: '#F8BBD0' },
    'pastel pink': { ar: 'زهري', hex: '#FFD1DC' },
    'pink': { ar: 'زهري', hex: '#FFC0CB' },
    'cherry red': { ar: 'بوردو فاتح', hex: '#D2042D' },
    'red': { ar: 'أحمر', hex: '#FF0000' },
    'burgundy': { ar: 'بوردو غامق', hex: '#800020' },
    'brick': { ar: 'بريك', hex: '#B55239' },
    'dark green': { ar: 'أخضر غامق', hex: '#006400' },
    'sage green': { ar: 'أخضر', hex: '#9CAF88' },
    'mint': { ar: 'مينت', hex: '#98FF98' },
    'green': { ar: 'أخضر', hex: '#008000' },
    'aqua': { ar: 'تركوازي', hex: '#00BCD4' },
    'orange': { ar: 'أورنج', hex: '#FFA500' },
    'yellow': { ar: 'أصفر', hex: '#FFD000' },
    'aubergine': { ar: 'اوبرجين', hex: '#580F41' },
    'lilac': { ar: 'ليلكي', hex: '#C8A2C8' },
    'ivory': { ar: 'عاجي', hex: '#FFFFF0' },
    'off white': { ar: 'أوف وايت', hex: '#F8F8F2' },
    'white': { ar: 'أبيض', hex: '#000000' },
    'grey': { ar: 'رمادي', hex: '#808080' },
    'gray': { ar: 'رمادي', hex: '#808080' },
    'choco': { ar: 'شوكو', hex: '#5D3A1A' },
    'brown': { ar: 'بني', hex: '#8B4513' },
    'nude': { ar: 'بيج', hex: '#C8AD7F' },
    'khaki': { ar: 'زيتي', hex: '#BDB76B' },
    'black': { ar: 'أسود', hex: '#000000' },
    'chala': { ar: 'شالا', hex: '#555555' },
  };
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const colorKeys = Object.keys(colors).sort((a, b) => b.length - a.length);

  let out = html;
  for (const key of colorKeys) {
    const { ar, hex } = colors[key];
    const rx = new RegExp(`(?<![\\w/])${esc(key)}(?![\\w/])`, 'gi');
    out = out.replace(rx, (matched) =>
      `<span class="color-ar-en" style="color:${hex};font-weight:inherit">${ar} <span class="color-en" style="font-weight:normal;color:inherit">(${matched})</span></span>`
    );
  }
  return out;
}

private applyPrintColorArabic(html: string): string {
  // Fabrics -> Arabic only
  const fabrics: Record<string, { ar: string; hex: string }> = {
    'cotton': { ar: 'قطن', hex: '#000000' },
    'cotton lycra': { ar: 'قطن لايكرا', hex: '#000000' },
    'poplin': { ar: 'بوبلين', hex: '#000000' },
    'crepe half lycra': { ar: 'كريب نصف لايكرا', hex: '#000000' },
    'leather': { ar: 'جلد', hex: '#000000' },
    'satin': { ar: 'ساتان', hex: '#000000' },
    'stretchy material': { ar: 'جورسيه', hex: '#000000' },
    'crepe without lycra': { ar: 'كريب بدون لايكرا', hex: '#000000' },
  };

  // Colors -> Arabic + English (English preserved)
  const colors: Record<string, { ar: string; hex: string }> = {
    'black - crystal': { ar: 'أسود - كريستال', hex: '#000000' },
    'black - black': { ar: 'أسود - أسود', hex: '#000000' },
    'slate blue grey': { ar: 'رمادي جديد', hex: '#708090' },
    'electric blue': { ar: 'أزرق', hex: '#007FFF' },
    'dusty blue': { ar: 'أزرق', hex: '#7AA5C3' },
    'baby blue': { ar: 'أزرق فاتح', hex: '#A3C7F3' },
    'navy blue': { ar: 'كحلي', hex: '#0A3D62' },
    'royal blue': { ar: 'نيلي', hex: '#4169E1' },
    'hot pink': { ar: 'زهري', hex: '#FF69B4' },
    'baby pink': { ar: 'زهري فاتح', hex: '#F8BBD0' },
    'pastel pink': { ar: 'زهري', hex: '#FFD1DC' },
    'pink': { ar: 'زهري', hex: '#FFC0CB' },
    'cherry red': { ar: 'بوردو فاتح', hex: '#D2042D' },
    'red': { ar: 'أحمر', hex: '#FF0000' },
    'burgundy': { ar: 'بوردو غامق', hex: '#800020' },
    'brick': { ar: 'بريك', hex: '#B55239' },
    'dark green': { ar: 'أخضر غامق', hex: '#006400' },
    'sage green': { ar: 'أخضر', hex: '#9CAF88' },
    'mint': { ar: 'مينت', hex: '#98FF98' },
    'green': { ar: 'أخضر', hex: '#008000' },
    'aqua': { ar: 'تركوازي', hex: '#00BCD4' },
    'orange': { ar: 'أورنج', hex: '#FFA500' },
    'yellow': { ar: 'أصفر', hex: '#FFD000' },
    'aubergine': { ar: 'اوبرجين', hex: '#580F41' },
    'lilac': { ar: 'ليلكي', hex: '#C8A2C8' },
    'ivory': { ar: 'عاجي', hex: '#FFFFF0' },
    'off white': { ar: 'أوف وايت', hex: '#F8F8F2' },
    'white': { ar: 'أبيض', hex: '#000000' },
    'grey': { ar: 'رمادي', hex: '#808080' },
    'gray': { ar: 'رمادي', hex: '#808080' },
    'choco': { ar: 'شوكو', hex: '#5D3A1A' },
    'brown': { ar: 'بني', hex: '#8B4513' },
    'nude': { ar: 'بيج', hex: '#C8AD7F' },
    'khaki': { ar: 'زيتي', hex: '#BDB76B' },
    'black': { ar: 'أسود', hex: '#000000' },
    'chala': { ar: 'شالا', hex: '#555555' },
  };

  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Important: we intentionally do not touch size tokens here.
  // If you have special size tokens to explicitly preserve, we can add a safety pass,
  // but with this approach we only replace fabrics and colors and leave everything else as-is.

  let out = html;

  // Replace fabrics (Arabic only). Sort by descending length to avoid partial match.
  const fabricKeys = Object.keys(fabrics).sort((a, b) => b.length - a.length);
  for (const key of fabricKeys) {
    const { ar, hex } = fabrics[key];
    const rx = new RegExp(`(?<![\\w/])${esc(key)}(?![\\w/])`, 'gi');
    out = out.replace(rx, () => `<span class="fabric-ar" dir="rtl" style="color:${hex}; font-weight:inherit">${ar}</span>`);
  }

  // Replace colors -> Arabic + (original English)
  // We preserve the exact matched English text via the replace callback's match argument.
  const colorKeys = Object.keys(colors).sort((a, b) => b.length - a.length);
  for (const key of colorKeys) {
    const { ar, hex } = colors[key];
    const rx = new RegExp(`(?<![\\w/])${esc(key)}(?![\\w/])`, 'gi');
    out = out.replace(rx, (matched) => {
      // matched = the original English color as it appeared (preserves case).
      // We show Arabic first, then the original English in parentheses.
      // The outer span gets the tint; english part has class for optional styling.
      return `<span class="color-ar-en" style="color:${hex}; font-weight:inherit">${ar} <span class="color-en" style="font-weight:normal; color:inherit">(${matched})</span></span>`;
    });
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

  close() { this.show = false; this.closed.emit(); }
  switch(mode: 'invoice' | 'packing') { this.mode = mode; }

  // ----------- Display helpers -----------
  /** Show 'COD' when gateway empty/undefined */
  paymentGatewayDisplay(): string {
    const gw = (this.order?.paymentGateway
      ?? this.order?.paymentGatewayNames?.[0]
      ?? '').toString().trim();
    return gw || 'COD';
  }

  /** Subtotal = Σ (item price * qty). Uses UNIT_PRICE (fallback PRICE). */
// 2) Totals helpers (support discounts + shipping like Shopify)
itemsSubtotal(): number {
  const items = this.order?.items ?? [];
  const sum = items.reduce((acc: number, it: any) => {
    const price = Number((it.UNIT_PRICE ?? it.PRICE) ?? 0);
    const qty = Number(it.QUANTITY ?? 0);
    return acc + price * qty;
  }, 0);
  return Math.round(sum * 100) / 100;
}

// Prefer explicit fields if your service provides them; otherwise infer.
shippingFee(): number {
  const explicit = Number(this.order?.shippingPrice ?? this.order?.shipping ?? 0);
  if (!isNaN(explicit) && explicit > 0) return Math.round(explicit * 100) / 100;

  // fallback inference: if a "SHIPPING" line was not provided, try
  // to keep delivery row hidden unless we can infer a positive value.
  const total = Number(this.order?.total ?? 0);
  const inferred = total - this.discountAmount() - this.itemsSubtotal();
  return Math.max(Math.round(inferred * 100) / 100, 0);
}

discountAmount(): number {
  // use explicit total discounts if present (recommended)
  const explicit = Number(this.order?.totalDiscounts ?? this.order?.discountAmount ?? 0);
  if (!isNaN(explicit) && explicit > 0) return Math.round(explicit * 100) / 100;

  // fallback inference: subtotal + shipping - total
  const total = Number(this.order?.total ?? 0);
  const ship = Number(this.order?.shippingPrice ?? this.order?.shipping ?? 0);
  const inferred = this.itemsSubtotal() + ship - total;
  return Math.max(Math.round(inferred * 100) / 100, 0);
}


  /** Delivery = order.total − subtotal (never negative). */
  deliveryFee(): number {
    const total = Number(this.order?.total ?? 0);
    const fee = Math.max(total - this.itemsSubtotal(), 0);
    return Math.round(fee * 100) / 100;
  }

  // ----------- Zone / badge -----------
  get isExpress(): boolean {
    return /\bexpress\b/i.test(this.order?.shippingMethod || '');
  }

  get zone(): 'N' | 'S' | 'M' | 'B' | null {
    const sm = (this.order?.shippingMethod || '').toLowerCase();
    if (/\bexpress\b/.test(sm)) return null;
    if (/north\s*lebanon/.test(sm)) return 'N';
    if (/south\s*lebanon/.test(sm)) return 'S';
    if (/mount\s*lebanon/.test(sm)) return 'M';
    if (/bekaa/.test(sm)) return 'B';
    return null; // Beirut/unknown
  }

  get zoneColor(): string {
    switch (this.zone) {
      case 'N': return '#16a34a';
      case 'S': return '#2563eb';
      case 'M': return '#9333ea';
      case 'B': return '#eab308';
      default: return '#999999';
    }
  }

  // ----------- Print -----------
  print() {
    const host = this.printArea?.nativeElement;
    if (!host) { window.print(); return; }
  
    let html = host.innerHTML;
  
    // ✅ Only tint / bilingualize on PACKING
    if (this.mode === 'packing') {
      // colors: EN→(AR + EN), then fabrics: EN→AR only
      html = this.applyColorsArabicBilingual(
        this.applyFabricArabicOnly(html)
      );
    }

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
  .items-table tfoot td{font-weight:600}
  .items-table tfoot .muted{color:#666;font-weight:500}

  .total-line{display:flex;justify-content:flex-end;margin-top:1rem;font-size:18px;font-weight:600}
  .footer-note{text-align:center;margin-top:2rem;font-size:14px;color:#555}

  /* ---------- PRINT BADGE ---------- */
  .zone-badge{
    position:fixed; top:8mm; left:50%; transform:translateX(-50%);
    z-index:99999; text-align:center; pointer-events:none;
  }
  .zone-badge .circle{
    --badge-size:120px; width:var(--badge-size); height:var(--badge-size);
    border-radius:50%; border:8px solid var(--badge-color,#1FA64A);
    color:var(--badge-color,#1FA64A);
    display:flex; align-items:center; justify-content:center;
    font-weight:900; font-size:68px; line-height:1; margin:0 auto;
  }
  .zone-badge.express .circle{ display:none; }
  .zone-badge.express .express-text{ color:#d61f1f; font-weight:900; font-size:54px; line-height:1.05; }
  .zone-badge.express .express-text .ar{ font-size:30px; }

  .packing-wrapper .items-table .thumb{ width:100px !important; height:100px !important; }

  /* SIZE RING (print only) */
  .size-ring{
    display:inline-flex; align-items:center; justify-content:center;
    width:20px; height:20px; border:2px solid #d61f1f; border-radius:50%;
    box-sizing:border-box; padding:2px 3px; font-size:10px; line-height:1; color:inherit;
    vertical-align:middle; margin:0 10px;
  }
  @media print { .cols{grid-template-columns:1fr 1fr} }
</style>`;

    // hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow!.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print</title>${css}</head><body>${html}</body></html>`);
    doc.close();

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
  private buildPrintCSS(): string {
    return `
  <style>
    @page { margin: 12mm; }
    html, body { padding:0; margin:0; font-family:"Segoe UI",system-ui,sans-serif; color:#111; }
  
    /* page wrapper so overlays stay inside their own page */
    .page { position: relative; }
    .page-break { page-break-after: always; height:0; overflow:hidden; }
  
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
    .items-table tfoot td{font-weight:600}
    .items-table tfoot .muted{color:#666;font-weight:500}
  
    .total-line{display:flex;justify-content:flex-end;margin-top:1rem;font-size:18px;font-weight:600}
    .footer-note{text-align:center;margin-top:2rem;font-size:14px;color:#555}
  
    /* === IMPORTANT: scope badge ONLY to packing pages === */
    .packing-wrapper .zone-badge{
      position:absolute !important; /* was fixed; now contained in this page */
      top:8mm; left:50%; transform:translateX(-50%);
      z-index:99999; text-align:center; pointer-events:none;
    }
    .packing-wrapper .zone-badge .circle{
      --badge-size:120px; width:var(--badge-size); height:var(--badge-size);
      border-radius:50%; border:8px solid var(--badge-color,#1FA64A);
      color:var(--badge-color,#1FA64A);
      display:flex; align-items:center; justify-content:center;
      font-weight:900; font-size:68px; line-height:1; margin:0 auto;
    }
    .packing-wrapper .zone-badge.express .circle{ display:none; }
    .packing-wrapper .zone-badge.express .express-text{ color:#d61f1f; font-weight:900; font-size:54px; line-height:1.05; }
    .packing-wrapper .zone-badge.express .express-text .ar{ font-size:30px; }
  
    /* Never show badge on invoice pages (extra safety) */
    .invoice-wrapper .zone-badge { display:none !important; }
  
    /* Packing big thumbs & size ring for packing only (invoice unaffected) */
    .packing-wrapper .items-table .thumb{ width:100px !important; height:100px !important; }
    .packing-wrapper .size-ring{
      display:inline-flex; align-items:center; justify-content:center;
      width:20px; height:20px; border:2px solid #d61f1f; border-radius:50%;
      box-sizing:border-box; padding:2px 3px; font-size:10px; line-height:1; color:inherit;
      vertical-align:middle; margin:0 10px;
    }
  </style>`;
  }
  private applyFabricArabicOnly(html: string): string {
    const fabrics: Record<string, string> = {
      'cotton': 'قطن',
      'cotton lycra': 'قطن لايكرا',
      'poplin': 'بوبلين',
      'crepe half lycra': 'كريب نصف لايكرا',
      'leather': 'جلد',
      'satin': 'ساتان',
      'stretchy material': 'جورسيه',
      'crepe without lycra': 'كريب بدون لايكرا',
    };
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let out = html;
    for (const k of Object.keys(fabrics).sort((a,b)=>b.length-a.length)) {
      const rx = new RegExp(`(?<![\\w/])${esc(k)}(?![\\w/])`, 'gi');
      out = out.replace(rx, () => `<span class="fabric-ar" dir="rtl">${fabrics[k]}</span>`);
    }
    return out;
  }
  

  private nextTick(): Promise<void> {
    return new Promise(res => setTimeout(res, 0));
  }

  private async captureHTML(mode: 'invoice' | 'packing'): Promise<string> {
    this.mode = mode;
    await this.nextTick();
    const host = this.printArea?.nativeElement;
    if (!host) return '';
  
    let html = host.innerHTML;
  
    if (mode === 'packing') {
      html = this.applyPrintColorArabic(this.applyColorsArabicBilingual(html));
    }
  return html;

  }

  /** Public: print 2× invoice + 1× packing in one job */
  async printBundle(copies = { invoice: 2, packing: 1 }): Promise<void> {
    // Render both templates once
    const invoiceHTML = await this.captureHTML('invoice');
    const packingHTML = await this.captureHTML('packing');

    // Build combined document: [invoice, invoice, packing]
    // Build combined document: [invoice, invoice, packing]
    const parts: string[] = [];
    for (let i = 0; i < (copies.invoice || 0); i++) {
      parts.push(`<section class="page"><div class="print-content invoice-wrapper">${invoiceHTML}</div></section>`);
      parts.push(`<div class="page-break"></div>`);
    }
    for (let i = 0; i < (copies.packing || 0); i++) {
      parts.push(`<section class="page"><div class="print-content packing-wrapper">${packingHTML}</div></section>`);
      if (i < (copies.packing - 1)) parts.push(`<div class="page-break"></div>`);
    }


    const css = this.buildPrintCSS();

    // Hidden iframe (same pattern as your print())
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow!.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print</title>${css}</head><body>${parts.join('')}</body></html>`);
    doc.close();

    const w = iframe.contentWindow!;
    const imgs = Array.from(doc.images || []);
    const done = () => { w.focus(); w.print(); setTimeout(() => document.body.removeChild(iframe), 100); };

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
