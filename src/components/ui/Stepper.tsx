// 예약 흐름 진행 막대. 현재 단계는 막대가 아니라 굵은 글자로 구분한다.
// 모바일(480px 이하)은 막대 + `2 / 5 · 의사` 한 줄로 줄어든다.
import { cx } from "@/lib/cx";
import styles from "./Stepper.module.scss";

export const BOOKING_STEPS = ["진료과", "의사", "일시", "문진", "확인"];

export interface StepperProps {
  steps?: string[];
  /** 0부터 */
  current: number;
}

export function Stepper({ steps = BOOKING_STEPS, current }: StepperProps) {
  return (
    <div className={styles.root}>
      <ol className={styles.steps} aria-label="예약 단계">
        {steps.map((step, i) => (
          <li
            key={step}
            className={cx(i < current && styles.done, i === current && styles.current)}
            aria-current={i === current ? "step" : undefined}
          >
            <span className={styles.label}>{step}</span>
          </li>
        ))}
      </ol>
      <p className={styles.mobile} aria-hidden="true">
        {current + 1} / {steps.length} · {steps[current]}
      </p>
    </div>
  );
}
