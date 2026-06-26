export default function BookingForm() {
  const fields = [
    {
      id: "fullName",
      label: "Full Name",
      type: "text",
      placeholder: "Enter your full name",
      autoComplete: "name",
    },
    {
      id: "mobile",
      label: "Mobile Number",
      type: "tel",
      placeholder: "10-digit mobile number",
      autoComplete: "tel",
    },
    {
      id: "email",
      label: "Email Address",
      type: "email",
      placeholder: "you@example.com",
      autoComplete: "email",
    },
    {
      id: "eventDate",
      label: "Event Date",
      type: "date",
      placeholder: "",
      autoComplete: "off",
    },
    {
      id: "guestCount",
      label: "Guest Count",
      type: "number",
      placeholder: "e.g. 250",
      autoComplete: "off",
    },
    {
      id: "venue",
      label: "Venue",
      type: "text",
      placeholder: "City / Banquet / Address",
      autoComplete: "off",
    },
  ];

  return (
    <section id="book" className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="eyebrow text-xs font-semibold text-gold sm:text-sm">05</p>
        <h2 className="mt-2 text-3xl text-ink sm:text-4xl">
          Book Your Celebration
        </h2>
        <p className="font-script mt-3 text-xl text-ink-soft sm:text-2xl">
          Fill in the details to confirm your booking.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-cream-3 bg-white p-6 shadow-sm sm:mt-12 sm:p-8 lg:p-10">
        <form className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.id} className="flex flex-col gap-1.5">
              <label
                htmlFor={field.id}
                className="text-sm text-ink-soft"
              >
                {field.label}
              </label>
              <input
                id={field.id}
                name={field.id}
                type={field.type}
                placeholder={field.placeholder || undefined}
                autoComplete={field.autoComplete}
                className="rounded-lg border border-cream-3 bg-cream/40 px-3 py-2.5 text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-maroon"
              />
            </div>
          ))}

          <div className="sm:col-span-2">
            <button
              type="button"
              className="w-full rounded-lg bg-maroon px-5 py-3 text-base font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark"
            >
              Submit Booking Request
            </button>
            <p className="mt-3 text-center text-xs text-ink-soft">
              Your data is safe with us. We will get back to you shortly to
              confirm your booking.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
