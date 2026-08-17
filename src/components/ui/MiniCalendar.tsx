"use client";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export default function MiniCalendar({ iso }: { iso: string }) {
  const target = new Date(iso);
  const year = target.getFullYear();
  const month = target.getMonth();
  const targetDay = target.getDate();

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  return (
    <div className="rounded-lg border border-line bg-card px-4 py-5">
      <p className="text-center font-title text-base text-foreground">
        {year}. {String(month + 1).padStart(2, "0")}
      </p>
      <div className="mt-4 grid grid-cols-7 gap-y-2 text-center text-[13px]">
        {WEEK.map((w, i) => (
          <div
            key={w}
            className={`text-[11px] tracking-wide ${
              i === 0 ? "text-rose-400" : "text-muted"
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          const isTarget = day === targetDay;
          const isSunday = i % 7 === 0;
          return (
            <div key={i} className="flex items-center justify-center">
              {day && (
                <span
                  className={
                    isTarget
                      ? "flex h-7 w-7 items-center justify-center rounded-full bg-accent font-title text-white"
                      : isSunday
                      ? "text-rose-400"
                      : "text-foreground/80"
                  }
                >
                  {day}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
