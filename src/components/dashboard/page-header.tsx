/**
 * Standard page heading block used at the top of every dashboard section.
 */
export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="font-heading text-[26px] leading-tight font-semibold tracking-[-0.03em]">
        {title}
      </h1>
      {description && (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
