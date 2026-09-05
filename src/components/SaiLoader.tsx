type SaiLoaderProps = {
  size?: "sm" | "md" | "lg";
  caption?: string;
};

const SIZES = {
  sm: { ring: "h-8 w-8", om: "text-base" },
  md: { ring: "h-12 w-12", om: "text-xl" },
  lg: { ring: "h-16 w-16", om: "text-2xl" },
} as const;

/**
 * Official loading indicator — Sarva Dharma ring in Sai blue around the
 * sacred Om. Ring rotation halts automatically under
 * prefers-reduced-motion (see globals.css). Server-safe: no hooks.
 */
export default function SaiLoader({ size = "md", caption }: SaiLoaderProps) {
  const s = SIZES[size];
  return (
    <div
      role="status"
      aria-label={caption || "Loading"}
      className="flex flex-col items-center justify-center gap-3"
    >
      <span className="relative flex items-center justify-center">
        <span
          aria-hidden="true"
          className={`${s.ring} animate-spin rounded-full border-[3px] border-slate-200 border-t-[#149ddd] dark:border-slate-700 dark:border-t-[#38bdf8]`}
        />
        <span
          aria-hidden="true"
          className={`absolute font-semibold text-[#149ddd] dark:text-[#38bdf8] ${s.om}`}
        >
          &#x0950;
        </span>
      </span>
      {caption ? (
        <span className="text-sm text-muted dark:text-gray-400">{caption}</span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}
