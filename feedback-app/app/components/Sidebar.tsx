export default function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col h-full w-80 fixed left-0 top-0 z-50 border-r border-gray-300 bg-white p-4">

      {/* Header */}
      <div className="flex flex-col gap-2 mb-8 mt-4 px-1">

        <div className="text-2xl font-black text-blue-600 mb-6">
          WeShuttle
        </div>

        <div className="flex items-center gap-4">

          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBb9Z2QkkuSU0m1LAay3tpb_iZRvn1f2WCamjPjY8P8RrNRL_i-LjhfKIF8jT0eCmsyn98usB_8YIDpVe8BbwkPUQg5xCWv3qxlfHBZuEuEo9u2Wb-bDTXL21RCZl9hAiwgx7tpGlUihhrutAuMetKoKVvsSQ1-WSC3Wu5V_QEL0NvjfHXe0qqPY05IA-bZFXSNr6A5XRILQNFT12MQb7Sq-bEhMaG2pWVYgVG3Or9KHjZQ0WwpvvZS4iQd7QXWk832Y6j64vWMAss"
            alt="avatar"
            className="w-12 h-12 rounded-full object-cover"
          />

          <div>
            <h2 className="text-base font-semibold">
              Welcome back
            </h2>

            <p className="text-sm text-gray-500">
              Passenger Account
            </p>
          </div>

        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 flex flex-col gap-2">

        <a
          href="#"
          className="flex items-center gap-4 px-4 py-2 hover:bg-gray-100"
        >
          <span className="material-symbols-outlined">
            history
          </span>

          <span>My Trips</span>
        </a>

        <a
          href="#"
          className="flex items-center gap-4 px-4 py-2 bg-blue-600 text-white"
        >
          <span className="material-symbols-outlined">
            contact_support
          </span>

          <span>Support</span>
        </a>

      </nav>

    </aside>
  )
}