import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import PickingListPage from "./pages/PickingListPage";
import ProductionPage from "./pages/ProductionPage";

function Placeholder({ title }) {
  return (
    <div className="p-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-2 text-white/60">Coming next…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div>
        <div className="hidden md:block">
          <TopBar />
        </div>

        <div className="mx-auto max-w-7xl px-3 md:px-6 pb-20 md:pb-8">
          <Routes>
            <Route path="/" element={<Navigate to="/orders" replace />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
            <Route path="/picking" element={<PickingListPage />} />
            <Route path="/production" element={<ProductionPage />} />
          </Routes>
        </div>

        <div className="md:hidden fixed bottom-0 left-0 right-0">
          <BottomNav />
        </div>
      </div>
    </BrowserRouter>
  );
}
