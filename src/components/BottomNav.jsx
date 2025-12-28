import { NavLink } from "react-router-dom";
import { List, ClipboardList, Factory } from "lucide-react";

function Item({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "flex-1 py-3 flex flex-col items-center justify-center text-xs font-bold transition " +
        (isActive ? "text-white" : "text-white/50")
      }
    >
      <Icon size={18} />
      <span className="mt-1">{label}</span>
    </NavLink>
  );
}

export default function BottomNav() {
  return (
    <div className="flex border-t border-white/10 bg-slate-950/80 backdrop-blur">
      <Item to="/orders" icon={List} label="Orders" />
      <Item to="/picking" icon={ClipboardList} label="Picking" />
      <Item to="/production" icon={Factory} label="Production" />
    </div>
  );
}
