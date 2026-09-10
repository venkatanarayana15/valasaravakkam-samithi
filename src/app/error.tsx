"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center dark:bg-[#0f172a] sm:min-h-screen">
      <h1 className="font-display text-5xl font-bold text-primary sm:text-7xl">Om Shanti</h1>
      <p className="mt-4 text-base text-muted dark:text-gray-400 sm:text-lg">
        Something unexpected interrupted this page.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-6 py-2.5 font-semibold text-white transition hover:bg-primary-dark"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-gray-300 px-6 py-2.5 font-semibold text-[#272829] transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-white/5"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
