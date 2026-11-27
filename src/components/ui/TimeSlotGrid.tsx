"use client";
// 선택한 날짜의 예약 가능 시간(오전·오후). 중복 예약 방지의 첫 방어선이며, 최종 판정은 항상 서버다.
// taken(다른 예약이 있음) -> "마감", closed(진료 시간 외·점심·지남) -> "불가". 둘 다 누를 수 없다.
import { UnstyledButton } from "@mantine/core";
import styles from "./TimeSlotGrid.module.scss";

export interface TimeSlot {
  /** HH:mm */
  time: string;
  status: "open" | "taken" | "closed";
}

export interface TimeSlotGridProps {
  groups: { label: string; slots: TimeSlot[] }[];
  value?: string;
  onChange: (time: string) => void;
  legend?: boolean;
}

export function TimeSlotGrid({ groups, value, onChange, legend = true }: TimeSlotGridProps) {
  return (
    <div className={styles.slots}>
      {groups.map((group) => (
        <div key={group.label} role="group" aria-label={group.label}>
          <h4 className={styles.groupLabel}>{group.label}</h4>
          <div className={styles.grid}>
            {group.slots.map((slot) => {
              const off = slot.status !== "open";
              return (
                <UnstyledButton
                  key={slot.time}
                  className={styles.slot}
                  disabled={off}
                  aria-pressed={value === slot.time ? "true" : "false"}
                  aria-label={`${slot.time}${off ? (slot.status === "taken" ? " 마감" : " 예약 불가") : ""}`}
                  onClick={() => onChange(slot.time)}
                >
                  {slot.time}
                  {off ? <small>{slot.status === "taken" ? "마감" : "불가"}</small> : null}
                </UnstyledButton>
              );
            })}
          </div>
        </div>
      ))}
      {legend ? (
        <div className={styles.legend} aria-hidden="true">
          <span>
            <i />
            예약 가능
          </span>
          <span>
            <i className={styles.sel} />
            선택
          </span>
          <span>
            <i className={styles.off} />
            마감
          </span>
        </div>
      ) : null}
    </div>
  );
}
