export function Card({ className = "", children }) {
    return (
      <div
        className={"rounded-2xl border " + className}
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgb(var(--card))",
        }}
      >
        {children}
      </div>
    );
  }
  
  export function SoftPanel({ className = "", children }) {
    return (
      <div
        className={"rounded-2xl border " + className}
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgb(var(--bg))",
        }}
      >
        {children}
      </div>
    );
  }
  
  export function Input({ className = "", ...props }) {
    return (
      <input
        {...props}
        className={
          "w-full rounded-xl border px-3 py-2 text-sm outline-none " + className
        }
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgb(var(--bg))",
          color: "rgb(var(--text))",
        }}
      />
    );
  }
  
  export function Select({ className = "", children, ...props }) {
    return (
      <select
        {...props}
        className={
          "w-full rounded-xl border px-3 py-2 text-sm outline-none " + className
        }
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgb(var(--bg))",
          color: "rgb(var(--text))",
        }}
      >
        {children}
      </select>
    );
  }
  
  export function Button({ className = "", variant = "primary", ...props }) {
    const styles =
      variant === "ghost"
        ? { background: "transparent" }
        : variant === "soft"
        ? { background: "rgb(var(--bg))" }
        : { background: "rgb(var(--text))", color: "rgb(var(--card))" };
  
    return (
      <button
        {...props}
        className={
          "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-black transition disabled:opacity-50 " +
          className
        }
        style={{
          borderColor: "rgb(var(--border))",
          color: styles.color || "rgb(var(--text))",
          background: styles.background,
        }}
      />
    );
  }
  
  export function Muted({ children }) {
    return <div style={{ color: "rgb(var(--muted))" }}>{children}</div>;
  }
  