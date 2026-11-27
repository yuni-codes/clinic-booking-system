"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { BookingDraft } from "./BookingProvider";

/**
 * 앞 단계 선택이 없으면(새로고침·주소 직접 입력) 그 단계로 돌려보낸다.
 * redirectTo 가 null 이면 통과. 렌더 중에는 화면을 그리지 않는다.
 */
export function useBookingGuard(redirectTo: string | null): boolean {
  const router = useRouter();
  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);
  return redirectTo === null;
}

export function guardForSchedule(d: BookingDraft): string | null {
  return d.departmentId && d.doctorId ? null : "/book";
}

export function guardForIntake(d: BookingDraft): string | null {
  return guardForSchedule(d) ?? (d.slot && d.date ? null : "/book/schedule");
}

export function guardForConfirm(d: BookingDraft): string | null {
  return guardForIntake(d) ?? (d.intake.visit && d.consentSensitive ? null : "/book/intake");
}
