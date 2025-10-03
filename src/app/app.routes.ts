import { Routes } from '@angular/router';
import { OrdersComponent } from './orders/orders.component';
import { OrdersBoardComponent } from './orders-board/orders-board.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: OrdersBoardComponent },
  // { path: 'orders', component: OrdersListComponent },

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
    path: 'picking',
    loadComponent: () => import('./picking/picking.component').then(m => m.PickingComponent),
  },
  {
    path: 'production',
    loadComponent: () => import('./production-board/production-board.component').then(m => m.ProductionBoardComponent),
  },
];
