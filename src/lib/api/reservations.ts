// 예약 생성·조회·취소. actor(Session) 는 나중에 서버가 쿠키 세션에서 읽으므로 인자에서 사라진다.
// 교체 지점: 각 함수를 Server Action 으로 바꾸고 본문을 트랜잭션(slot 잠금 -> reservation INSERT ->
// reservation_event INSERT -> consent/intake_response 저장)으로 바꾼다. SLOT_TAKEN 은
// reservation(slot_id) 부분 유니크 위반을 같은 코드로 변환해 돌려준다.
import { addDays, formatDate, seoulDateKey, seoulTime, seoulWallToIso } from "../date";
import { doctorFullName } from "../doctor";
import { CANCEL_DEADLINE, MOCK_RACE_TIME } from "../mock/config";
import { DEPARTMENTS, DOCTORS, HOSPITAL } from "../mock/data";
import { parseSlotId } from "../mock/schedule";
import { ensureSeeded, newId, nextReservationNo, store } from "../mock/store";
import {
  ACTIVE_RESERVATION_STATUSES,
  DESIGN_STATUS_BY_DB,
  fail,
  ok,
  type ApiResult,
  type IntakeForm,
  type Patient,
  type Reservation,
  type ReservationView,
  type Session,
} from "../types";
import { latency } from "./delay";
import { slotState } from "./slots";

export interface CreateReservationInput {
  slotId: string;
  patientName: string;
  visitType: "first" | "return";
  intake: IntakeForm;
  /** 민감정보(건강 정보) 수집·이용 동의 (consent.type = 'sensitive_info') */
  consents: { sensitiveInfo: boolean };
}

function isActive(r: Reservation): boolean {
  return ACTIVE_RESERVATION_STATUSES.includes(r.status);
}

function cancelDeadlineOf(startAt: string): string {
  const date = seoulDateKey(new Date(startAt));
  return seoulWallToIso(addDays(date, -CANCEL_DEADLINE.daysBefore), CANCEL_DEADLINE.time);
}

function toView(r: Reservation, now: Date): ReservationView {
  const doctor = DOCTORS.find((d) => d.id === r.doctorId)!;
  const department = DEPARTMENTS.find((d) => d.id === doctor.departmentId)!;
  const start = new Date(r.startAt);
  const deadline = cancelDeadlineOf(r.startAt);
  return {
    id: r.id,
    reservationNo: r.reservationNo,
    date: seoulDateKey(start),
    time: seoulTime(start),
    startAt: r.startAt,
    statusDb: r.status,
    status: DESIGN_STATUS_BY_DB[r.status],
    departmentId: department.id,
    departmentName: department.name,
    doctorId: doctor.id,
    doctorName: doctorFullName(doctor),
    intakeDone: store.intakes.has(r.id),
    cancelable: isActive(r) && now.getTime() < new Date(deadline).getTime(),
    cancelDeadlineAt: deadline,
    cancelledAt: r.cancelledAt,
  };
}

function patientsOf(actor: Session): Patient[] {
  return store.patients.filter((p) => p.phone === actor.phone);
}

function reservationsOf(actor: Session): Reservation[] {
  const ids = new Set(patientsOf(actor).map((p) => p.id));
  return store.reservations.filter((r) => ids.has(r.patientId));
}

const LOGIN_REQUIRED = "휴대폰 인증이 필요합니다. 인증 후 다시 시도해 주세요.";

