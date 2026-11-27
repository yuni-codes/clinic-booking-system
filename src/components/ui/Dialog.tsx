"use client";
// 되돌릴 수 없는 행동 전에 한 번 더 묻는 대화상자. 버튼은 왼쪽 "돌아가기"(secondary),
// 오른쪽 실행(danger 또는 primary), 라벨은 행동을 적는다. alert 를 켜면 alertdialog.
// Mantine Modal 은 role 을 "dialog" 로 고정하므로 Portal + Overlay + FocusTrap 으로 직접 구성했다.
import { FocusTrap, Overlay, Portal } from "@mantine/core";
import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./Dialog.module.scss";

export interface DialogProps {
  open: boolean;
  title: string;
  /** 무엇이 일어나는지 */
  children?: ReactNode;
  /** 버튼 2개 */
  actions?: ReactNode;
  onClose?: () => void;
  alert?: boolean;
}

export function Dialog({ open, title, children, actions, onClose, alert }: DialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocus.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <Portal>
      <div className={styles.root}>
        <Overlay color="var(--ink)" backgroundOpacity={0.5} onClick={onClose} zIndex={0} />
        <FocusTrap active>
          <div
            className={styles.dialog}
            role={alert ? "alertdialog" : "dialog"}
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={children ? bodyId : undefined}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose?.();
            }}
          >
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {children ? (
              <div id={bodyId} className={styles.body}>
                {children}
              </div>
            ) : null}
            {actions ? <div className={styles.actions}>{actions}</div> : null}
          </div>
        </FocusTrap>
      </div>
    </Portal>
  );
}
