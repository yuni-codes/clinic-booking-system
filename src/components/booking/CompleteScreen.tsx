"use client";
// 예약 완료 (R-05). 예약번호·일시·안내와 "내 예약 보기".
import { useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button, Notice, ReservationCard } from "@/components/ui";
import { getMyReservation } from "@/lib/api/reservations";
import { useSession } from "@/lib/session";
import { useAsync } from "@/lib/use-async";
import { useBooking } from "./BookingProvider";
import styles from "./CompleteScreen.module.scss";

export function CompleteScreen({
  reservationNo,
  hospitalPhone,
}: {
  reservationNo: string;
  hospitalPhone: string;
}) {
  const session = useSession();
  const { reset } = useBooking();
  const query = useAsync(`complete:${session?.phone ?? "none"}:${reservationNo}`, () =>
    getMyReservation(session ?? null, reservationNo),
  );

  // 예약이 끝났으니 다음 예약을 위해 선택값을 비운다.
  useEffect(() => {
    reset();
  }, [reset]);

  if (session === undefined || query.loading) {
    return (
      <PageContainer narrow>
        <p role="status">예약 내용을 불러오는 중입니다.</p>
      </PageContainer>
    );
  }

  const result = query.data;
  if (!result?.ok) {
    return (
      <PageContainer narrow className={styles.page}>
        <Notice tone="warning" title="예약 내용을 찾을 수 없습니다">
          {result?.error.message ?? "내 예약에서 다시 확인해 주세요."}
        </Notice>
        <div>
          <Button variant="primary" size="lg" href="/me/reservations">
            내 예약 보기
          </Button>
        </div>
      </PageContainer>
    );
  }

  const r = result.data;
  return (
    <PageContainer narrow className={styles.page}>
      <div className={styles.intro}>
        <h1>예약이 확정되었습니다</h1>
        <p>
          예약번호 <b className="tabular-nums">{r.reservationNo}</b>
        </p>
      </div>
      <ReservationCard
        date={r.date}
        time={r.time}
        department={r.departmentName}
        doctor={r.doctorName}
        status={r.status}
        note="사전 문진표 작성 완료"
      />
      <Notice tone="info" title="방문 안내">
        예약 시간 15분 전까지 1층 원무과에 도착해 주세요. 진료 전날 18:00에 문자로 다시 안내해 드립니다.
      </Notice>
      <Notice tone="warning" title="취소는 진료 전날 18:00까지">
        내 예약에서 직접 취소할 수 있습니다. 마감 이후에는 {hospitalPhone}로 전화해 주세요.
      </Notice>
      <div className={styles.actions}>
        <Button variant="primary" size="lg" href="/me/reservations" block>
          내 예약 보기
        </Button>
        <Button size="lg" href="/" block>
          홈으로 가기
        </Button>
      </div>
    </PageContainer>
  );
}
