type SectionTitleProps = {
  title: string;
  description?: string;
  dark?: boolean;
};

export default function SectionTitle({ title, description, dark = false }: SectionTitleProps) {
  return (
    <div className="mb-12 text-center">
      <h2
        className={`font-display text-[26px] font-bold uppercase tracking-wide sm:text-[32px] ${
          dark ? "text-white" : "text-gradient"
        }`}
      >
        {title}
      </h2>
      <div className="mx-auto mt-3 flex items-center justify-center gap-2">
        <span className="h-[2px] w-10 rounded-full bg-gradient-to-r from-transparent to-[#149ddd] sm:w-14" />
        <span className="divider-dot h-2 w-2 rounded-full bg-[#149ddd]" />
        <span className="h-[2px] w-10 rounded-full bg-gradient-to-l from-transparent to-[#149ddd] sm:w-14" />
      </div>
      {description && (
        <p
          className={`mx-auto mt-4 max-w-3xl text-[15px] leading-relaxed ${
            dark ? "text-[#a8a9b4]" : "text-muted"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
