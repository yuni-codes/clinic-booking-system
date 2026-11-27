"use client";
// 화면 개발용 클라이언트 세션 저장소(sessionStorage). 탭을 닫으면 사라진다.
// 백엔드 연동 시 쿠키 세션으로 바뀌므로 이 파일은 서버에서 읽은 세션을 내려 주는 Context 로 교체한다.
import { useSyncExternalStore } from "react";
import type { Session } from "./types";

const KEY = "carebook.mock.session";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: Session | null = null;

function read(): Session | null {
  const raw = window.sessionStorage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedValue = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      cachedValue = null;
    }
  }
  return cachedValue;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setSession(session: Session | null): void {
  if (session) window.sessionStorage.setItem(KEY, JSON.stringify(session));
  else window.sessionStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

export function getSession(): Session | null {
  return read();
}

/** 서버 렌더에서는 undefined(아직 모름), 클라이언트에서는 Session 또는 null */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}
