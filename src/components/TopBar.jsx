import { NavLink } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { Moon, Sun } from "lucide-react";

function Tab({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "px-4 py-2 rounded-xl text-sm font-black transition " +
        (isActive ? "border" : "opacity-70 hover:opacity-100")
      }
      style={({ isActive }) => ({
        borderColor: isActive ? "rgb(var(--border))" : "transparent",
        background: isActive ? "rgb(var(--bg))" : "transparent",
        color: "rgb(var(--text))",
      })}
    >
      {children}
    </NavLink>
  );
}

export default function TopBar() {
  const { theme, toggle } = useTheme(); // ✅ THIS is what was missing

  return (
    <div
      className="sticky top-0 z-20 border-b backdrop-blur"
      style={{
        borderColor: "rgb(var(--border))",
        background: theme === "dark" ? "rgba(2,6,23,0.70)" : "rgba(248,250,252,0.75)",
      }}
    >
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
        <div className="font-black text-lg tracking-tight" style={{ color: "rgb(var(--text))" }}>
          Shopify Dashboard
        </div>

        <div className="flex items-center gap-2">
          <Tab to="/orders">Orders</Tab>
          <Tab to="/picking">Picking</Tab>
          <Tab to="/production">Production</Tab>

          <button
            onClick={toggle}
            className="ml-2 rounded-xl border px-3 py-2 text-sm font-black"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgb(var(--card))",
              color: "rgb(var(--text))",
            }}
          >
            <span className="inline-flex items-center gap-2">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              {theme === "dark" ? "Light" : "Dark"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
