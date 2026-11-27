-- 0001_integrity_guards 되돌리기. 데이터 손실 없음(제약/트리거만 제거). 적용 순서의 역순.
DROP TRIGGER IF EXISTS trg_intake_require_consent ON intake_response;
DROP FUNCTION IF EXISTS intake_require_sensitive_consent();

DROP TRIGGER IF EXISTS trg_reservation_require_event ON reservation;
DROP FUNCTION IF EXISTS reservation_require_event();

DROP TRIGGER IF EXISTS trg_audit_log_no_truncate ON audit_log;
DROP TRIGGER IF EXISTS trg_audit_log_guard ON audit_log;
DROP FUNCTION IF EXISTS audit_log_guard();

DROP TRIGGER IF EXISTS trg_consent_no_truncate ON consent;
DROP TRIGGER IF EXISTS trg_consent_no_mutation ON consent;
DROP TRIGGER IF EXISTS trg_reservation_event_no_truncate ON reservation_event;
DROP TRIGGER IF EXISTS trg_reservation_event_no_mutation ON reservation_event;
DROP FUNCTION IF EXISTS forbid_modification();

ALTER TABLE slot DROP CONSTRAINT IF EXISTS slot_no_overlap;
-- btree_gist 확장은 다른 객체가 쓸 수 있어 일부러 DROP 하지 않는다. 필요하면 수동: DROP EXTENSION btree_gist;