export async function createReservation(
  actor: Session | null,
  input: CreateReservationInput,
): Promise<ApiResult<ReservationView>> {
  await latency(800);
  ensureSeeded();
  if (!actor) return fail("UNAUTHORIZED", LOGIN_REQUIRED);
  const name = input.patientName.trim();
  if (!name) return fail("VALIDATION", "이름을 입력해 주세요.", { field: "patientName" });
  if (!input.consents.sensitiveInfo) {
    return fail("CONSENT_REQUIRED", "건강 정보 수집·이용에 동의해 주세요. 동의 후 예약할 수 있습니다.");
  }

  const parsed = parseSlotId(input.slotId);
  const doctor = parsed && DOCTORS.find((d) => d.id === parsed.doctorId);
  if (!parsed || !doctor) {
    return fail("SLOT_UNAVAILABLE", "선택할 수 없는 시간입니다. 다른 시간을 선택해 주세요.");
  }

  // 같은 환자가 같은 날 같은 진료과에 이미 예약이 있는지 (Q16 제안 기본값)
  const dup = reservationsOf(actor).find(
    (r) =>
      isActive(r) &&
      seoulDateKey(new Date(r.startAt)) === parsed.date &&
      DOCTORS.find((d) => d.id === r.doctorId)?.departmentId === doctor.departmentId,
  );
  if (dup) {
    return fail(
      "DUPLICATE_SAME_DAY",
      `${formatDate(parsed.date)}에 같은 진료과 예약이 이미 있습니다. 기존 예약을 확인해 주세요.`,
      { reservationNo: dup.reservationNo },
    );
  }

  const startAt = seoulWallToIso(parsed.date, parsed.time);
  const now = new Date();
  const state = slotState({ ...parsed, id: input.slotId, startAt }, now);
  if (state === "closed") {
    return fail("SLOT_UNAVAILABLE", "예약할 수 없는 시간입니다. 다른 시간을 선택해 주세요.");
  }
  // 화면 개발용: MOCK_RACE_TIME 은 "제출 순간 다른 분이 먼저 예약한" 상황을 재현한다.
  if (state === "taken" || parsed.time === MOCK_RACE_TIME) {
    store.otherTaken.add(input.slotId);
    return fail(
      "SLOT_TAKEN",
      "같은 시간에 두 분이 동시에 예약해 먼저 완료된 예약이 확정되었습니다. 다른 시간을 선택해 주세요.",
      { slotId: input.slotId, time: parsed.time, date: parsed.date },
    );
  }

  let patient = patientsOf(actor).find((p) => p.name === name);
  if (!patient) {
    patient = { id: newId("patient"), name, phone: actor.phone };
    store.patients.push(patient);
  }
  const reservation: Reservation = {
    id: newId("resv"),
    reservationNo: nextReservationNo(parsed.date),
    patientId: patient.id,
    slotId: input.slotId,
    doctorId: doctor.id,
    startAt,
    status: "booked",
    visitType: input.visitType,
    createdVia: actor.kind === "member" ? "member" : "guest",
    cancelledAt: null,
    cancelledByRole: null,
    version: 1,
  };
  store.reservations.push(reservation);
  store.intakes.set(reservation.id, input.intake);
  return ok(toView(reservation, now));
}

export interface MyReservations {
  upcoming: ReservationView[];
  past: ReservationView[];
}

/** 다가오는 예약(오늘 이후 활성)을 가까운 순, 지난 예약을 최근 순으로 */
export async function listMyReservations(actor: Session | null): Promise<ApiResult<MyReservations>> {
  await latency(300);
  ensureSeeded();
  if (!actor) return fail("UNAUTHORIZED", LOGIN_REQUIRED);
  const now = new Date();
  const today = seoulDateKey(now);
  const views = reservationsOf(actor).map((r) => toView(r, now));
  const upcoming = views
    .filter((v) => (v.statusDb === "booked" || v.statusDb === "checked_in") && v.date >= today)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const past = views
    .filter((v) => !upcoming.includes(v))
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
  return ok({ upcoming, past });
}

export async function getMyReservation(
  actor: Session | null,
  reservationNo: string,
): Promise<ApiResult<ReservationView>> {
  await latency(250);
  ensureSeeded();
  if (!actor) return fail("UNAUTHORIZED", LOGIN_REQUIRED);
  const r = reservationsOf(actor).find((x) => x.reservationNo === reservationNo);
  if (!r) return fail("NOT_FOUND", "예약을 찾을 수 없습니다. 내 예약에서 다시 확인해 주세요.");
  return ok(toView(r, new Date()));
}

export async function cancelReservation(
  actor: Session | null,
  reservationNo: string,
): Promise<ApiResult<ReservationView>> {
  await latency(600);
  ensureSeeded();
  if (!actor) return fail("UNAUTHORIZED", LOGIN_REQUIRED);
  const r = reservationsOf(actor).find((x) => x.reservationNo === reservationNo);
  if (!r) return fail("NOT_FOUND", "예약을 찾을 수 없습니다. 내 예약에서 다시 확인해 주세요.");
  const now = new Date();
  if (!isActive(r)) return fail("NOT_CANCELABLE", "이미 처리된 예약입니다. 내 예약에서 상태를 확인해 주세요.");
  if (now.getTime() >= new Date(cancelDeadlineOf(r.startAt)).getTime()) {
    return fail(
      "CANCEL_DEADLINE_PASSED",
      `취소 마감이 지났습니다. ${HOSPITAL.phone}로 전화해 주세요.`,
    );
  }
  r.status = "cancelled";
  r.cancelledAt = now.toISOString();
  r.cancelledByRole = actor.kind === "member" ? "patient" : "guest";
  r.version += 1;
  return ok(toView(r, now));
}

export interface MyProfile {
  name: string | null;
  phone: string;
}

export async function getMyProfile(actor: Session | null): Promise<ApiResult<MyProfile>> {
  await latency(100);
  ensureSeeded();
  if (!actor) return fail("UNAUTHORIZED", LOGIN_REQUIRED);
  return ok({ name: actor.name ?? patientsOf(actor)[0]?.name ?? null, phone: actor.phone });
}
