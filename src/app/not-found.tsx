import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-7xl font-bold text-[#149ddd]">404</h1>
      <p className="mt-4 text-lg text-muted">
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
