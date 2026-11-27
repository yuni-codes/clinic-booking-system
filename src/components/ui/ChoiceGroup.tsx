"use client";
// 사전 문진의 단일·복수 선택 질문. 큰 터치 영역의 라디오/체크 칩. 예/아니오는 options={['예','아니오']},
// 복수 선택에는 "해당 없음"을 마지막에 둔다.
import { useId } from "react";
import { VisuallyHidden } from "@mantine/core";
import { cx } from "@/lib/cx";
import styles from "./ChoiceGroup.module.scss";

type Option = string | { value: string; label: string };

interface BaseProps {
  /** 질문 (환자 눈높이의 말로) */
  legend: string;
  options: Option[];
  required?: boolean;
  error?: string;
  name?: string;
  /** 오류 스크롤·포커스 대상 id */
  id?: string;
}

export type ChoiceGroupProps =
  | (BaseProps & { type?: "single"; value: string; onChange: (value: string) => void })
  | (BaseProps & { type: "multiple"; value: string[]; onChange: (value: string[]) => void });

export function ChoiceGroup(props: ChoiceGroupProps) {
  const autoName = useId();
  const name = props.name ?? autoName;
  const errorId = `${name}-error`;
  const multi = props.type === "multiple";

  function toggle(v: string) {
    if (props.type === "multiple") {
      props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    } else {
      props.onChange(v);
    }
  }

  return (
    <fieldset
      id={props.id}
      tabIndex={props.id ? -1 : undefined}
      className={styles.fieldset}
      aria-describedby={props.error ? errorId : undefined}
      aria-invalid={props.error ? true : undefined}
    >
      <legend className={styles.legend}>
        {props.legend}
        {props.required ? <span className={styles.req}>필수</span> : null}
      </legend>
      <div className={styles.choices}>
        {props.options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          const checked = props.type === "multiple" ? props.value.includes(v) : props.value === v;
          return (
            <label key={v} className={cx(styles.choice, multi && styles.multi, checked && styles.checked)}>
              <VisuallyHidden component="span">
                <input
                  type={multi ? "checkbox" : "radio"}
                  name={name}
                  value={v}
                  checked={checked}
                  onChange={() => toggle(v)}
                />
              </VisuallyHidden>
              <span className={styles.chip}>{l}</span>
            </label>
          );
        })}
      </div>
      {props.error ? (
        <p className={styles.error} id={errorId}>
          {props.error}
        </p>
      ) : null}
    </fieldset>
  );
}
