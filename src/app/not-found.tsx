import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center dark:bg-[#0f172a] sm:min-h-screen">
      <h1 className="font-display text-5xl font-bold text-primary sm:text-7xl">404</h1>
      <p className="mt-4 text-base text-muted dark:text-gray-400 sm:text-lg">
        The page you are looking for could not be found.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-md bg-primary px-6 py-2.5 font-semibold text-white transition hover:bg-primary-dark"
      >
        Return to Home
      </Link>
    </div>
  );
}
