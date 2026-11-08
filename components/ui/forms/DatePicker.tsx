"use client";
import { useId, useState, useRef, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { ActionDialog } from "@/components/ui/modal/ActionDialog";
const iso = (date: Date) => date.toISOString().slice(0, 10);
const parse = (value: string) => {
  const date = new Date(`${value}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(+date) &&
    iso(date) === value
    ? date
    : null;
};
export function DatePicker({
  value,
  onChange,
  invalid,
  describedBy,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => parse(value) ?? new Date());
  const [focusDate, setFocusDate] = useState(value);
  const grid = useRef<HTMLDivElement>(null);
  const help = useId();
  const first = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1, 12),
  );
  const count = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0, 12),
  ).getUTCDate();
  useEffect(() => {
    if (open)
      grid.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)
        ?.focus();
  }, [open, month, focusDate]);
  function moveMonth(delta: number) {
    setMonth(
      new Date(
        Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + delta, 1, 12),
      ),
    );
  }
  return (
    <>
      <div className="date-field">
        <input
          className="input"
          type="text"
          name="requiredBy"
          aria-label="Required by"
          aria-invalid={invalid}
          aria-describedby={[help, describedBy].filter(Boolean).join(" ")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="YYYY-MM-DD"
          required
        />
        <button
          type="button"
          className="calendar-trigger"
          aria-label="Choose required date"
          onClick={() => {
            const date = parse(value) ?? new Date();
            setMonth(date);
            setFocusDate(iso(date));
            setOpen(true);
          }}
        >
          <CalendarDays size={18} aria-hidden="true" />
        </button>
      </div>
      <span id={help} className="field-hint">
        YYYY-MM-DD · choose a date or type it.
      </span>
      {open && (
        <ActionDialog title="Required date" onClose={() => setOpen(false)}>
          <div className="calendar-month">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => moveMonth(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <strong aria-live="polite">
              {first.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </strong>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => moveMonth(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="calendar-week" aria-hidden="true">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div
            className="calendar-grid"
            ref={grid}
            role="group"
            aria-label="Choose a day"
          >
            {Array.from({ length: first.getUTCDay() }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const date = new Date(
                Date.UTC(
                  first.getUTCFullYear(),
                  first.getUTCMonth(),
                  i + 1,
                  12,
                ),
              );
              const day = iso(date);
              return (
                <button
                  type="button"
                  key={day}
                  data-date={day}
                  aria-label={date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                  aria-pressed={day === value}
                  aria-current={day === iso(new Date()) ? "date" : undefined}
                  onKeyDown={(event) => {
                    const delta = (
                      {
                        ArrowLeft: -1,
                        ArrowRight: 1,
                        ArrowUp: -7,
                        ArrowDown: 7,
                      } as Record<string, number>
                    )[event.key];
                    if (delta) {
                      event.preventDefault();
                      const next = new Date(+date + delta * 86400000);
                      setMonth(next);
                      setFocusDate(iso(next));
                    }
                  }}
                  onClick={() => {
                    onChange(day);
                    setOpen(false);
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="calendar-actions">
            <button
              type="button"
              className="button button-quiet"
              onClick={() => {
                const today = iso(new Date());
                onChange(today);
                setOpen(false);
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </ActionDialog>
      )}
    </>
  );
}
