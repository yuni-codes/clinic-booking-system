-- 0000_init_schema.sql
-- 병원 예약 시스템 초기 스키마 (PostgreSQL 13+ (gen_random_uuid 내장)).
-- 초안: 아직 어떤 DB에도 적용하지 않았고 SQL 문법 검증도 못 했다(로컬에 PostgreSQL 없음). 되돌리기: drizzle/down/0000_init_schema.down.sql
-- 무결성 가드(exclusion constraint, 트리거)는 0001_integrity_guards.sql 에 분리했다.
-- 시각은 모두 timestamptz(UTC 저장). 문자열 enum 은 PG enum 대신 text + CHECK (값 추가 시 ALTER TYPE 대신 CHECK 교체).

-- ---------------------------------------------------------------- hospital
CREATE TABLE hospital (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  timezone    text NOT NULL DEFAULT 'Asia/Seoul',
  phone       text,
  address     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------ user_account
-- 회원(아이디 로그인)·의사·관리자 계정. 비회원은 계정이 없다(patient.user_id IS NULL).
CREATE TABLE user_account (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role                  text NOT NULL,
  login_id              text NOT NULL,
  password_hash         text,                 -- argon2id. 평문 저장 금지
  status                text NOT NULL DEFAULT 'active',
  failed_login_count    integer NOT NULL DEFAULT 0,
  locked_until          timestamptz,
  must_change_password  boolean NOT NULL DEFAULT false,
  last_login_at         timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_account_role_chk   CHECK (role IN ('patient','doctor','admin')),
  CONSTRAINT user_account_status_chk CHECK (status IN ('active','locked','disabled','withdrawn')),
  CONSTRAINT user_account_failed_chk CHECK (failed_login_count >= 0),
  CONSTRAINT user_account_login_id_chk CHECK (length(login_id) BETWEEN 4 AND 50)
);
-- 아이디는 대소문자 구분 없이 유일
CREATE UNIQUE INDEX ux_user_account_login_id ON user_account (lower(login_id));

-- ----------------------------------------------------------------- session
-- 서버 세션. 회원 세션(user_id)과 비회원 세션(guest_phone_hash: 휴대폰 인증 통과 증거) 둘 다 표현.
-- id 는 토큰 원문이 아니라 SHA-256 해시. 인증 라이브러리 선택(Q31)에 따라 대체될 수 있음.
CREATE TABLE session (
  id               text PRIMARY KEY,
  user_id          uuid REFERENCES user_account (id) ON DELETE CASCADE,
  guest_phone_hash text,
  expires_at       timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  ip               inet,
  user_agent       text,
  CONSTRAINT session_owner_chk CHECK ((user_id IS NOT NULL) <> (guest_phone_hash IS NOT NULL)),
  CONSTRAINT session_expiry_chk CHECK (expires_at > created_at)
);
CREATE INDEX ix_session_user ON session (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX ix_session_expires ON session (expires_at);

-- ------------------------------------------------------------------- staff
CREATE TABLE staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES user_account (id),
  name        text NOT NULL,
  staff_role  text NOT NULL DEFAULT 'admin',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_role_chk CHECK (staff_role IN ('admin'))
);

-- ----------------------------------------------------------------- patient
-- 환자 = "예약하는 사람". 회원이면 user_id 연결, 비회원(휴대폰 인증만)이면 user_id NULL.
-- 휴대폰: phone_enc(AES-256-GCM, 복호화 가능, 알림 발송용) + phone_hash(HMAC-SHA256, 검색/조인용) + phone_last4.
-- 가족이 번호를 공유할 수 있으므로 phone_hash 단독 유니크는 두지 않는다(Q12 제안 기본값).
-- 같은 (번호, 이름, 생년월일) 환자가 비회원 예약마다 새로 생기지 않도록 3개 조합을 유일하게 한다.
CREATE TABLE patient (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid UNIQUE REFERENCES user_account (id),
  name           text NOT NULL,
  phone_enc      text,
  phone_hash     text,
  phone_last4    char(4),
  birth_date     date,
  no_show_count  integer NOT NULL DEFAULT 0,
  booking_restricted_until timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  anonymized_at  timestamptz,
  CONSTRAINT patient_no_show_chk CHECK (no_show_count >= 0),
  CONSTRAINT patient_last4_chk CHECK (phone_last4 IS NULL OR phone_last4 ~ '^[0-9]{4}$'),
  -- 탈퇴/파기(anonymized_at)된 환자만 연락처가 비어 있을 수 있다.
  CONSTRAINT patient_phone_present_chk CHECK (
    anonymized_at IS NOT NULL
    OR (phone_enc IS NOT NULL AND phone_hash IS NOT NULL AND phone_last4 IS NOT NULL)
  )
);
-- birth_date 가 NULL(미수집)이어도 중복을 막기 위해 sentinel 로 치환(PG15 NULLS NOT DISTINCT 불필요, Drizzle 로 표현 가능).
CREATE UNIQUE INDEX ux_patient_identity ON patient (phone_hash, name, (COALESCE(birth_date, 'infinity'::date)))
  WHERE phone_hash IS NOT NULL;
CREATE INDEX ix_patient_phone_hash ON patient (phone_hash) WHERE phone_hash IS NOT NULL;  -- 비회원 조회: 인증된 번호 -> 환자들
CREATE INDEX ix_patient_last4 ON patient (phone_last4);   -- 관리자 검색(이름 + 뒤 4자리)
CREATE INDEX ix_patient_name ON patient (name text_pattern_ops);

-- ----------------------------------------------------------------- consent
-- 동의 기록. append-only(0001 에서 UPDATE/DELETE 차단). 철회는 agreed=false 새 행.
CREATE TABLE consent (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patient (id),
  type        text NOT NULL,
  version     text NOT NULL,
  agreed      boolean NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consent_type_chk CHECK (type IN ('terms','privacy','notification','sensitive_info')),
  CONSTRAINT consent_id_patient_uq UNIQUE (id, patient_id)
);
CREATE INDEX ix_consent_patient_type ON consent (patient_id, type, created_at DESC);

-- -------------------------------------------------------- phone_verification
-- 휴대폰 인증번호(6자리, 만료 3분). 번호 원문/코드 원문은 저장하지 않는다.
-- code_hash = HMAC(서버 비밀키, phone_hash || ':' || id || ':' || code). 6자리는 무차별 대입이 쉬우므로 attempt_count 로 제한.
-- 만료 시간(180초)·최대 시도·재전송 간격은 setting 에서 읽고, expires_at 은 발급 시점에 계산해 넣는다.
CREATE TABLE phone_verification (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash      text NOT NULL,
  purpose         text NOT NULL,
  code_hash       text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  attempt_count   smallint NOT NULL DEFAULT 0,
  request_ip_hash text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  verified_at     timestamptz,
  CONSTRAINT phone_verification_purpose_chk CHECK (purpose IN ('guest_booking','guest_lookup','signup','login','password_reset')),
  CONSTRAINT phone_verification_status_chk CHECK (status IN ('pending','verified','superseded','failed')),
  CONSTRAINT phone_verification_attempt_chk CHECK (attempt_count >= 0),
  CONSTRAINT phone_verification_expiry_chk CHECK (expires_at > created_at),
  CONSTRAINT phone_verification_verified_chk CHECK ((status = 'verified') = (verified_at IS NOT NULL))
);
-- 같은 번호·목적에 미사용(pending) 코드는 동시에 1개. 재발송 시 앱이 이전 것을 superseded 로 바꾼 뒤 INSERT.
CREATE UNIQUE INDEX ux_phone_verification_pending ON phone_verification (phone_hash, purpose) WHERE status = 'pending';
CREATE INDEX ix_phone_verification_rate ON phone_verification (phone_hash, created_at DESC);  -- 재전송/일일 한도
CREATE INDEX ix_phone_verification_expires ON phone_verification (expires_at);                -- 파기 배치

-- -------------------------------------------------------------- department
CREATE TABLE department (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id    uuid NOT NULL REFERENCES hospital (id),
  name           text NOT NULL,
  description    text,
  display_order  integer NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT department_name_uq UNIQUE (hospital_id, name)
);

-- ------------------------------------------------------------------ doctor
-- slot_minutes: 관리자가 진료시간 설정에서 의사별로 고르는 예약 간격(Q4). HoursEditorProps.interval 과 대응.
CREATE TABLE doctor (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid UNIQUE REFERENCES user_account (id),
  department_id  uuid NOT NULL REFERENCES department (id),
  name           text NOT NULL,
  title          text,
  specialty      text,
  bio            text,
  photo_url      text,
  slot_minutes   smallint NOT NULL DEFAULT 15,
  is_active      boolean NOT NULL DEFAULT true,
  display_order  integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_slot_minutes_chk CHECK (slot_minutes IN (10, 15, 20, 30))
);
CREATE INDEX ix_doctor_department ON doctor (department_id) WHERE is_active;

-- -------------------------------------------------------- doctor_weekly_hour
-- 의사별 요일 진료시간. 요일당 1행(최대 7행). ClinicDay {day, open, start, end, lunchStart, lunchEnd} 과 1:1.
-- weekday: ISO 1=월 ... 7=일. 시각은 병원 현지시각(time), 슬롯 발행 시 Asia/Seoul 로 해석해 timestamptz 로 변환.
CREATE TABLE doctor_weekly_hour (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    uuid NOT NULL REFERENCES doctor (id) ON DELETE CASCADE,
  weekday      smallint NOT NULL,
  is_open      boolean NOT NULL DEFAULT false,
  start_time   time,
  end_time     time,
  lunch_start  time,
  lunch_end    time,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_weekly_hour_uq UNIQUE (doctor_id, weekday),
  CONSTRAINT doctor_weekly_hour_weekday_chk CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT doctor_weekly_hour_open_chk CHECK (
    NOT is_open OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  ),
  CONSTRAINT doctor_weekly_hour_lunch_chk CHECK (
    (lunch_start IS NULL AND lunch_end IS NULL)
    OR (is_open AND lunch_start IS NOT NULL AND lunch_end IS NOT NULL
        AND lunch_end > lunch_start AND lunch_start >= start_time AND lunch_end <= end_time)
  )
);

-- -------------------------------------------------------------------- slot
-- 발행형 슬롯. 정원은 1명 고정(Q5)이므로 capacity 컬럼을 두지 않는다. 정원>1 이 필요해지면 DB-06 참조.
-- slot_minutes 가 바뀌면 앱이 미래의 "예약 없는" 슬롯을 삭제 후 재발행(예약 있는 슬롯은 유지).
CREATE TABLE slot (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       uuid NOT NULL REFERENCES doctor (id),
  start_at        timestamptz NOT NULL,
  end_at          timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'open',
  blocked_reason  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slot_doctor_start_uq UNIQUE (doctor_id, start_at),        -- 발행 재실행 안전 + (doctor_id,start_at) 조회 인덱스 겸용
  CONSTRAINT slot_time_chk CHECK (end_at > start_at),
  CONSTRAINT slot_status_chk CHECK (status IN ('open','blocked')),
  CONSTRAINT slot_blocked_reason_chk CHECK (status = 'blocked' OR blocked_reason IS NULL),
  -- reservation 의 복합 FK 대상 (예약의 doctor_id/start_at 이 슬롯과 항상 일치하도록)
  CONSTRAINT slot_id_doctor_start_uq UNIQUE (id, doctor_id, start_at)
);

-- ----------------------------------------------------------------- closure
CREATE TABLE closure (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES hospital (id),
  doctor_id   uuid REFERENCES doctor (id),            -- NULL = 병원 전체 휴진
  start_at    timestamptz NOT NULL,
  end_at      timestamptz NOT NULL,
  type        text NOT NULL DEFAULT 'other',
  reason      text,
  handling    text NOT NULL DEFAULT 'manual',
  created_by  uuid REFERENCES user_account (id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,                            -- 해제 = soft delete
  CONSTRAINT closure_time_chk CHECK (end_at > start_at),
  CONSTRAINT closure_type_chk CHECK (type IN ('vacation','conference','holiday','other')),
  CONSTRAINT closure_handling_chk CHECK (handling IN ('cancel_all','manual'))
);
CREATE INDEX ix_closure_doctor_range ON closure (doctor_id, start_at, end_at) WHERE deleted_at IS NULL AND doctor_id IS NOT NULL;
CREATE INDEX ix_closure_hospital_range ON closure (hospital_id, start_at, end_at) WHERE deleted_at IS NULL AND doctor_id IS NULL;

-- ------------------------------------------------------------- reservation
-- 상태 값 <-> 디자인 시스템 ReservationStatus / 화면 라벨
--   booked      <-> confirmed  "예약확정"
--   checked_in  <-> pending    "접수대기"  (내원 접수 후 진료 대기. 승인 대기가 아님. 확인 필요 항목 참조)
--   completed   <-> done       "진료완료"
--   cancelled   <-> cancelled  "예약취소"
--   no_show     <-> noshow     "노쇼"
-- "활성" 예약 = booked, checked_in. 활성 예약만 슬롯을 점유하므로 취소된 예약이 있던 슬롯은 다시 예약할 수 있다.
CREATE TABLE reservation (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_no      text NOT NULL UNIQUE,
  patient_id          uuid NOT NULL REFERENCES patient (id),
  slot_id             uuid NOT NULL,
  doctor_id           uuid NOT NULL,
  start_at            timestamptz NOT NULL,
  status              text NOT NULL DEFAULT 'booked',
  visit_type          text,
  created_via         text NOT NULL,
  created_by_user_id  uuid REFERENCES user_account (id),
  cancelled_at        timestamptz,
  cancelled_by_role   text,
  cancel_reason_code  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  version             integer NOT NULL DEFAULT 1,
  -- 비정규화 컬럼(doctor_id, start_at)이 슬롯과 어긋나지 않도록 DB가 강제
  CONSTRAINT reservation_slot_fk FOREIGN KEY (slot_id, doctor_id, start_at)
    REFERENCES slot (id, doctor_id, start_at),
  CONSTRAINT reservation_status_chk CHECK (status IN ('booked','checked_in','completed','cancelled','no_show')),
  CONSTRAINT reservation_visit_type_chk CHECK (visit_type IS NULL OR visit_type IN ('first','return')),
  CONSTRAINT reservation_created_via_chk CHECK (created_via IN ('guest','member','admin')),
  CONSTRAINT reservation_created_by_chk CHECK ((created_via = 'guest') = (created_by_user_id IS NULL)),
  CONSTRAINT reservation_cancel_chk CHECK (
    (status = 'cancelled') = (cancelled_at IS NOT NULL)
    AND (status <> 'cancelled' OR cancelled_by_role IS NOT NULL)
  ),
  CONSTRAINT reservation_cancelled_by_role_chk CHECK (cancelled_by_role IS NULL OR cancelled_by_role IN ('patient','guest','admin','system')),
  CONSTRAINT reservation_version_chk CHECK (version >= 1),
  CONSTRAINT reservation_id_patient_uq UNIQUE (id, patient_id)
);

-- [핵심] 중복 예약 방지: 한 슬롯에 활성 예약은 1건. 취소/노쇼/완료 행은 남아 있어도 같은 슬롯에 새 예약 가능.
CREATE UNIQUE INDEX ux_reservation_active_slot
  ON reservation (slot_id) WHERE status IN ('booked','checked_in');

-- 같은 환자가 같은 시각에 활성 예약 2건(의사가 달라도) 금지
CREATE UNIQUE INDEX ux_reservation_active_patient_time
  ON reservation (patient_id, start_at) WHERE status IN ('booked','checked_in');

CREATE INDEX ix_reservation_patient ON reservation (patient_id, start_at DESC);   -- 환자별 목록
CREATE INDEX ix_reservation_doctor ON reservation (doctor_id, start_at);          -- 의사별 일정
CREATE INDEX ix_reservation_start ON reservation (start_at);                      -- 관리자 "오늘 예약 현황"
CREATE INDEX ix_reservation_noshow_candidate ON reservation (start_at) WHERE status = 'booked';  -- 노쇼 후보

-- ------------------------------------------------------- reservation_event
-- 상태 이력. append-only(0001 에서 UPDATE/DELETE/TRUNCATE 차단). 슬롯이 정리돼도 시각이 남도록 slot FK 는 두지 않는다.
-- to_* 는 이벤트 후 예약의 최종 상태(항상 채움), from_* 는 직전 상태(created 는 NULL).
CREATE TABLE reservation_event (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES reservation (id),
  event_type     text NOT NULL,
  from_status    text,
  to_status      text NOT NULL,
  from_slot_id   uuid,
  to_slot_id     uuid NOT NULL,
  from_start_at  timestamptz,
  to_start_at    timestamptz NOT NULL,
  actor_user_id  uuid REFERENCES user_account (id),
  actor_role     text NOT NULL,
  reason         text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservation_event_type_chk CHECK (event_type IN ('created','rescheduled','checked_in','cancelled','completed','no_show','corrected')),
  CONSTRAINT reservation_event_status_chk CHECK (
    to_status IN ('booked','checked_in','completed','cancelled','no_show')
    AND (from_status IS NULL OR from_status IN ('booked','checked_in','completed','cancelled','no_show'))
  ),
  CONSTRAINT reservation_event_actor_chk CHECK (actor_role IN ('patient','guest','doctor','admin','system')),
  CONSTRAINT reservation_event_shape_chk CHECK (
    (event_type = 'created'     AND from_status IS NULL AND to_status = 'booked')
    OR (event_type = 'rescheduled' AND from_status IN ('booked','checked_in') AND to_status = from_status
        AND from_slot_id IS NOT NULL AND from_slot_id <> to_slot_id)
    OR (event_type = 'checked_in' AND from_status = 'booked'     AND to_status = 'checked_in')
    OR (event_type = 'cancelled'  AND from_status IN ('booked','checked_in') AND to_status = 'cancelled')
    OR (event_type = 'completed'  AND from_status IN ('booked','checked_in') AND to_status = 'completed')
    OR (event_type = 'no_show'    AND from_status IN ('booked','checked_in') AND to_status = 'no_show')
    OR (event_type = 'corrected'  AND from_status IS NOT NULL AND from_status <> to_status)
  ),
  CONSTRAINT reservation_event_reason_chk CHECK (
    (event_type <> 'corrected' OR reason IS NOT NULL)
    AND (NOT (event_type = 'cancelled' AND actor_role = 'admin') OR reason IS NOT NULL)
    AND (reason IS NULL OR length(reason) <= 500)
  )
);
CREATE INDEX ix_reservation_event_reservation ON reservation_event (reservation_id, created_at);

-- ---------------------------------------------------------- intake_response
-- 사전 문진(민감정보: 건강정보). 예약당 최대 1건. 행이 존재 = 관리자 표의 "작성완료".
-- 예/아니오·복수선택 답변, 통증 0-10, 증상 서술을 전부 payload_enc 한 컬럼에 암호화(AES-256-GCM, 건강정보 전용 키,
-- AAD = reservation_id)로 저장한다. 통증 0-10 범위 검증은 암호문이라 DB CHECK 불가 -> 서버 검증(zod).
-- 동의: consent(type='sensitive_info', agreed=true) 행을 반드시 참조(트리거는 0001).
-- 보관 만료 시 payload_enc 를 NULL 로 하고 purged_at 기록(행/메타는 유지).
CREATE TABLE intake_response (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  uuid NOT NULL UNIQUE,
  patient_id      uuid NOT NULL,
  consent_id      uuid NOT NULL,
  form_version    text NOT NULL,
  payload_enc     text,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  purge_after     timestamptz NOT NULL,
  purged_at       timestamptz,
  CONSTRAINT intake_reservation_fk FOREIGN KEY (reservation_id, patient_id) REFERENCES reservation (id, patient_id),
  CONSTRAINT intake_consent_fk FOREIGN KEY (consent_id, patient_id) REFERENCES consent (id, patient_id),
  CONSTRAINT intake_payload_chk CHECK ((payload_enc IS NOT NULL) <> (purged_at IS NOT NULL))
);
CREATE INDEX ix_intake_purge ON intake_response (purge_after) WHERE purged_at IS NULL;

-- ------------------------------------------------------------ notification
-- 아웃박스. payload 에 전화번호/증상 등 민감 값 저장 금지(발송 시점에 patient 에서 복호화).
CREATE TABLE notification (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES patient (id),
  reservation_id  uuid REFERENCES reservation (id),
  channel         text NOT NULL,
  template_code   text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'pending',
  scheduled_at    timestamptz NOT NULL,
  sent_at         timestamptz,
  attempt_count   smallint NOT NULL DEFAULT 0,
  last_error      text,
  dedupe_key      text NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_channel_chk CHECK (channel IN ('sms','kakao_alimtalk','email','web_push','console')),
  CONSTRAINT notification_status_chk CHECK (status IN ('pending','sent','failed','cancelled')),
  CONSTRAINT notification_attempt_chk CHECK (attempt_count >= 0)
);
CREATE INDEX ix_notification_due ON notification (scheduled_at) WHERE status = 'pending';
CREATE INDEX ix_notification_reservation ON notification (reservation_id);

-- --------------------------------------------------------------- audit_log
CREATE TABLE audit_log (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id  uuid REFERENCES user_account (id),
  actor_kind     text NOT NULL,
  action         text NOT NULL,
  target_type    text,
  target_id      text,
  ip             inet,
  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_actor_kind_chk CHECK (actor_kind IN ('user','guest','system'))
);
CREATE INDEX ix_audit_log_actor ON audit_log (actor_user_id, created_at DESC);
CREATE INDEX ix_audit_log_target ON audit_log (target_type, target_id, created_at DESC);
CREATE INDEX ix_audit_log_created ON audit_log (created_at);

-- ----------------------------------------------------------------- setting
-- 운영 정책(설정값). 키 목록과 제안 기본값은 docs/data-model.md 참조. 값이 없으면 앱 기본값 사용.
CREATE TABLE setting (
  hospital_id  uuid NOT NULL REFERENCES hospital (id),
  key          text NOT NULL,
  value        jsonb NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES user_account (id),
  PRIMARY KEY (hospital_id, key)
);
