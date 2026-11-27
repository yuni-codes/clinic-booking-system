// 환자 화면 공통 레이아웃: 예약 흐름 선택값(BookingProvider)을 로그인·예약·내 예약 화면이 공유한다.
import type { ReactNode } from "react";
import { BookingProvider } from "@/components/booking/BookingProvider";
import { PatientShell } from "@/components/layout/PatientShell";

export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <PatientShell>
      <BookingProvider>{children}</BookingProvider>
    </PatientShell>
  );
}
