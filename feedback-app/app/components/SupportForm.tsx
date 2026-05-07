export default function SupportForm() {
  return (
    <div className="bg-white p-6 border border-gray-300">

      <h2 className="text-2xl font-bold mb-6">
        Report an Issue
      </h2>

      <form className="space-y-4">

        <div>
          <label className="block text-sm text-gray-500 mb-2">
            Category
          </label>

          <select className="w-full border border-gray-300 p-3">
            <option>Ride Experience</option>
            <option>Driver Behavior</option>
            <option>App Functionality</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-2">
            Details
          </label>

          <textarea
            rows={4}
            className="w-full border border-gray-300 p-3"
          />
        </div>

        <button className="w-full bg-blue-600 text-white p-3 font-semibold hover:bg-blue-700">
          Submit Ticket
        </button>

      </form>
    </div>
  )
}