"use client";
// 케어북 Button. 규칙: primary 는 화면당 하나(그 단계의 다음 행동), danger 는 취소 확인 Dialog 안에서만,
// 라벨은 동사로 끝낸다("확인" 단독 금지). 서버 요청이 있으면 loading + loadingText 로 중복 제출을 막는다.
import { Button as MantineButton } from "@mantine/core";
import Link from "next/link";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./Button.module.scss";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<ComponentPropsWithoutRef<"button">, "color" | "style"> {
  /** primary: 화면당 하나. danger: 파괴적 확인에만. 기본 secondary. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** 비활성화하고 라벨을 loadingText 로 바꿔 중복 제출을 막는다. */
  loading?: boolean;
  loadingText?: string;
  /** 주면 페이지 이동 링크로 그린다(모양은 같다). */
  href?: string;
  leftSection?: ReactNode;
}

// Mantine Button 은 --button-* 변수로 색을 정한다. 케어북 토큰(CSS 변수)을 그대로 연결한다.
const VARIANT_VARS: Record<ButtonVariant, Record<string, string>> = {
  primary: {
    "--button-bg": "var(--primary)",
    "--button-hover": "var(--primary-hover)",
    "--button-color": "var(--on-primary)",
    "--button-hover-color": "var(--on-primary)",
    "--button-bd": "1px solid var(--primary)",
  },
  secondary: {
    "--button-bg": "var(--surface-raised)",
    "--button-hover": "var(--surface-sunken)",
    "--button-color": "var(--ink)",
    "--button-hover-color": "var(--ink)",
    "--button-bd": "1px solid var(--line-strong)",
  },
  quiet: {
    "--button-bg": "transparent",
    "--button-hover": "var(--primary-soft)",
    "--button-color": "var(--primary-strong)",
    "--button-hover-color": "var(--primary-strong)",
    "--button-bd": "1px solid transparent",
  },
  danger: {
    "--button-bg": "var(--danger)",
    "--button-hover": "var(--danger)",
    "--button-color": "var(--on-danger)",
    "--button-hover-color": "var(--on-danger)",
    "--button-bd": "1px solid var(--danger)",
  },
};

const SIZE_VARS: Record<ButtonSize, Record<string, string>> = {
  sm: { "--button-padding-x": "var(--space-3)", "--button-fz": "14px" },
  md: { "--button-padding-x": "var(--space-5)", "--button-fz": "16px" },
  lg: { "--button-padding-x": "var(--space-5)", "--button-fz": "17px" },
};

export function Button({
  variant = "secondary",
  size = "md",
  block,
  loading,
  loadingText,
  href,
  leftSection,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const style = { ...VARIANT_VARS[variant], ...SIZE_VARS[size] } as CSSProperties;
  const label = (
    <span className={styles.labels}>
      <span className={loading ? styles.hidden : undefined}>{children}</span>
      {loading ? <span className={styles.loadingLabel}>{loadingText ?? "처리 중…"}</span> : null}
    </span>
  );
  const common = {
    size,
    fullWidth: block,
    style,
    leftSection,
    className: cx(styles.root, variant === "danger" && styles.danger, className),
  };
  if (href && !disabled) {
    return (
      <MantineButton component={Link} href={href} {...common}>
        {label}
      </MantineButton>
    );
  }
  return (
    <MantineButton
      {...common}
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading ? true : undefined}
    >
      {label}
    </MantineButton>
  );
}
