"use client";

import { useState } from "react";
import { type Account } from "@/config/site.config";
import { useSiteContent } from "@/components/ContentProvider";
import Section from "@/components/ui/Section";

function AccountRow({ account }: { account: Account }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(account.number.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard 미지원 환경 무시 */
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-line py-3 last:border-0">
      <div className="text-sm">
        <p className="text-foreground">
          {account.bank} <span className="text-muted">|</span> {account.number}
        </p>
        <p className="mt-0.5 text-xs text-muted">예금주 {account.holder}</p>
      </div>
      <div className="flex items-center gap-2">
        {account.kakaopay && (
          <a
            href={account.kakaopay}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-line px-2 py-1 text-xs text-accent"
          >
            송금
          </a>
        )}
        <button
          onClick={copy}
          className="rounded border border-line px-2.5 py-1 text-xs text-foreground transition hover:bg-line/50"
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
    </div>
  );
}

function Group({
  title,
  accounts,
}: {
  title: string;
  accounts: Account[];
}) {
  const [open, setOpen] = useState(false);
  if (accounts.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-title text-foreground">{title}</span>
        <span className={`text-muted transition ${open ? "rotate-180" : ""}`}>
          ⌄
        </span>
      </button>
      {open && (
        <div className="px-4 pb-2">
          {accounts.map((a, i) => (
            <AccountRow key={i} account={a} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Accounts() {
  const site = useSiteContent();
  const groomSide = [site.groom.account, ...site.parentAccounts.groomSide];
  const brideSide = [site.bride.account, ...site.parentAccounts.brideSide];

  return (
    <Section id="accounts" label="GIFT" title="마음 전하실 곳">
      <p className="mb-6 text-center text-sm text-muted">
        축하의 마음을 전하실 수 있는 곳을 안내드립니다.
      </p>
      <div className="space-y-3">
        <Group title="신랑측" accounts={groomSide} />
        <Group title="신부측" accounts={brideSide} />
      </div>
    </Section>
  );
}
