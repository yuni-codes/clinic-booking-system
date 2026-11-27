"use client";
// 앞으로 2주의 진료일을 고르는 날짜 선택기. 휴진일은 비활성 + "휴진" 표기.
// 데스크톱은 7열 두 줄, 모바일(480px 이하)은 가로 스크롤.
import { UnstyledButton } from "@mantine/core";
import { dayOfMonth, formatDate, WEEK_LABELS, weekdayOf } from "@/lib/date";
import { cx } from "@/lib/cx";
import styles from "./DateStrip.module.scss";

export interface DateStripProps {
  /** date: YYYY-MM-DD */
  days: { date: string; closed?: boolean; closedLabel?: string }[];
  value?: string;
  onChange: (date: string) => void;
  label?: string;
}

export function DateStrip({ days, value, onChange, label = "진료 날짜" }: DateStripProps) {
  return (
    <div className={styles.dates} role="group" aria-label={label}>
      {days.map((d) => {
        const weekday = weekdayOf(d.date);
        return (
          <UnstyledButton
            key={d.date}
            className={cx(styles.date, weekday === 0 && styles.sun)}
            disabled={!!d.closed}
            aria-pressed={value === d.date ? "true" : "false"}
            aria-label={`${formatDate(d.date)}${d.closed ? ` ${d.closedLabel ?? "휴진"}` : ""}`}
            onClick={() => onChange(d.date)}
          >
            <small>{d.closed ? (d.closedLabel ?? "휴진") : WEEK_LABELS[weekday]}</small>
            <b>{dayOfMonth(d.date)}</b>
          </UnstyledButton>
        );
      })}
    </div>
  );
}
