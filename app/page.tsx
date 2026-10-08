"use client";

import { InfoCards } from "@/components/InfoCards";

export default function Home() {
  return (
    <section aria-labelledby="home-features-heading">
      <h2 id="home-features-heading" className="sr-only">
        What pkglens shows for each package
      </h2>
      <InfoCards />
    </section>
  );
}
