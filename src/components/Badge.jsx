export default function Badge({ children }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-extrabold"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgb(var(--bg))",
        color: "rgb(var(--text))",
      }}
    >
      {children}
    </span>
  );
}
