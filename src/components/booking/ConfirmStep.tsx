"use client";
// 예약 5단계: 확인 후 예약 (R-04). 휴대폰 인증을 마친 사람(회원 또는 비회원)만 제출할 수 있다.
// 서버가 SLOT_TAKEN 으로 거절하면 일시 단계로 돌아가 danger Notice 를 보여 준다 (예약 흐름 규칙 2).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice, TextField } from "@/components/ui";
import { createReservation } from "@/lib/api/reservations";
import { formatDate } from "@/lib/date";
import { doctorFullName } from "@/lib/doctor";
import { formatPhone } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { ApiError, Department, Doctor } from "@/lib/types";
import { useBooking } from "./BookingProvider";
import { guardForConfirm, useBookingGuard } from "./useBookingGuard";
import { StepFrame } from "./StepFrame";
import styles from "./ConfirmStep.module.scss";

const LOGIN_URL = "/login?next=/book/confirm";

export function ConfirmStep({
  departments,
  doctors,
}: {
  departments: Department[];
  doctors: Doctor[];
}) {
  const router = useRouter();
  const { draft, update } = useBooking();
  const session = useSession();
  const ready = useBookingGuard(guardForConfirm(draft));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [nameError, setNameError] = useState<string | undefined>();

  const doctor = doctors.find((d) => d.id === draft.doctorId) ?? null;
  const department = departments.find((d) => d.id === doctor?.departmentId) ?? null;

  if (!ready || !doctor || !draft.slot || !draft.date || session === undefined) return null;

  const slot = draft.slot;
  const date = draft.date;
  const name = draft.patientName || session?.name || "";
  const whenLabel = `${formatDate(date)} ${slot.time}`;

  async function submit() {
    if (submitting) return;
    if (!session) {
      router.push(LOGIN_URL);
      return;
    }
    if (!name.trim()) {
      setNameError("예약하시는 분의 이름을 입력해 주세요.");
      document.getElementById("patient-name")?.focus();
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await createReservation(session, {
      slotId: slot.id,
      patientName: name,
      visitType: draft.intake.visit === "초진" ? "first" : "return",
      intake: draft.intake,
      consents: { sensitiveInfo: draft.consentSensitive },
    });
    if (result.ok) {
      // 선택값 초기화는 완료 화면이 한다 (여기서 지우면 가드가 /book 으로 되돌린다).
      router.replace(`/book/complete/${result.data.reservationNo}`);
      return;
    }
    setSubmitting(false);
    if (result.error.code === "SLOT_TAKEN") {
      // 그 슬롯을 마감 처리하고(서버 상태가 마감) 일시 단계에 머문다.
      update({ slot: null, slotTaken: { date, time: slot.time } });
      router.push("/book/schedule");
      return;
    }
    setError(result.error);
  }

  return (
    <StepFrame
      step={4}
      title="예약 내용을 확인해 주세요"
      description="아래 내용이 맞으면 예약하기를 눌러 주세요. 예약하면 바로 확정됩니다."
      layout="aside"
      summary={[
        { label: "진료과", value: department?.name },
        { label: "의사", value: doctorFullName(doctor) },
        { label: "일시", value: whenLabel },
      ]}
      primary={
        session
          ? {
              label: "예약하기",
              loading: submitting,
              loadingText: "예약 중…",
              onClick: submit,
            }
          : { label: "휴대폰 인증하고 계속", onClick: submit }
      }
      back={{ label: "이전: 문진 수정", href: "/book/intake" }}
    >
      {error?.code === "DUPLICATE_SAME_DAY" ? (
        <Notice tone="warning" title="같은 날 같은 진료과 예약이 있습니다">
          {error.message}{" "}
          <Link className={styles.link} href="/me/reservations">
            내 예약 보기
          </Link>
        </Notice>
      ) : error ? (
        <Notice tone="danger" title="예약하지 못했습니다">
          {error.message}
        </Notice>
      ) : null}

      <section className={styles.card} aria-labelledby="confirm-heading">
        <h2 id="confirm-heading">예약 내용</h2>
        <dl className={styles.list}>
          <div>
            <dt>진료과</dt>
            <dd>{department?.name}</dd>
          </div>
          <div>
            <dt>의사</dt>
            <dd>{doctorFullName(doctor)}</dd>
          </div>
          <div>
            <dt>진료 일시</dt>
            <dd className="tabular-nums">{whenLabel}</dd>
          </div>
          <div>
            <dt>방문 구분</dt>
            <dd>{draft.intake.visit}</dd>
          </div>
          <div>
            <dt>사전 문진</dt>
            <dd>작성 완료 (증상 {draft.intake.symptoms.join(", ")})</dd>
          </div>
        </dl>
      </section>

      <section className={styles.card} aria-labelledby="who-heading">
        <h2 id="who-heading">예약하시는 분</h2>
        {session ? (
          <>
            <TextField
              id="patient-name"
              label="이름"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setNameError(undefined);
                update({ patientName: e.target.value });
              }}
              error={nameError}
            />
            <dl className={styles.list}>
              <div>
                <dt>휴대폰</dt>
                <dd className="tabular-nums">{formatPhone(session.phone)} (인증 완료)</dd>
              </div>
            </dl>
          </>
        ) : (
          <Notice tone="info" title="휴대폰 인증이 필요합니다">
            회원가입 없이 휴대폰 번호 인증만으로 예약할 수 있습니다. 인증을 마치면 이 화면으로 돌아오며,
            선택한 내용은 그대로 유지됩니다.
          </Notice>
        )}
      </section>

      <Notice tone="warning" title="취소는 진료 전날 18:00까지">
        예약 시간 15분 전까지 1층 원무과에 도착해 주세요. 취소 마감 이후에는 전화로 연락해 주세요.
      </Notice>
    </StepFrame>
  );
}
