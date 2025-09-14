import { Component, OnInit } from '@angular/core';
import { ShopifyService } from '../shopify.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-orders-list',
  templateUrl: './orders-list.component.html',
  styleUrls: ['./orders-list.component.css'],
  imports: [CommonModule, FormsModule, RouterModule],
})
export class OrdersListComponent implements OnInit {
  orders: any[] = [];
  loading = true;

  constructor(private shopifyService: ShopifyService) {}

  ngOnInit(): void {
    this.shopifyService.getOrders().subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching orders', err);
        this.loading = false;
      }
    });
  }

  getStatusBadge(status: string | null | undefined): string {
    if (!status) {
      return 'badge bg-secondary'; // fallback when missing
    }
  
    switch (status.toLowerCase()) {
      case 'paid': return 'badge bg-success';
      case 'pending': return 'badge bg-warning text-dark';
      case 'voided': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  }
  
}
