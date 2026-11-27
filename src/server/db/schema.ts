/**
 * Drizzle ORM 스키마 초안 (PostgreSQL).
 *
 * 상태: 초안. drizzle-orm 이 아직 설치되지 않아 타입체크/빌드가 되지 않는다(사용자 승인 전).
 *       그래서 frontend/tsconfig.json 의 exclude 에 이 폴더가 들어 있다. 패키지 설치 후 exclude 를 제거할 것.
 *
 * 실제 DDL 의 기준은 frontend/drizzle/0000_init_schema.sql, 0001_integrity_guards.sql 이다.
 * 이 파일은 타입 안전한 쿼리를 위한 거울이며, 아래는 Drizzle 로 표현하지 않고 SQL 에만 있다.
 *   - slot_no_overlap (EXCLUDE USING gist), 모든 트리거/함수(append-only, 이력 필수, 문진 동의 필수)
 *   - 복합 FK 의 일부 세부 옵션과 identity/CHECK 의 일부는 Drizzle 이 지원하는 범위에서만 표기
 * `drizzle-kit generate` 를 쓰면 이 파일과 SQL 이 어긋날 수 있으므로 스키마 변경은
 * "SQL 마이그레이션 + schema.ts 동시 수정"을 원칙으로 한다(docs/data-model.md 9절).
 *
 * server-only: 클라이언트 번들 유입 방지는 `server-only` 패키지 도입 후 db/index.ts 에서 처리.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  date,
  foreignKey,
  index,
  inet,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => tstz("created_at").notNull().defaultNow();

/* ---------------------------------------------------------------- 값 집합 */

export const USER_ROLES = ["patient", "doctor", "admin"] as const;
export const USER_STATUSES = ["active", "locked", "disabled", "withdrawn"] as const;

/**
 * 예약 상태. 디자인 시스템 ReservationStatus 와의 대응:
 *   booked -> confirmed(예약확정), checked_in -> pending(접수대기), completed -> done(진료완료),
 *   cancelled -> cancelled(예약취소), no_show -> noshow(노쇼)
 */
export const RESERVATION_STATUSES = ["booked", "checked_in", "completed", "cancelled", "no_show"] as const;
export type ReservationStatusDb = (typeof RESERVATION_STATUSES)[number];
export const ACTIVE_RESERVATION_STATUSES = ["booked", "checked_in"] as const satisfies readonly ReservationStatusDb[];

export const DESIGN_STATUS_BY_DB = {
  booked: "confirmed",
  checked_in: "pending",
  completed: "done",
  cancelled: "cancelled",
  no_show: "noshow",
} as const satisfies Record<ReservationStatusDb, string>;

export const EVENT_TYPES = ["created", "rescheduled", "checked_in", "cancelled", "completed", "no_show", "corrected"] as const;
export const ACTOR_ROLES = ["patient", "guest", "doctor", "admin", "system"] as const;
export const CONSENT_TYPES = ["terms", "privacy", "notification", "sensitive_info"] as const;
export const VERIFICATION_PURPOSES = ["guest_booking", "guest_lookup", "signup", "login", "password_reset"] as const;
export const VERIFICATION_STATUSES = ["pending", "verified", "superseded", "failed"] as const;
export const SLOT_MINUTES = [10, 15, 20, 30] as const;

const ACTIVE_PREDICATE = sql`status IN ('booked','checked_in')`;

/* --------------------------------------------------------------- hospital */

