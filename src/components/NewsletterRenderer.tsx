// Renders a newsletter's blocks as an on-brand, scrolling page. Used by the
// public page (/n/:slug) and any in-app preview.
import type { Newsletter, Block } from "@/lib/newsletters";

const Hero = ({
  heading,
  subheading,
  image,
}: {
  heading?: string;
  subheading?: string | null;
  image?: string | null;
}) => (
  <div className="relative rounded-2xl overflow-hidden mb-6">
    {image ? (
      <div className="aspect-[16/9] bg-muted">
        <img src={image} alt="" className="w-full h-full object-cover" />
      </div>
    ) : (
      <div className="aspect-[16/9] bg-foreground" />
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 p-5">
      <h1 className="font-heading uppercase tracking-wide text-white text-2xl sm:text-3xl leading-tight">
        {heading}
      </h1>
      {subheading && (
        <p className="text-white/80 text-sm mt-1">{subheading}</p>
      )}
    </div>
  </div>
);

function BlockView({ b }: { b: Block }) {
  switch (b.type) {
    case "hero":
      return (
        <Hero heading={b.heading} subheading={b.subheading} image={b.image} />
      );
    case "heading":
      return (
        <h2 className="font-heading uppercase tracking-wide text-xl text-foreground mt-6 mb-2">
          {b.text}
        </h2>
      );
    case "text":
      return (
        <p className="text-[15px] leading-relaxed text-foreground/90 whitespace-pre-line mb-3">
          {b.text}
        </p>
      );
    case "image":
      return (
        <figure className="my-4">
          <div className="rounded-xl overflow-hidden bg-muted">
            {b.image && (
              <img src={b.image} alt={b.caption || ""} className="w-full" />
            )}
          </div>
          {b.caption && (
            <figcaption className="text-xs text-muted-foreground mt-1.5 text-center">
              {b.caption}
            </figcaption>
          )}
        </figure>
      );
    case "callout":
      return (
        <div className="my-4 rounded-xl border-l-4 border-primary bg-primary/10 px-4 py-3">
          <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">
            {b.text}
          </p>
        </div>
      );
    case "button":
      return b.url ? (
        <a
          href={b.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-bold rounded-xl px-5 py-3 my-3 no-underline"
        >
          {b.label || "Learn more"} →
        </a>
      ) : null;
    case "quote":
      return (
        <blockquote className="my-5 pl-4 border-l-2 border-border">
          <p className="text-lg italic text-foreground/90 leading-snug">
            “{b.text}”
          </p>
          {b.author && (
            <cite className="block text-xs text-muted-foreground mt-1.5 not-italic">
              — {b.author}
            </cite>
          )}
        </blockquote>
      );
    case "divider":
      return <hr className="my-6 border-border" />;
    default:
      return null;
  }
}

export function NewsletterRenderer({ issue }: { issue: Newsletter }) {
  return (
    <article className="max-w-2xl mx-auto px-4 pb-10">
      <Hero
        heading={issue.title}
        subheading={issue.subtitle}
        image={issue.cover_image}
      />
      {issue.published_at && (
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          {new Date(issue.published_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}
      {issue.blocks.map((b) => (
        <BlockView key={b.id} b={b} />
      ))}
    </article>
  );
}
