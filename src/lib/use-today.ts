"use client";
import { useSyncExternalStore } from "react";
import { seoulDateKey, weekdayOf, type DateKey } from "./date";

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
}

/** 서울 기준 오늘 날짜. 서버 렌더·하이드레이션 중에는 null (시간 의존 표시는 마운트 후에 나타난다). */
export function useSeoulToday(): DateKey | null {
  return useSyncExternalStore(
    subscribe,
    () => seoulDateKey(new Date()),
    () => null,
  );
}

export function useSeoulWeekday(): number | null {
  const today = useSeoulToday();
  return today ? weekdayOf(today) : null;
}
