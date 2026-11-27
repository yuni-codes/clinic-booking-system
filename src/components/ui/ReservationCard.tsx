// 내 예약 한 건(일시·진료과·의사·상태)과 취소 동작. 취소 마감이 지났으면 onCancel 대신 note 에 전화 안내.
// onCancel 은 바로 취소하지 말고 Dialog 를 연다.
import type { ReactNode } from "react";
import { formatDate } from "@/lib/date";
import { cx } from "@/lib/cx";
import type { ReservationStatus } from "@/lib/types";
import { Badge } from "./Badge";
import { Button } from "./Button";
import styles from "./ReservationCard.module.scss";

export interface ReservationCardProps {
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  time: string;
  department?: string;
  doctor?: string;
  status?: ReservationStatus;
  note?: ReactNode;
  onCancel?: () => void;
  actions?: ReactNode;
}

export function ReservationCard({
  date,
  time,
  department,
  doctor,
  status = "confirmed",
  note,
  onCancel,
  actions,
}: ReservationCardProps) {
  const cancelled = status === "cancelled";
  const showFoot = note || onCancel || actions;
  return (
    <article className={cx(styles.card, cancelled && styles.cancelled)}>
      <div className={styles.top}>
        <div>
          <div className={styles.when}>
            {formatDate(date)} {time}
          </div>
          <div className={styles.who}>{[department, doctor].filter(Boolean).join(" · ")}</div>
        </div>
        <Badge status={status} />
      </div>
      {showFoot ? (
        <div className={styles.foot}>
          <span>{note}</span>
          {actions ??
            (onCancel && !cancelled ? (
              <Button size="sm" onClick={onCancel}>
                예약 취소
              </Button>
            ) : null)}
        </div>
      ) : null}
    </article>
  );
}
