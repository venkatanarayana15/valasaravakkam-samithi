import type { Metadata } from "next";
import Link from "next/link";
import { BsCheckCircle, BsChevronLeft } from "react-icons/bs";

export const metadata: Metadata = {
  title: "Thank You | Valasaravakkam Samithi",
  description: "Your message has been submitted successfully.",
};

export default function ThankYouPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 dark:bg-[#0f172a] sm:min-h-screen">
      <div className="max-w-lg rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-gray-100 dark:bg-[#1e293b] dark:ring-gray-700 sm:p-10">
        <BsCheckCircle className="mx-auto text-5xl text-green-600 sm:text-6xl" />
        <h2 className="mt-4 font-display text-2xl font-bold text-green-600 sm:text-3xl">
          Thank You!
        </h2>
        <p className="mt-4 text-sm text-muted dark:text-gray-400 sm:text-base">
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
