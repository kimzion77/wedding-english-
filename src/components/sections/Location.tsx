"use client";

import { useSiteContent } from "@/components/ContentProvider";
import Section from "@/components/ui/Section";

export default function Location() {
  const site = useSiteContent();
  const { venue, directions } = site;
  const q = encodeURIComponent(venue.mapQuery || venue.name);

  const naverUrl =
    venue.naverMapUrl || `https://map.naver.com/v5/search/${q}`;
  const kakaoUrl =
    venue.kakaoMapUrl || `https://map.kakao.com/?q=${q}`;
  const embedUrl = `https://maps.google.com/maps?q=${venue.lat},${venue.lng}&z=16&output=embed`;

  return (
    <Section id="location" label="LOCATION" title="오시는 길">
      <div className="text-center">
        <p className="font-title text-lg text-foreground">{venue.name}</p>
        <p className="mt-1 text-sm text-muted">
          {venue.floor} {venue.hall}
        </p>
        <p className="mt-2 text-sm text-foreground/80">{venue.address}</p>
        {venue.tel && (
          <a href={`tel:${venue.tel}`} className="mt-1 inline-block text-sm text-accent">
            {venue.tel}
          </a>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-line">
        <iframe
          title="지도"
          src={embedUrl}
          className="h-56 w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={naverUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-line bg-card py-2.5 text-center text-sm text-foreground transition hover:bg-line/40"
        >
          네이버 지도
        </a>
        <a
          href={kakaoUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-line bg-card py-2.5 text-center text-sm text-foreground transition hover:bg-line/40"
        >
          카카오맵
        </a>
      </div>

      <div className="mt-8 space-y-4 text-sm">
        {directions.subway && (
          <InfoRow label="지하철" value={directions.subway} />
        )}
        {directions.bus && <InfoRow label="버스" value={directions.bus} />}
        {directions.parking && (
          <InfoRow label="주차" value={directions.parking} />
        )}
        {directions.shuttle && (
          <InfoRow label="셔틀버스" value={directions.shuttle} />
        )}
      </div>
    </Section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-14 shrink-0 font-title text-accent">{label}</span>
      <span className="text-foreground/85">{value}</span>
    </div>
  );
}
