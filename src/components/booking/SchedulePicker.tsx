"use client";
// 예약 3단계: 날짜·시간 (ScreenSchedule). "다음" 에서 서버가 한 번 더 확인하고,
// 제출 단계에서 SLOT_TAKEN 을 받으면 이 화면으로 돌아와 danger Notice 를 보여 준다.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getBookableDays, checkSlotAvailable, getDaySlots } from "@/lib/api/slots";
import { MOCK_RACE_TIME, SHOW_MOCK_HINTS } from "@/lib/mock/config";
import { DateStrip, Notice, TimeSlotGrid } from "@/components/ui";
import { clinicDayLabels, doctorFullName } from "@/lib/doctor";
import { formatDate } from "@/lib/date";
import { useAsync } from "@/lib/use-async";
import type { Department, Doctor } from "@/lib/types";
import { useBooking } from "./BookingProvider";
import { guardForSchedule, useBookingGuard } from "./useBookingGuard";
import { StepFrame } from "./StepFrame";
import styles from "./SchedulePicker.module.scss";

export function SchedulePicker({
  departments,
  doctors,
}: {
  departments: Department[];
  doctors: Doctor[];
}) {
  const router = useRouter();
  const { draft, update } = useBooking();
  const ready = useBookingGuard(guardForSchedule(draft));
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doctor = doctors.find((d) => d.id === draft.doctorId) ?? null;
  const department = departments.find((d) => d.id === doctor?.departmentId) ?? null;
  const doctorId = doctor?.id ?? "";

  const daysQuery = useAsync(`days:${doctorId}`, () => getBookableDays(doctorId));
  const days = daysQuery.data;
  const firstOpen = days?.find((d) => !d.closed)?.date;
  const selectedDay = days?.find((d) => d.date === draft.date && !d.closed)?.date;
  const date = selectedDay ?? firstOpen;

  const slotsQuery = useAsync(`slots:${doctorId}:${date}`, () =>
    date ? getDaySlots(doctorId, date) : Promise.resolve(null),
  );
  const daySlots = slotsQuery.data;

  // 선택한 시간이 지금도 예약 가능할 때만 선택 상태로 본다.
  const selectedSlot =
    draft.slot && draft.date === date
      ? (daySlots?.slots.find((s) => s.id === draft.slot?.id && s.status === "open") ?? null)
      : null;

  if (!ready || !doctor) return null;

  const groups = [
    {
      label: "오전",
      slots: (daySlots?.slots ?? []).filter((s) => s.time < "12:00"),
    },
    {
      label: daySlots?.lunch
        ? `오후 (점심시간 ${daySlots.lunch.start}–${daySlots.lunch.end} 제외)`
        : "오후",
      slots: (daySlots?.slots ?? []).filter((s) => s.time >= "12:00"),
    },
  ]
    .filter((g) => g.slots.length > 0)
    .map((g) => ({ label: g.label, slots: g.slots.map((s) => ({ time: s.time, status: s.status })) }));

  const rangeLabel =
    days && days.length ? `${formatDate(days[0].date)} – ${formatDate(days[days.length - 1].date)}` : "";

  function pickDate(next: string) {
    setError(null);
    update({ date: next, slot: null, slotTaken: null });
  }

  function pickTime(time: string) {
    const slot = daySlots?.slots.find((s) => s.time === time);
    if (!slot || !date) return;
    setError(null);
    update({ date, slot: { id: slot.id, time: slot.time, startAt: slot.startAt }, slotTaken: null });
  }

  async function next() {
    if (!selectedSlot || checking) return;
    setChecking(true);
    setError(null);
    const result = await checkSlotAvailable(selectedSlot.id);
    setChecking(false);
    if (!result.ok) {
      setError(result.error.message);
      update({ slot: null });
      slotsQuery.reload();
      return;
    }
    router.push("/book/intake");
  }

  const whenLabel = selectedSlot && date ? `${formatDate(date)} ${selectedSlot.time}` : null;
  const taken = draft.slotTaken;

  return (
    <StepFrame
      step={2}
      title="진료 일시를 선택해 주세요"
      description={`${doctorFullName(doctor)}는 ${clinicDayLabels(doctor).join(" · ")}요일에 진료합니다. 마감된 시간은 선택할 수 없습니다.`}
      layout="aside"
      summary={[
        { label: "진료과", value: department?.name },
        { label: "의사", value: doctorFullName(doctor) },
        { label: "일시", value: whenLabel, placeholder: "시간을 선택해 주세요" },
      ]}
      primary={{
        label: "다음: 문진 작성",
        disabled: !selectedSlot,
        loading: checking,
        loadingText: "예약 가능 여부 확인 중…",
        onClick: next,
      }}
      back={{ label: "이전: 의사 다시 선택", href: "/book" }}
      asideExtra={
        <p className={styles.fine}>
          문진을 마치고 예약하기를 누르면 예약이 확정됩니다. 선택한 내용은 이전 단계로 돌아가도 유지됩니다.
        </p>
      }
    >
      <section className={styles.panel} aria-labelledby="date-heading">
        <h2 id="date-heading">
          날짜 <span>{rangeLabel}</span>
        </h2>
        {days ? (
          <DateStrip days={days} value={date} onChange={pickDate} />
        ) : (
          <p className={styles.muted} role="status">
            진료 날짜를 불러오는 중입니다.
          </p>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="time-heading">
        <h2 id="time-heading">
          시간{" "}
          <span>
            {date ? formatDate(date) : ""}
            {daySlots ? ` · ${daySlots.slotMinutes}분 간격` : ""}
          </span>
        </h2>
        {taken ? (
          <Notice
            tone="danger"
            title={`방금 다른 분이 ${formatDate(taken.date)} ${taken.time} 시간을 예약했습니다`}
          >
            같은 시간에 두 분이 동시에 예약해 먼저 완료된 예약이 확정되었습니다. 다른 시간을 선택해 주세요.
          </Notice>
        ) : null}
        {error ? (
          <Notice tone="danger" title="이 시간은 선택할 수 없습니다">
            {error}
          </Notice>
        ) : null}
        {slotsQuery.loading || !days ? (
          <p className={styles.muted} role="status">
            시간을 불러오는 중입니다.
          </p>
        ) : groups.length ? (
          <TimeSlotGrid groups={groups} value={selectedSlot?.time} onChange={pickTime} />
        ) : (
          <p className={styles.muted}>이 날은 예약할 수 있는 시간이 없습니다. 다른 날짜를 선택해 주세요.</p>
        )}
        {SHOW_MOCK_HINTS ? (
          <p className={styles.fine}>
            화면 개발용 안내: {MOCK_RACE_TIME} 을 선택하고 예약하면 제출 시 이미 예약된 시간으로 응답합니다.
          </p>
        ) : null}
      </section>
    </StepFrame>
  );
}
