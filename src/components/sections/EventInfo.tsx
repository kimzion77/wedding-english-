"use client";

import { useSiteContent } from "@/components/ContentProvider";
import { formatWeddingDate } from "@/lib/datetime";
import Section from "@/components/ui/Section";
import Countdown from "@/components/ui/Countdown";
import MiniCalendar from "@/components/ui/MiniCalendar";

export default function EventInfo() {
  const site = useSiteContent();
  const d = formatWeddingDate(site.weddingAt);

  return (
    <Section id="event" label="WEDDING DAY" title="당일 안내">
      <div className="text-center">
        <p className="font-title text-2xl text-foreground">{d.full}</p>
        <p className="mt-2 text-foreground">{d.time}</p>
        <p className="mt-1 text-muted">
          {site.venue.name} {site.venue.floor} {site.venue.hall}
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-xs">
        <MiniCalendar iso={site.weddingAt} />
      </div>

      <div className="mt-10">
        <Countdown
          targetIso={site.weddingAt}
          groomName={site.groomName}
          brideName={site.brideName}
        />
      </div>
    </Section>
  );
}
