"use client";
// 두세 개 보기 중 하나를 고르는 전환 컨트롤 (로그인 방식, 다가오는/지난 예약). 보기는 2–3개까지.
import { UnstyledButton } from "@mantine/core";
import styles from "./Segmented.module.scss";

export interface SegmentedProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  /** 접근성 라벨 */
  label?: string;
}

export function Segmented({ options, value, onChange, label }: SegmentedProps) {
  return (
    <div className={styles.seg} role="group" aria-label={label}>
      {options.map((o) => (
        <UnstyledButton
          key={o.value}
          className={styles.button}
          aria-pressed={value === o.value ? "true" : "false"}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </UnstyledButton>
      ))}
    </div>
  );
}
