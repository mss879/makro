import TextReveal from "@/components/anim/TextReveal";

export default function SectionHeader({
  index,
  eyebrow,
  title,
  align = "left",
  className,
}: {
  index?: string;
  eyebrow: string;
  title: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={`${align === "center" ? "mx-auto text-center" : ""} max-w-4xl ${className ?? ""}`}
    >
      <div
        className={`flex items-center gap-4 ${align === "center" ? "justify-center" : ""}`}
      >
        {index && <span className="font-body text-xs text-rose">{index}</span>}
        <span className="line-hair w-10" />
        <span className="eyebrow text-rose">{eyebrow}</span>
      </div>
      <TextReveal
        as="h2"
        text={title}
        className="mt-6 font-display display-md text-bone"
      />
    </div>
  );
}
