export default function HelpPage() {
  return (
    <main className="min-h-screen bg-[#0D0D0D] text-[#F5F5DC] px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold text-[#E5A823]">Help Center</h1>
        <p className="mt-4 text-[#F5F5DC]/80">
          Need assistance with bookings, payments, event hosting, or account access?
        </p>

        <section className="mt-10 space-y-6">
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h2 className="text-xl font-semibold">Common Issues</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[#F5F5DC]/75">
              <li>Unable to log in or reset password</li>
              <li>Payment verification delay</li>
              <li>Venue profile setup errors</li>
              <li>Event request approval status questions</li>
            </ul>
          </div>

          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h2 className="text-xl font-semibold">Contact Support</h2>
            <p className="mt-3 text-[#F5F5DC]/75">
              Email: support@easyentry.in
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
