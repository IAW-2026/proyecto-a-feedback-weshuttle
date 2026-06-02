export default function Topbar() {
  return (
    <header className="flex justify-between items-center w-full px-5 h-16 bg-white border-b border-[var(--ws-outline)] shadow-sm">

      <div className="ws-brand">
        WeShuttle
      </div>

      <button className="p-2 rounded-md text-[var(--ws-midnight)] hover:bg-slate-100">
        <span className="material-symbols-outlined">
          notifications
        </span>
      </button>

    </header>
  )
}