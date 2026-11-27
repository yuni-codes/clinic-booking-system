// 예약 상태 배지. 색은 단어의 뜻을 따르고, 항상 글자(상태명)와 함께 쓴다. 브랜드 노랑은 쓰지 않는다.
import { Badge as MantineBadge } from "@mantine/core";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { ReservationStatus } from "@/lib/types";
import styles from "./Badge.module.scss";

export type BadgeStatus = ReservationStatus | "live" | "neutral";

const LABELS: Record<BadgeStatus, string> = {
  confirmed: "예약확정",
  pending: "접수대기",
  done: "진료완료",
  cancelled: "예약취소",
  noshow: "노쇼",
  live: "진료 중",
  neutral: "",
};

export interface BadgeProps {
  /** live: 네온 민트로 채운 칩('진료 중', '오늘 진료') — 화면당 한두 개까지 */
  status?: BadgeStatus;
  children?: ReactNode;
}

export function Badge({ status = "neutral", children }: BadgeProps) {
  return (
    <MantineBadge
      className={cx(styles.root, styles[status])}
      radius="xl"
      variant="light"
      leftSection={<span className={styles.dot} aria-hidden="true" />}
    >
      {children ?? LABELS[status]}
    </MantineBadge>
  );
}
