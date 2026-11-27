"use client";
// 의사 한 명의 이름·진료과·전문 분야·진료 요일. onSelect 를 주면 선택 가능한 버튼이 된다.
import { UnstyledButton } from "@mantine/core";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./DoctorCard.module.scss";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토"];

export interface DoctorCardProps {
  name: string;
  /** 교수 / 원장 / 전문의 */
  title?: string;
  department?: string;
  specialty?: string;
  /** 진료 요일, 예: ['월','수','금'] */
  days?: string[];
  photo?: string;
  /** "오늘 진료" 같은 짧은 상태 (Badge status="live") */
  badge?: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
}

export function DoctorCard({
  name,
  title,
  department,
  specialty,
  days = [],
  photo,
  badge,
  selected,
  onSelect,
}: DoctorCardProps) {
  const body = (
    <>
      <div className={styles.avatar} aria-hidden="true">
        {photo ? (
          // 의사 사진은 외부 URL 일 수 있어 next/image 대신 일반 img (정사각형 crop)
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" />
        ) : (
          name.slice(0, 1)
        )}
      </div>
      <div className={styles.body}>
        <span className={styles.name}>{title ? `${name} ${title}` : name}</span>
        <span className={styles.meta}>{[department, specialty].filter(Boolean).join(" · ")}</span>
        <div className={styles.days} aria-label={`진료 요일: ${days.join(", ")}`}>
          {WEEKDAYS.map((d) => (
            <span key={d} className={days.includes(d) ? styles.on : undefined}>
              {d}
            </span>
          ))}
        </div>
      </div>
      {badge ? <div>{badge}</div> : null}
    </>
  );
  if (onSelect) {
    return (
      <UnstyledButton
        className={cx(styles.card, styles.selectable)}
        aria-pressed={selected ? "true" : "false"}
        onClick={onSelect}
      >
        {body}
      </UnstyledButton>
    );
  }
  return <div className={styles.card}>{body}</div>;
}
