import type { Metadata } from "next";
import Link from "next/link";
import { BsCheckCircle, BsChevronLeft } from "react-icons/bs";

export const metadata: Metadata = {
  title: "Thank You | Valasaravakkam Samithi",
  description: "Your message has been submitted successfully.",
};

export default function ThankYouPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-lg rounded-2xl bg-white p-10 text-center shadow-xl ring-1 ring-gray-100">
        <BsCheckCircle className="mx-auto text-6xl text-green-600" />
        <h2 className="mt-4 font-display text-3xl font-bold text-green-600">
          Thank You!
        </h2>
        <p className="mt-4 text-muted">
          Your message has been successfully submitted. We appreciate your message —
          it will be very helpful to us.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1 rounded-md bg-primary px-6 py-2.5 font-semibold text-white transition hover:bg-primary-dark"
        >
          <BsChevronLeft className="text-xl" />
          Return to Home
        </Link>
      </div>
    </div>
  );
}
