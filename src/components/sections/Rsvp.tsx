"use client";

import { FormEvent, useState } from "react";
import Section from "@/components/ui/Section";

type Status = "idle" | "submitting" | "done" | "error";

export default function Rsvp() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "전송에 실패했습니다.");
      }
      setStatus("done");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "오류가 발생했습니다.");
    }
  }

  if (status === "done") {
    return (
      <Section id="rsvp" label="RSVP" title="참석 의사 전달">
        <div className="rounded-lg border border-line bg-card px-6 py-10 text-center">
          <p className="font-title text-lg text-foreground">감사합니다 🤍</p>
          <p className="mt-2 text-sm text-muted">
            참석 의사가 전달되었습니다.
          </p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-5 text-sm text-accent underline"
          >
            다시 작성하기
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section id="rsvp" label="RSVP" title="참석 의사 전달">
      <p className="mb-6 text-center text-sm text-muted">
        원활한 진행을 위해 참석 여부를 알려주시면 감사하겠습니다.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex gap-2">
          <Radio name="side" value="신랑측" label="신랑측" defaultChecked />
          <Radio name="side" value="신부측" label="신부측" />
        </div>

        <div className="flex gap-2">
          <Radio name="attendance" value="참석" label="참석" defaultChecked />
          <Radio name="attendance" value="불참" label="불참" />
        </div>

        <Field label="성함" name="name" required placeholder="이름" />
        <Field
          label="동반 인원(본인 포함)"
          name="guest_count"
          type="number"
          placeholder="1"
          defaultValue="1"
        />

        <div className="flex gap-2">
          <Radio name="meal" value="식사함" label="식사 함" defaultChecked />
          <Radio name="meal" value="식사안함" label="식사 안함" />
          <Radio name="meal" value="미정" label="미정" />
        </div>

        <Field
          label="연락처(선택)"
          name="phone"
          type="tel"
          placeholder="010-0000-0000"
        />

        <div>
          <label className="mb-1 block text-xs text-muted">
            전하실 말씀(선택)
          </label>
          <textarea
            name="message"
            rows={2}
            className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        {status === "error" && (
          <p className="text-center text-sm text-rose-500">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-md bg-accent py-3 font-title text-white transition disabled:opacity-60"
        >
          {status === "submitting" ? "전송 중..." : "참석 의사 전달하기"}
        </button>
      </form>
    </Section>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        min={type === "number" ? 1 : undefined}
        className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}

function Radio({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex-1">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="block cursor-pointer rounded-md border border-line bg-card py-2.5 text-center text-sm text-foreground transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white">
        {label}
      </span>
    </label>
  );
}
