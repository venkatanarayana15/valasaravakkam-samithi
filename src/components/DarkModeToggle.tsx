"use client";

import { useDarkMode } from "@/lib/dark-mode";

export default function DarkModeToggle() {
  const { resolved, toggle } = useDarkMode();

  return (
    <button
      type="button"
      aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/15"
    >
      {resolved === "dark" ? (
        /* Sun icon */
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-[18px] text-amber-300"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        /* Moon icon */
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-[18px] text-[#a8a9b4]"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
