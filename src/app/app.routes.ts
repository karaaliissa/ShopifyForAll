import { Routes } from '@angular/router';
import { OrdersListComponent } from './orders-list/orders-list.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { OrdersComponent } from './orders/orders.component';

export const routes: Routes = [
    { path: '', component: OrdersComponent },
    { path: 'orders', component: OrdersListComponent },
    // app-routing (or in your standalone bootstrap)
{ path: 'orders/:id', loadComponent: () => import('./order-detail/order-detail.component').then(m => m.OrderDetailComponent) }

];
