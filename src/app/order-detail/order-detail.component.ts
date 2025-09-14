import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ShopifyService } from '../shopify.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.css']
})
export class OrderDetailComponent implements OnInit {
  data: any;
  loading = true;

  constructor(private route: ActivatedRoute, private api: ShopifyService) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getOrderDetail(id).subscribe({
      next: (d) => { 
        this.data = {
          ...d.order,            // flatten order fields
          address: d.address,
          items: d.items || [],
          payments: d.payments || []
        };
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }
  
}
