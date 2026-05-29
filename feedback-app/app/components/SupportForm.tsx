export default function SupportForm() {
  return (
    <div className="ws-card ws-card-large">

      <h2 className="text-2xl font-bold text-[var(--ws-midnight)] mb-6">
        Report an Issue
      </h2>

      <form className="space-y-4">

        <div>
          <label className="block text-sm font-semibold text-[var(--ws-slate)] mb-2">
            Category
          </label>

          <select className="ws-select">
            <option>Ride Experience</option>
            <option>Driver Behavior</option>
            <option>App Functionality</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--ws-slate)] mb-2">
            Details
          </label>

          <textarea
            rows={4}
            className="ws-textarea"
          />
        </div>

        <button className="ws-primary-button w-full cursor-pointer">
          Submit Ticket
        </button>

      </form>
    </div>
  )
}