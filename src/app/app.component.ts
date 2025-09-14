import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { DashboardComponent } from "./dashboard/dashboard.component";
import { OrdersListComponent } from './orders-list/orders-list.component';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrdersComponent } from './orders/orders.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DashboardComponent, OrdersListComponent, CommonModule, FormsModule, OrdersComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'ShopifyAppForAll';
}
