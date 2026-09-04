"use client";

import { useEffect, useState } from "react";
import { BsArrowUpShort } from "react-icons/bs";

export default function ScrollTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a
      href="#hero"
      aria-label="Scroll to top"
      className={`fixed bottom-20 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[#149ddd] text-lg text-white shadow-lg transition-all hover:bg-[#0f7eb5] dark:bg-blue-600 dark:hover:bg-blue-500 sm:bottom-4 sm:z-50 sm:h-10 sm:w-10 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <BsArrowUpShort />
    </a>
  );
}
