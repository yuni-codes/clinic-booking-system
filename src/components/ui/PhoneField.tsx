"use client";
// 휴대폰 번호 입력. 숫자만 받아 010-0000-0000 으로 자동 하이픈. 검증은 isValidPhone.
// 국가번호 드롭다운, 하이픈 직접 입력 요구는 하지 않는다.
import { Input } from "@mantine/core";
import { useId, type ReactNode } from "react";
import { formatPhone } from "@/lib/format";
import { describedBy, FieldShell } from "./TextField";
import styles from "./TextField.module.scss";

export interface PhoneFieldProps {
  /** 숫자만, 예: "01012345678" */
  value: string;
  onChange: (digits: string) => void;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  /** `인증번호 받기` 버튼 */
  action?: ReactNode;
}

export function PhoneField({
  value,
  onChange,
  label = "휴대폰 번호",
  hint,
  error,
  required,
  disabled,
  id: givenId,
  action,
}: PhoneFieldProps) {
  const autoId = useId();
  const id = givenId ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} action={action}>
      <Input
        id={id}
        className={`${styles.input} tabular-nums`}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="010-0000-0000"
        value={formatPhone(value)}
        disabled={disabled}
        error={!!error}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
      />
    </FieldShell>
  );
}
