type SectionTitleProps = {
  title: string;
  description?: string;
  dark?: boolean;
  level?: 1 | 2 | 3;
};
export default function SectionTitle({ title, description, dark = false, level = 2 }: SectionTitleProps) {
  const Heading = `h${level}` as const;
  return (
    <div className="mb-9 text-center sm:mb-11 md:mb-14">
      <Heading
        className={`font-display text-xl font-bold uppercase tracking-[0.18em] sm:text-[26px] md:text-[32px] ${
          dark ? "text-white" : "text-gradient"
        }`}
      >
        {title}
      </Heading>
      <div className="mx-auto mt-3 flex items-center justify-center gap-2.5">
        <span className="h-[2px] w-10 rounded-full bg-gradient-to-r from-transparent to-[#38bdf8] sm:w-14" />
        <span className="divider-dot h-2 w-2 rounded-full bg-[#38bdf8]" />
        <span className="h-[2px] w-10 rounded-full bg-gradient-to-l from-transparent to-[#38bdf8] sm:w-14" />
      </div>
      {description && (
        <p
          className={`mx-auto mt-3 max-w-3xl text-sm leading-relaxed sm:mt-4 sm:text-[15px] ${
            dark ? "text-[#a8a9b4]" : "text-[#475569] dark:text-gray-400"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
