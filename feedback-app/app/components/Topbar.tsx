export default function Topbar() {
  return (
    <header className="flex justify-between items-center w-full px-5 h-16 bg-white border-b border-gray-300">

      <div className="text-2xl font-bold text-blue-600">
        WeShuttle
      </div>

      <button className="p-2 hover:bg-gray-100 rounded">
        <span className="material-symbols-outlined">
          notifications
        </span>
      </button>

    </header>
  )
}