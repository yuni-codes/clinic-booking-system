// 화면과 API 계층이 공유하는 타입. 이름은 docs/data-model.md 엔티티를 따른다.
// src/server/db/schema.ts 는 tsconfig 에서 제외되어 있어 import 하지 않고 값만 맞춰 둔다.
import type { DateKey } from "./date";

// --- 예약 상태: DB 값 <-> 디자인 상태 (data-model.md 4절) ---
export type ReservationStatusDb =
  | "booked"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";
export type ReservationStatus = "confirmed" | "pending" | "done" | "cancelled" | "noshow";

/** 변환은 이 한 곳에서만 한다. 디자인 이름을 저장하지 않는다. */
export const DESIGN_STATUS_BY_DB: Record<ReservationStatusDb, ReservationStatus> = {
  booked: "confirmed",
  checked_in: "pending",
  completed: "done",
  cancelled: "cancelled",
  no_show: "noshow",
};

export const ACTIVE_RESERVATION_STATUSES: readonly ReservationStatusDb[] = [
  "booked",
  "checked_in",
];

// --- 엔티티 ---
export interface Hospital {
  id: string;
  name: string;
  timezone: string;
  phone: string;
  address: string;
}

export interface Department {
  id: string;
  name: string;
  /** 한 줄 설명 (DepartmentTile note) */
  description: string;
  sortOrder: number;
  isActive: boolean;
}

/** weekday: 1=월 … 7=일. 시각은 병원 현지 HH:mm */
export interface DoctorWeeklyHour {
  weekday: number;
  isOpen: boolean;
  startTime?: string;
  endTime?: string;
  lunchStart?: string;
  lunchEnd?: string;
}

export interface Doctor {
  id: string;
  departmentId: string;
  name: string;
  /** 교수 / 원장 / 전문의 */
  title: string;
  specialty: string;
  photoUrl: string | null;
  /** 10 | 15 | 20 | 30 */
  slotMinutes: number;
  weeklyHours: DoctorWeeklyHour[];
  isActive: boolean;
}

export interface Patient {
  id: string;
  name: string;
  /** 숫자만. 실제 DB 는 phone_hash/phone_enc 로만 저장한다(mock 은 평문). */
  phone: string;
}

export interface Reservation {
  id: string;
  reservationNo: string;
  patientId: string;
  slotId: string;
  doctorId: string;
  startAt: string;
  status: ReservationStatusDb;
  visitType: "first" | "return" | null;
  createdVia: "guest" | "member" | "admin";
  cancelledAt: string | null;
  cancelledByRole: "patient" | "guest" | "admin" | "system" | null;
  version: number;
}

// --- 사전 문진 (ScreenIntake) ---
export interface IntakeForm {
  visit: "초진" | "재진" | "";
  purpose: string;
  symptoms: string[];
  since: string;
  detail: string;
  meds: "있음" | "없음" | "";
  medsName: string;
  allergy: string;
  travel: string;
}

export const EMPTY_INTAKE: IntakeForm = {
  visit: "",
  purpose: "",
  symptoms: [],
  since: "",
  detail: "",
  meds: "",
  medsName: "",
  allergy: "",
  travel: "",
};

// --- 화면용 뷰 모델 ---
export type SlotState = "open" | "taken" | "closed";

export interface SlotView {
  id: string;
  /** HH:mm */
  time: string;
  startAt: string;
  status: SlotState;
}

export interface BookableDay {
  date: DateKey;
  /** 진료 요일이 아니거나 휴진 */
  closed: boolean;
  /** closed 일 때 표기: 진료 요일이 아니거나 휴진이면 "휴진", 오늘 진료 시간이 지났으면 "마감" */
  closedLabel?: "휴진" | "마감";
}

export interface DaySlots {
  date: DateKey;
  closed: boolean;
  slotMinutes: number;
  lunch: { start: string; end: string } | null;
  slots: SlotView[];
}

export interface ReservationView {
  id: string;
  reservationNo: string;
  date: DateKey;
  /** HH:mm */
  time: string;
  startAt: string;
  statusDb: ReservationStatusDb;
  status: ReservationStatus;
  departmentId: string;
  departmentName: string;
  doctorId: string;
  /** "김서연 교수" */
  doctorName: string;
  intakeDone: boolean;
  /** 지금 취소할 수 있는가 (활성 상태 + 취소 마감 전) */
  cancelable: boolean;
  cancelDeadlineAt: string;
  cancelledAt: string | null;
}

// --- 세션 (mock: sessionStorage. 실제는 쿠키 세션 — session 테이블 참고) ---
export interface Session {
  kind: "guest" | "member";
  /** 숫자만 */
  phone: string;
  name?: string;
  loginId?: string;
}

// --- API 결과 ---
export type ApiErrorCode =
  | "SLOT_TAKEN"
  | "SLOT_UNAVAILABLE"
  | "DUPLICATE_SAME_DAY"
  | "CONSENT_REQUIRED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CANCEL_DEADLINE_PASSED"
  | "NOT_CANCELABLE"
  | "INVALID_CODE"
  | "CODE_EXPIRED"
  | "TOO_MANY_ATTEMPTS"
  | "INVALID_CREDENTIALS"
  | "VALIDATION";

export interface ApiError {
  code: ApiErrorCode;
  /** 사용자에게 보여 줄 문구 (원인 + 다음 행동) */
  message: string;
  details?: Record<string, string>;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export function fail<T = never>(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, string>,
): ApiResult<T> {
  return { ok: false, error: { code, message, details } };
}

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}