export const hospital = pgTable("hospital", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("Asia/Seoul"),
  phone: text("phone"),
  address: text("address"),
  createdAt: createdAt(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

/* ----------------------------------------------------------- user_account */

export const userAccount = pgTable(
  "user_account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: text("role", { enum: USER_ROLES }).notNull(),
    loginId: text("login_id").notNull(),
    passwordHash: text("password_hash"),
    status: text("status", { enum: USER_STATUSES }).notNull().default("active"),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: tstz("locked_until"),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    lastLoginAt: tstz("last_login_at"),
    createdAt: createdAt(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ux_user_account_login_id").on(sql`lower(${t.loginId})`),
    check("user_account_role_chk", sql`${t.role} IN ('patient','doctor','admin')`),
    check("user_account_status_chk", sql`${t.status} IN ('active','locked','disabled','withdrawn')`),
    check("user_account_failed_chk", sql`${t.failedLoginCount} >= 0`),
    check("user_account_login_id_chk", sql`length(${t.loginId}) BETWEEN 4 AND 50`),
  ],
);

/* ---------------------------------------------------------------- session */

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(), // 토큰 SHA-256 해시
    userId: uuid("user_id").references(() => userAccount.id, { onDelete: "cascade" }),
    guestPhoneHash: text("guest_phone_hash"), // 비회원: 휴대폰 인증을 통과한 번호의 HMAC
    expiresAt: tstz("expires_at").notNull(),
    createdAt: createdAt(),
    lastSeenAt: tstz("last_seen_at").notNull().defaultNow(),
    ip: inet("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [
    index("ix_session_user").on(t.userId).where(sql`${t.userId} IS NOT NULL`),
    index("ix_session_expires").on(t.expiresAt),
    check("session_owner_chk", sql`(${t.userId} IS NOT NULL) <> (${t.guestPhoneHash} IS NOT NULL)`),
    check("session_expiry_chk", sql`${t.expiresAt} > ${t.createdAt}`),
  ],
);

/* ------------------------------------------------------------------ staff */

export const staff = pgTable(
  "staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().unique().references(() => userAccount.id),
    name: text("name").notNull(),
    staffRole: text("staff_role", { enum: ["admin"] as const }).notNull().default("admin"),
    createdAt: createdAt(),
  },
  (t) => [check("staff_role_chk", sql`${t.staffRole} IN ('admin')`)],
);

/* ---------------------------------------------------------------- patient */

/**
 * 개인정보 컬럼: name(평문, 목록은 마스킹), phone_enc(AES-256-GCM), phone_hash(HMAC), phone_last4, birth_date.
 * 상세는 docs/data-model.md 7절 "개인정보 컬럼표".
 */
export const patient = pgTable(
  "patient",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").unique().references(() => userAccount.id), // NULL = 비회원
    name: text("name").notNull(),
    phoneEnc: text("phone_enc"),
    phoneHash: text("phone_hash"),
    phoneLast4: char("phone_last4", { length: 4 }),
    birthDate: date("birth_date", { mode: "string" }),
    noShowCount: integer("no_show_count").notNull().default(0),
    bookingRestrictedUntil: tstz("booking_restricted_until"),
    createdAt: createdAt(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
    anonymizedAt: tstz("anonymized_at"),
  },
  (t) => [
    uniqueIndex("ux_patient_identity")
      .on(t.phoneHash, t.name, sql`(COALESCE(${t.birthDate}, 'infinity'::date))`)
      .where(sql`${t.phoneHash} IS NOT NULL`),
    index("ix_patient_phone_hash").on(t.phoneHash).where(sql`${t.phoneHash} IS NOT NULL`),
    index("ix_patient_last4").on(t.phoneLast4),
    index("ix_patient_name").on(t.name.asc().op("text_pattern_ops")),
    check("patient_no_show_chk", sql`${t.noShowCount} >= 0`),
    check("patient_last4_chk", sql`${t.phoneLast4} IS NULL OR ${t.phoneLast4} ~ '^[0-9]{4}$'`),
    check(
      "patient_phone_present_chk",
      sql`${t.anonymizedAt} IS NOT NULL OR (${t.phoneEnc} IS NOT NULL AND ${t.phoneHash} IS NOT NULL AND ${t.phoneLast4} IS NOT NULL)`,
    ),
  ],
);

/* ---------------------------------------------------------------- consent */

export const consent = pgTable(
  "consent",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patient.id),
    type: text("type", { enum: CONSENT_TYPES }).notNull(),
    version: text("version").notNull(),
    agreed: boolean("agreed").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("consent_id_patient_uq").on(t.id, t.patientId),
    index("ix_consent_patient_type").on(t.patientId, t.type, t.createdAt.desc()),
    check("consent_type_chk", sql`${t.type} IN ('terms','privacy','notification','sensitive_info')`),
  ],
);

