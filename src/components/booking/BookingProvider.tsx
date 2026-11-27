"use client";
// 예약 흐름의 선택값(진료과·의사·일시·문진·동의)을 단계 사이에서 유지한다.
// (patient) 레이아웃에 두어 로그인 화면을 거쳐 돌아와도 값이 남는다. 새로고침하면 초기화된다.
// 교체 지점: 서버가 임시 점유(hold)를 지원하면 slot hold id 를 여기에 함께 둔다.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { EMPTY_INTAKE, type IntakeForm } from "@/lib/types";

export interface SelectedSlot {
  id: string;
  /** HH:mm */
  time: string;
  startAt: string;
}

export interface SlotTakenNotice {
  date: string;
  time: string;
}

export interface BookingDraft {
  departmentId: string | null;
  doctorId: string | null;
  /** YYYY-MM-DD */
  date: string | null;
  slot: SelectedSlot | null;
  intake: IntakeForm;
  consentSensitive: boolean;
  /** 비회원 예약자 이름 */
  patientName: string;
  /** 제출 시 SLOT_TAKEN 을 받으면 일시 단계에 danger Notice 로 보여 준다 */
  slotTaken: SlotTakenNotice | null;
}

const INITIAL: BookingDraft = {
  departmentId: null,
  doctorId: null,
  date: null,
  slot: null,
  intake: EMPTY_INTAKE,
  consentSensitive: false,
  patientName: "",
  slotTaken: null,
};

interface BookingContextValue {
  draft: BookingDraft;
  update: (patch: Partial<BookingDraft>) => void;
  /** 의사를 바꾸면 날짜·시간은 비운다 (문진·이름은 유지) */
  selectDoctor: (departmentId: string, doctorId: string | null) => void;
  reset: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(INITIAL);

  const update = useCallback((patch: Partial<BookingDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const selectDoctor = useCallback((departmentId: string, doctorId: string | null) => {
    setDraft((prev) => ({
      ...prev,
      departmentId,
      doctorId,
      date: prev.doctorId === doctorId ? prev.date : null,
      slot: prev.doctorId === doctorId ? prev.slot : null,
      slotTaken: null,
    }));
  }, []);

  const reset = useCallback(() => setDraft(INITIAL), []);

  const value = useMemo(
    () => ({ draft, update, selectDoctor, reset }),
    [draft, update, selectDoctor, reset],
  );
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking 은 BookingProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
