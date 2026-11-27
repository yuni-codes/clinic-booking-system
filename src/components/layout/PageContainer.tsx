import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./PageContainer.module.scss";

/** 환자 화면 본문 폭. 데스크톱은 content-wide(1200px) 가운데 정렬, 모바일은 좌우 여백 space-4 한 열. */
export function PageContainer({
  children,
  className,
  narrow,
}: {
  children: ReactNode;
  className?: string;
  /** true 면 content-max(640px) 한 열 (로그인·완료 같은 단순 화면) */
  narrow?: boolean;
}) {
  return <div className={cx(styles.container, narrow && styles.narrow, className)}>{children}</div>;
}
