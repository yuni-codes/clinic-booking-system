// 화면 안에 고정되는 안내 상자. danger 는 role="alert" 로 즉시 읽힌다. 문구는 원인 + 다음 행동.
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Notice.module.scss";

export interface NoticeProps {
  tone?: "info" | "warning" | "danger";
  title?: string;
  children?: ReactNode;
  id?: string;
  className?: string;
}

export function Notice({ tone = "info", title, children, id, className }: NoticeProps) {
  return (
    <div
      id={id}
      className={cx(styles.root, styles[tone], className)}
      role={tone === "danger" ? "alert" : "status"}
    >
      {title ? <strong className={styles.title}>{title}</strong> : null}
      {children ? <div>{children}</div> : null}
    </div>
  );
}
