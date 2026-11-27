"use client";
// 진료과 하나를 고르는 타일. 선택은 하나만. 진료과마다 다른 색이나 장식 아이콘은 쓰지 않는다.
import { UnstyledButton } from "@mantine/core";
import styles from "./DepartmentTile.module.scss";

export interface DepartmentTileProps {
  /** 공식 진료과명 */
  name: string;
  /** 한 줄 설명 (예: 감기 · 소화기 · 만성질환) */
  note?: string;
  selected?: boolean;
  onSelect?: () => void;
}

export function DepartmentTile({ name, note, selected, onSelect }: DepartmentTileProps) {
  return (
    <UnstyledButton
      className={styles.tile}
      aria-pressed={selected ? "true" : "false"}
      onClick={onSelect}
    >
      <b className={styles.name}>{name}</b>
      {note ? <span className={styles.note}>{note}</span> : null}
    </UnstyledButton>
  );
}

/** DepartmentTile 을 나열하는 그리드 (데스크톱 2열 패널 안, 모바일은 가로 칩 목록 대신 2열) */
export function DepartmentTiles({ children }: { children: React.ReactNode }) {
  return <div className={styles.tiles}>{children}</div>;
}