/* ---------------------------------------------------- phone_verification */

export const phoneVerification = pgTable(
  "phone_verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneHash: text("phone_hash").notNull(),
    purpose: text("purpose", { enum: VERIFICATION_PURPOSES }).notNull(),
    codeHash: text("code_hash").notNull(), // HMAC(비밀키, phone_hash:id:code). 코드 원문 저장 금지
    status: text("status", { enum: VERIFICATION_STATUSES }).notNull().default("pending"),
    attemptCount: smallint("attempt_count").notNull().default(0),
    requestIpHash: text("request_ip_hash"),
    createdAt: createdAt(),
    expiresAt: tstz("expires_at").notNull(), // created_at + setting(otp_ttl_seconds, 기본 180)
    verifiedAt: tstz("verified_at"),
  },
  (t) => [
    uniqueIndex("ux_phone_verification_pending").on(t.phoneHash, t.purpose).where(sql`${t.status} = 'pending'`),
    index("ix_phone_verification_rate").on(t.phoneHash, t.createdAt.desc()),
    index("ix_phone_verification_expires").on(t.expiresAt),
    check(
      "phone_verification_purpose_chk",
      sql`${t.purpose} IN ('guest_booking','guest_lookup','signup','login','password_reset')`,
    ),
    check("phone_verification_status_chk", sql`${t.status} IN ('pending','verified','superseded','failed')`),
    check("phone_verification_attempt_chk", sql`${t.attemptCount} >= 0`),
    check("phone_verification_expiry_chk", sql`${t.expiresAt} > ${t.createdAt}`),
    check("phone_verification_verified_chk", sql`(${t.status} = 'verified') = (${t.verifiedAt} IS NOT NULL)`),
  ],
);

/* ------------------------------------------------------------- department */

export const department = pgTable(
  "department",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hospitalId: uuid("hospital_id").notNull().references(() => hospital.id),
    name: text("name").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [unique("department_name_uq").on(t.hospitalId, t.name)],
);

/* ----------------------------------------------------------------- doctor */

export const doctor = pgTable(
  "doctor",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").unique().references(() => userAccount.id),
    departmentId: uuid("department_id").notNull().references(() => department.id),
    name: text("name").notNull(),
    title: text("title"),
    specialty: text("specialty"),
    bio: text("bio"),
    photoUrl: text("photo_url"),
    /** 예약 간격(분). HoursEditorProps.interval 과 대응 */
    slotMinutes: smallint("slot_minutes").notNull().default(15),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("ix_doctor_department").on(t.departmentId).where(sql`${t.isActive}`),
    check("doctor_slot_minutes_chk", sql`${t.slotMinutes} IN (10, 15, 20, 30)`),
  ],
);

/* ------------------------------------------------------ doctor_weekly_hour */

/** ClinicDay { day, open, start, end, lunchStart, lunchEnd } 와 1:1. weekday: ISO 1=월..7=일 */
export const doctorWeeklyHour = pgTable(
  "doctor_weekly_hour",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id").notNull().references(() => doctor.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    isOpen: boolean("is_open").notNull().default(false),
    startTime: time("start_time"),
    endTime: time("end_time"),
    lunchStart: time("lunch_start"),
    lunchEnd: time("lunch_end"),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique("doctor_weekly_hour_uq").on(t.doctorId, t.weekday),
    check("doctor_weekly_hour_weekday_chk", sql`${t.weekday} BETWEEN 1 AND 7`),
    check(
      "doctor_weekly_hour_open_chk",
      sql`NOT ${t.isOpen} OR (${t.startTime} IS NOT NULL AND ${t.endTime} IS NOT NULL AND ${t.endTime} > ${t.startTime})`,
    ),
    check(
      "doctor_weekly_hour_lunch_chk",
      sql`(${t.lunchStart} IS NULL AND ${t.lunchEnd} IS NULL) OR (${t.isOpen} AND ${t.lunchStart} IS NOT NULL AND ${t.lunchEnd} IS NOT NULL AND ${t.lunchEnd} > ${t.lunchStart} AND ${t.lunchStart} >= ${t.startTime} AND ${t.lunchEnd} <= ${t.endTime})`,
    ),
  ],
);

