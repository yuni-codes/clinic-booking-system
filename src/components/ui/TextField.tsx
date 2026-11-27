"use client";
// 라벨이 위에 붙는 한 줄(또는 여러 줄) 입력. Mantine Input 위에 케어북 규칙을 얹었다.
// error 가 있으면 hint 대신 표시되고 테두리가 danger 로 바뀐다. 플레이스홀더를 라벨 대신 쓰지 않는다.
import { Input } from "@mantine/core";
import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./TextField.module.scss";

interface FieldShellProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** 입력 옆 버튼 (예: 인증번호 받기) */
  action?: ReactNode;
  children: ReactNode;
}

/** TextField / PhoneField 가 같이 쓰는 라벨·안내·오류 껍데기 */
export function FieldShell({ id, label, hint, error, required, action, children }: FieldShellProps) {
  return (
    <Input.Wrapper
      id={id}
      className={styles.field}
      classNames={{ label: styles.label, description: styles.hint, error: styles.error }}
      inputWrapperOrder={["label", "input", "error", "description"]}
      label={
        label ? (
          <>
            {label}
            {required ? <span className={styles.req}>필수</span> : null}
          </>
        ) : undefined
      }
      withAsterisk={false}
      error={error}
      description={error ? undefined : hint}
    >
      {action ? (
        <div className={styles.inline}>
          {children}
          {action}
        </div>
      ) : (
        children
      )}
    </Input.Wrapper>
  );
}

export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-description`;
  return undefined;
}

export interface TextFieldProps
  extends Omit<ComponentPropsWithoutRef<"input">, "required" | "size" | "prefix"> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  action?: ReactNode;
}

export function TextField({
  id: givenId,
  label,
  hint,
  error,
  required,
  multiline,
  action,
  className,
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const common = {
    id,
    error: !!error,
    "aria-invalid": error ? true : undefined,
    "aria-required": required ? true : undefined,
    "aria-describedby": describedBy(id, error, hint),
    className: cx(styles.input, className),
  };
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} action={action}>
      {multiline ? (
        <Input
          component="textarea"
          rows={4}
          {...common}
          {...(rest as ComponentPropsWithoutRef<"textarea">)}
        />
      ) : (
        <Input {...common} {...rest} />
      )}
    </FieldShell>
  );
}
