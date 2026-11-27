"use client";
// 예약 단계 화면의 공통 틀: Stepper -> 제목 -> 본문, 선택 요약과 주요 버튼.
// 모바일: 하단 고정 CTA 바(선택 요약 한 줄 + control-lg 전체 폭 버튼).
// 데스크톱: layout="bar" 는 하단 고정 바(ScreenDoctors), layout="aside" 는 오른쪽 360px 요약 카드(ScreenSchedule).
import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button, Stepper } from "@/components/ui";
import { cx } from "@/lib/cx";
import styles from "./StepFrame.module.scss";

export interface SummaryItem {
  label: string;
  value?: string | null;
  /** value 가 없을 때 */
  placeholder?: string;
}

export interface StepAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export interface StepFrameProps {
  /** 0부터 (진료과 0, 의사 1, 일시 2, 문진 3, 확인 4) */
  step: number;
  title: string;
  description?: ReactNode;
  summary: SummaryItem[];
  layout: "bar" | "aside";
  primary: StepAction;
  /** aside 의 "이전" 버튼 */
  back?: { label: string; href: string };
  /** aside 의 요약 아래에 더 보여 줄 것 (작성 현황, 안내) */
  asideExtra?: ReactNode;
  children: ReactNode;
}

function PrimaryButton({ action, block }: { action: StepAction; block?: boolean }) {
  return (
    <Button
      variant="primary"
      size="lg"
      block={block}
      disabled={action.disabled}
      loading={action.loading}
      loadingText={action.loadingText}
      onClick={action.onClick}
    >
      {action.label}
    </Button>
  );
}

export function StepFrame({
  step,
  title,
  description,
  summary,
  layout,
  primary,
  back,
  asideExtra,
  children,
}: StepFrameProps) {
  const oneLine = summary.filter((s) => s.value).map((s) => s.value).join(" · ");
  const firstMissing = summary.find((s) => !s.value);
  return (
    <PageContainer className={cx(styles.page, layout === "aside" && styles.hasAside)}>
      <div className={styles.stepper}>
        <Stepper current={step} />
      </div>
      <div className={styles.intro}>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>

      <div className={layout === "aside" ? styles.cols : undefined}>
        <div className={styles.content}>{children}</div>
        {layout === "aside" ? (
          <aside className={styles.aside} aria-label="예약 내용">
            <h2>예약 내용</h2>
            <dl>
              {summary.map((s) => (
                <div key={s.label} className={styles.row}>
                  <dt>{s.label}</dt>
                  <dd className={s.value ? undefined : styles.none}>{s.value ?? s.placeholder ?? "-"}</dd>
                </div>
              ))}
            </dl>
            <PrimaryButton action={primary} block />
            {back ? (
              <Button href={back.href} block>
                {back.label}
              </Button>
            ) : null}
            {asideExtra}
          </aside>
        ) : null}
      </div>

      <div className={cx(styles.bar, layout === "aside" && styles.barMobileOnly)}>
        <div className={styles.barIn}>
          <p className={styles.oneLine}>
            {oneLine || firstMissing?.placeholder || "선택해 주세요"}
          </p>
          <dl className={styles.pairs}>
            {summary.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd className={s.value ? undefined : styles.none}>{s.value ?? s.placeholder ?? "-"}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.barButton}>
            <PrimaryButton action={primary} block />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