/* ------------------------------------------------------------------- slot */

export const slot = pgTable(
  "slot",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    doctorId: uuid("doctor_id").notNull().references(() => doctor.id),
    startAt: tstz("start_at").notNull(),
    endAt: tstz("end_at").notNull(),
    status: text("status", { enum: ["open", "blocked"] as const }).notNull().default("open"),
    blockedReason: text("blocked_reason"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("slot_doctor_start_uq").on(t.doctorId, t.startAt),
    unique("slot_id_doctor_start_uq").on(t.id, t.doctorId, t.startAt),
    check("slot_time_chk", sql`${t.endAt} > ${t.startAt}`),
    check("slot_status_chk", sql`${t.status} IN ('open','blocked')`),
    check("slot_blocked_reason_chk", sql`${t.status} = 'blocked' OR ${t.blockedReason} IS NULL`),
    // slot_no_overlap (EXCLUDE USING gist) 는 0001_integrity_guards.sql 에만 있음
  ],
);

/* ---------------------------------------------------------------- closure */

export const closure = pgTable(
  "closure",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hospitalId: uuid("hospital_id").notNull().references(() => hospital.id),
    doctorId: uuid("doctor_id").references(() => doctor.id), // NULL = 병원 전체
    startAt: tstz("start_at").notNull(),
    endAt: tstz("end_at").notNull(),
    type: text("type", { enum: ["vacation", "conference", "holiday", "other"] as const }).notNull().default("other"),
    reason: text("reason"),
    handling: text("handling", { enum: ["cancel_all", "manual"] as const }).notNull().default("manual"),
    createdBy: uuid("created_by").references(() => userAccount.id),
    createdAt: createdAt(),
    deletedAt: tstz("deleted_at"),
  },
  (t) => [
    index("ix_closure_doctor_range")
      .on(t.doctorId, t.startAt, t.endAt)
      .where(sql`${t.deletedAt} IS NULL AND ${t.doctorId} IS NOT NULL`),
    index("ix_closure_hospital_range")
      .on(t.hospitalId, t.startAt, t.endAt)
      .where(sql`${t.deletedAt} IS NULL AND ${t.doctorId} IS NULL`),
    check("closure_time_chk", sql`${t.endAt} > ${t.startAt}`),
    check("closure_type_chk", sql`${t.type} IN ('vacation','conference','holiday','other')`),
    check("closure_handling_chk", sql`${t.handling} IN ('cancel_all','manual')`),
  ],
);

/* ------------------------------------------------------------ reservation */

export const reservation = pgTable(
  "reservation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationNo: text("reservation_no").notNull().unique(),
    patientId: uuid("patient_id").notNull().references(() => patient.id),
    slotId: uuid("slot_id").notNull(),
    doctorId: uuid("doctor_id").notNull(),
    startAt: tstz("start_at").notNull(),
    status: text("status", { enum: RESERVATION_STATUSES }).notNull().default("booked"),
    visitType: text("visit_type", { enum: ["first", "return"] as const }),
    createdVia: text("created_via", { enum: ["guest", "member", "admin"] as const }).notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => userAccount.id),
    cancelledAt: tstz("cancelled_at"),
    cancelledByRole: text("cancelled_by_role", { enum: ["patient", "guest", "admin", "system"] as const }),
    cancelReasonCode: text("cancel_reason_code"),
    createdAt: createdAt(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    foreignKey({
      name: "reservation_slot_fk",
      columns: [t.slotId, t.doctorId, t.startAt],
      foreignColumns: [slot.id, slot.doctorId, slot.startAt],
    }),
    unique("reservation_id_patient_uq").on(t.id, t.patientId),
    // [핵심] 중복 예약 방지. 취소된 예약은 인덱스에서 빠지므로 같은 슬롯에 다시 예약 가능.
    uniqueIndex("ux_reservation_active_slot").on(t.slotId).where(ACTIVE_PREDICATE),
    uniqueIndex("ux_reservation_active_patient_time").on(t.patientId, t.startAt).where(ACTIVE_PREDICATE),
    index("ix_reservation_patient").on(t.patientId, t.startAt.desc()),
    index("ix_reservation_doctor").on(t.doctorId, t.startAt),
    index("ix_reservation_start").on(t.startAt),
    index("ix_reservation_noshow_candidate").on(t.startAt).where(sql`${t.status} = 'booked'`),
    check("reservation_status_chk", sql`${t.status} IN ('booked','checked_in','completed','cancelled','no_show')`),
    check("reservation_visit_type_chk", sql`${t.visitType} IS NULL OR ${t.visitType} IN ('first','return')`),
    check("reservation_created_via_chk", sql`${t.createdVia} IN ('guest','member','admin')`),
    check("reservation_created_by_chk", sql`(${t.createdVia} = 'guest') = (${t.createdByUserId} IS NULL)`),
    check(
      "reservation_cancel_chk",
      sql`(${t.status} = 'cancelled') = (${t.cancelledAt} IS NOT NULL) AND (${t.status} <> 'cancelled' OR ${t.cancelledByRole} IS NOT NULL)`,
    ),
    check(
      "reservation_cancelled_by_role_chk",
      sql`${t.cancelledByRole} IS NULL OR ${t.cancelledByRole} IN ('patient','guest','admin','system')`,
    ),
    check("reservation_version_chk", sql`${t.version} >= 1`),
  ],
);

