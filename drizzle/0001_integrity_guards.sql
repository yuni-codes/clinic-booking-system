-- 0001_integrity_guards.sql
-- Drizzle 스키마(schema.ts)로 표현할 수 없는 무결성 가드. 이 파일은 손으로 유지한다.
-- 되돌리기: drizzle/down/0001_integrity_guards.down.sql
-- 초안: 미적용, 문법 미검증.

-- ------------------------------------------------------------------
-- 1) 같은 의사의 슬롯 시간 겹침 방지 (exclusion constraint)
--    btree_gist 확장이 필요하다(CREATE EXTENSION 권한 필요: 관리형 DB 는 허용 목록 확인).
--    UNIQUE(doctor_id, start_at) 은 "같은 시작시각"만 막고, 10분 슬롯과 30분 슬롯이 섞이는 겹침은 이 제약이 막는다.
-- ------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE slot
  ADD CONSTRAINT slot_no_overlap
  EXCLUDE USING gist (doctor_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&);

-- ------------------------------------------------------------------
-- 2) append-only 테이블: UPDATE / DELETE / TRUNCATE 차단
--    reservation_event, consent : 전면 차단
--    audit_log : UPDATE/TRUNCATE 차단, DELETE 는 1년 지난 행만(보관기간 경과분 파기용; 하한선이며 정책값은 Q22 확인 필요)
-- ------------------------------------------------------------------
CREATE FUNCTION forbid_modification() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% on % is not allowed: append-only table', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END
$$;

CREATE TRIGGER trg_reservation_event_no_mutation
  BEFORE UPDATE OR DELETE ON reservation_event
  FOR EACH ROW EXECUTE FUNCTION forbid_modification();
CREATE TRIGGER trg_reservation_event_no_truncate
  BEFORE TRUNCATE ON reservation_event
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_modification();

CREATE TRIGGER trg_consent_no_mutation
  BEFORE UPDATE OR DELETE ON consent
  FOR EACH ROW EXECUTE FUNCTION forbid_modification();
CREATE TRIGGER trg_consent_no_truncate
  BEFORE TRUNCATE ON consent
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_modification();

CREATE FUNCTION audit_log_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.created_at < now() - interval '1 year' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION '% on audit_log is not allowed (only DELETE of rows older than 1 year)', TG_OP
    USING ERRCODE = 'restrict_violation';
END
$$;

CREATE TRIGGER trg_audit_log_guard
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_guard();
CREATE TRIGGER trg_audit_log_no_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_modification();

-- ------------------------------------------------------------------
-- 3) 예약 상태/슬롯 변경에는 같은 트랜잭션의 이력(reservation_event)이 반드시 있어야 한다.
--    트랜잭션 끝(COMMIT 시점)에 검사하는 deferred constraint trigger.
--    조건: 이벤트의 created_at = transaction_timestamp() (기본값 now() 를 그대로 써야 함: 앱이 created_at 을 직접 넣지 말 것),
--          to_status 와 to_slot_id 가 예약의 최종 값과 같을 것.
-- ------------------------------------------------------------------
CREATE FUNCTION reservation_require_event() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = OLD.status AND NEW.slot_id = OLD.slot_id THEN
    RETURN NULL;   -- 상태/슬롯이 안 바뀌면 이력 불필요(version, updated_at 등)
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM reservation_event e
    WHERE e.reservation_id = NEW.id
      AND e.created_at = transaction_timestamp()
      AND e.to_status = NEW.status
      AND e.to_slot_id = NEW.slot_id
  ) THEN
    RAISE EXCEPTION 'reservation % changed without a matching reservation_event in the same transaction', NEW.id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NULL;
END
$$;

CREATE CONSTRAINT TRIGGER trg_reservation_require_event
  AFTER INSERT OR UPDATE OF status, slot_id ON reservation
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION reservation_require_event();

-- ------------------------------------------------------------------
-- 4) 사전 문진은 '동의함'인 sensitive_info 동의 행이 있어야만 저장된다.
--    (consent_id + patient_id 가 같은 환자의 동의인지는 복합 FK 가 보장)
-- ------------------------------------------------------------------
CREATE FUNCTION intake_require_sensitive_consent() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM consent c
    WHERE c.id = NEW.consent_id
      AND c.patient_id = NEW.patient_id
      AND c.type = 'sensitive_info'
      AND c.agreed
  ) THEN
    RAISE EXCEPTION 'intake_response requires an agreed sensitive_info consent'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER trg_intake_require_consent
  BEFORE INSERT ON intake_response
  FOR EACH ROW EXECUTE FUNCTION intake_require_sensitive_consent();
