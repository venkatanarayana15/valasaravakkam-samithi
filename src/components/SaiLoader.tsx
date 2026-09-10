import Image from "next/image";
import { asset } from "@/lib/data";

type SaiLoaderProps = {
  size?: "sm" | "md" | "lg";
  caption?: string;
};

const SIZES = {
  sm: { box: "h-10 w-10", emblem: 28 },
  md: { box: "h-14 w-14", emblem: 40 },
  lg: { box: "h-20 w-20", emblem: 56 },
} as const;

/**
 * Official loading indicator — the genuine SSSSO emblem centred inside a
 * spinning Sai-blue arc. The emblem itself is never rounded, recoloured or
 * animated; only the decorative ring spins, and it halts automatically
 * under prefers-reduced-motion (see globals.css). Server-safe: no hooks.
 */
export default function SaiLoader({ size = "md", caption }: SaiLoaderProps) {
  const s = SIZES[size];
  return (
    <div
      role="status"
      aria-label={caption || "Loading"}
      className="flex flex-col items-center justify-center gap-3"
    >
      <span className={`relative flex items-center justify-center ${s.box}`}>
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#38bdf8] dark:border-slate-700 dark:border-t-[#38bdf8]"
        />
        <Image
          src={asset("/assets/img/sssso-emblem-192.png")}
          alt=""
          aria-hidden="true"
          width={s.emblem}
          height={s.emblem}
          className="object-contain"
        />
      </span>
      {caption ? (
        <span className="text-sm text-muted dark:text-gray-400">{caption}</span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}
