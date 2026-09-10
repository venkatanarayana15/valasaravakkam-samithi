"use client";

import { BsDownload } from "react-icons/bs";

type DownloadButtonProps = {
  href: string;
  label: string;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Same-origin `download` attributes are ignored cross-origin — when images
 * move to Stratus (NEXT_PUBLIC_ASSET_BASE) a bare <a download> would navigate
 * instead of saving. This control fetches the bytes and saves them via an
 * object URL, which works for both same-origin and CORS-enabled remote
 * assets, falling back to normal navigation if the fetch fails.
 */
export default function DownloadButton({ href, label, className = "", children }: DownloadButtonProps) {
  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = href.split("/").pop() || "image";
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // CORS or network failure: open the image directly as a last resort.
      window.open(href, "_blank", "noopener");
    }
  }

  return (
    <a
      href={href}
      download
      onClick={handleDownload}
      aria-label={label}
      className={className}
    >
      {children ?? <BsDownload />}
    </a>
  );
}
