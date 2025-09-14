import { Component, OnInit } from '@angular/core';
import { ShopifyService } from '../shopify.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [CommonModule]
})
export class DashboardComponent implements OnInit {
  orders: any[] = [];
  totalRevenue = 0;
  todayRevenue = 0;
  totalOrders = 0;
  pendingOrders = 0;
  loading = true;
  constructor(private shopifyService: ShopifyService) {}

  ngOnInit(): void {
    this.shopifyService.getOrders().subscribe({
      next: (data) => {
        console.log("Orders from API:", data); // ✅ Debug
    
        this.orders = data;
    
        this.totalOrders = data.length;
        this.totalRevenue = data.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        this.todayRevenue = data
          .filter(o => new Date(o.date).toDateString() === new Date().toDateString())
          .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        this.pendingOrders = data.filter(o => (o.status || '').toLowerCase() === 'pending').length;
        
    
        this.loading = false;
      }
    });
  }    
}
