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
      className={`fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#149ddd] text-lg text-white shadow-lg transition-all hover:bg-[#0f7eb5] ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <BsArrowUpShort />
    </a>
  );
}
