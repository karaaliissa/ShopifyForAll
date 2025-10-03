import { Routes } from '@angular/router';
// ❌ remove this eager import
// import { OrdersBoardComponent } from './orders-board/orders-board.component';
import { OrdersListComponent } from './orders-list/orders-list.component';
import { OrdersComponent } from './orders/orders.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: OrdersComponent },
  { path: 'orders', component: OrdersListComponent },

  // ✅ use lazy for the board and keep only one route to it
  {
    path: 'orderss', // keep your existing URL
    loadComponent: () =>
      import('./orders-board/orders-board.component').then(m => m.OrdersBoardComponent),
  },

  // (optional alias)
  {
    path: 'board',
    loadComponent: () =>
      import('./orders-board/orders-board.component').then(m => m.OrdersBoardComponent),
  },

  {
    path: 'orders/:id',
    loadComponent: () =>
      import('./order-detail/order-detail.component').then(m => m.OrderDetailComponent),
  },
];