/* ------------------------------------------------------ reservation_event */

/** append-only. UPDATE/DELETE/TRUNCATE 는 0001 의 트리거가 차단한다. created_at 은 DB 기본값(now())만 사용할 것. */
export const reservationEvent = pgTable(
  "reservation_event",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    reservationId: uuid("reservation_id").notNull().references(() => reservation.id),
    eventType: text("event_type", { enum: EVENT_TYPES }).notNull(),
    fromStatus: text("from_status", { enum: RESERVATION_STATUSES }),
    toStatus: text("to_status", { enum: RESERVATION_STATUSES }).notNull(),
    fromSlotId: uuid("from_slot_id"), // FK 없음: 슬롯 정리 후에도 이력 보존
    toSlotId: uuid("to_slot_id").notNull(),
    fromStartAt: tstz("from_start_at"),
    toStartAt: tstz("to_start_at").notNull(),
    actorUserId: uuid("actor_user_id").references(() => userAccount.id),
    actorRole: text("actor_role", { enum: ACTOR_ROLES }).notNull(),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [
    index("ix_reservation_event_reservation").on(t.reservationId, t.createdAt),
    check("reservation_event_type_chk", sql`${t.eventType} IN ('created','rescheduled','checked_in','cancelled','completed','no_show','corrected')`),
    check(
      "reservation_event_status_chk",
      sql`${t.toStatus} IN ('booked','checked_in','completed','cancelled','no_show') AND (${t.fromStatus} IS NULL OR ${t.fromStatus} IN ('booked','checked_in','completed','cancelled','no_show'))`,
    ),
    check("reservation_event_actor_chk", sql`${t.actorRole} IN ('patient','guest','doctor','admin','system')`),
    check(
      "reservation_event_shape_chk",
      sql`(${t.eventType} = 'created' AND ${t.fromStatus} IS NULL AND ${t.toStatus} = 'booked')
        OR (${t.eventType} = 'rescheduled' AND ${t.fromStatus} IN ('booked','checked_in') AND ${t.toStatus} = ${t.fromStatus} AND ${t.fromSlotId} IS NOT NULL AND ${t.fromSlotId} <> ${t.toSlotId})
        OR (${t.eventType} = 'checked_in' AND ${t.fromStatus} = 'booked' AND ${t.toStatus} = 'checked_in')
        OR (${t.eventType} = 'cancelled' AND ${t.fromStatus} IN ('booked','checked_in') AND ${t.toStatus} = 'cancelled')
        OR (${t.eventType} = 'completed' AND ${t.fromStatus} IN ('booked','checked_in') AND ${t.toStatus} = 'completed')
        OR (${t.eventType} = 'no_show' AND ${t.fromStatus} IN ('booked','checked_in') AND ${t.toStatus} = 'no_show')
        OR (${t.eventType} = 'corrected' AND ${t.fromStatus} IS NOT NULL AND ${t.fromStatus} <> ${t.toStatus})`,
    ),
    check(
      "reservation_event_reason_chk",
      sql`(${t.eventType} <> 'corrected' OR ${t.reason} IS NOT NULL) AND (NOT (${t.eventType} = 'cancelled' AND ${t.actorRole} = 'admin') OR ${t.reason} IS NOT NULL) AND (${t.reason} IS NULL OR length(${t.reason}) <= 500)`,
    ),
  ],
);

