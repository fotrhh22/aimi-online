import React from "react";

/** Shared presentation for draft and submitted challenge sentences. */
export function SentenceCard({
  title,
  children,
  className = "",
  heading: Heading = "h2",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  heading?: "h2" | "h4";
}) {
  return (
    <section className={"challenge-sentence-card " + className}>
      <Heading className="challenge-sentence-title">{title}</Heading>
      <p>{children}</p>
    </section>
  );
}