/* -------------------------------------------------------- intake_response */

/**
 * 사전 문진(민감정보). payload_enc 에 답변 전체(예/아니오, 복수 선택, 증상 서술)를 암호화해 저장.
 * 행 존재 = 관리자 표의 "작성완료"(ScheduleRow.intake = true).
 */
export const intakeResponse = pgTable(
  "intake_response",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationId: uuid("reservation_id").notNull().unique(),
    patientId: uuid("patient_id").notNull(),
    consentId: uuid("consent_id").notNull(),
    formVersion: text("form_version").notNull(),
    payloadEnc: text("payload_enc"),
    submittedAt: tstz("submitted_at").notNull().defaultNow(),
    purgeAfter: tstz("purge_after").notNull(),
    purgedAt: tstz("purged_at"),
  },
  (t) => [
    foreignKey({
      name: "intake_reservation_fk",
      columns: [t.reservationId, t.patientId],
      foreignColumns: [reservation.id, reservation.patientId],
    }),
    foreignKey({
      name: "intake_consent_fk",
      columns: [t.consentId, t.patientId],
      foreignColumns: [consent.id, consent.patientId],
    }),
    index("ix_intake_purge").on(t.purgeAfter).where(sql`${t.purgedAt} IS NULL`),
    check("intake_payload_chk", sql`(${t.payloadEnc} IS NOT NULL) <> (${t.purgedAt} IS NOT NULL)`),
    // sensitive_info 동의 필수는 트리거 trg_intake_require_consent (0001)
  ],
);

/* ----------------------------------------------------------- notification */

export const notification = pgTable(
  "notification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patient.id),
    reservationId: uuid("reservation_id").references(() => reservation.id),
    channel: text("channel", { enum: ["sms", "kakao_alimtalk", "email", "web_push", "console"] as const }).notNull(),
    templateCode: text("template_code").notNull(),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`), // 전화번호/증상 등 민감 값 금지
    status: text("status", { enum: ["pending", "sent", "failed", "cancelled"] as const }).notNull().default("pending"),
    scheduledAt: tstz("scheduled_at").notNull(),
    sentAt: tstz("sent_at"),
    attemptCount: smallint("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    dedupeKey: text("dedupe_key").notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [
    index("ix_notification_due").on(t.scheduledAt).where(sql`${t.status} = 'pending'`),
    index("ix_notification_reservation").on(t.reservationId),
    check("notification_channel_chk", sql`${t.channel} IN ('sms','kakao_alimtalk','email','web_push','console')`),
    check("notification_status_chk", sql`${t.status} IN ('pending','sent','failed','cancelled')`),
    check("notification_attempt_chk", sql`${t.attemptCount} >= 0`),
  ],
);

/* -------------------------------------------------------------- audit_log */

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    actorUserId: uuid("actor_user_id").references(() => userAccount.id),
    actorKind: text("actor_kind", { enum: ["user", "guest", "system"] as const }).notNull(),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    ip: inet("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [
    index("ix_audit_log_actor").on(t.actorUserId, t.createdAt.desc()),
    index("ix_audit_log_target").on(t.targetType, t.targetId, t.createdAt.desc()),
    index("ix_audit_log_created").on(t.createdAt),
    check("audit_log_actor_kind_chk", sql`${t.actorKind} IN ('user','guest','system')`),
  ],
);

/* ---------------------------------------------------------------- setting */

export const setting = pgTable(
  "setting",
  {
    hospitalId: uuid("hospital_id").notNull().references(() => hospital.id),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
    updatedBy: uuid("updated_by").references(() => userAccount.id),
  },
  (t) => [primaryKey({ columns: [t.hospitalId, t.key] })],
);
