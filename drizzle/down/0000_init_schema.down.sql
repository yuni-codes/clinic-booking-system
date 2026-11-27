-- 0000_init_schema 되돌리기. 모든 테이블과 데이터를 삭제한다(운영 DB 에서는 백업 후, 0001 down 을 먼저 실행).
-- FK 의존 순서의 역순.
DROP TABLE IF EXISTS setting;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS notification;
DROP TABLE IF EXISTS intake_response;
DROP TABLE IF EXISTS reservation_event;
DROP TABLE IF EXISTS reservation;
DROP TABLE IF EXISTS closure;
DROP TABLE IF EXISTS slot;
DROP TABLE IF EXISTS doctor_weekly_hour;
DROP TABLE IF EXISTS doctor;
DROP TABLE IF EXISTS department;
DROP TABLE IF EXISTS phone_verification;
DROP TABLE IF EXISTS consent;
DROP TABLE IF EXISTS patient;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS user_account;
DROP TABLE IF EXISTS hospital;
-- drizzle 마이그레이션 기록을 쓰는 경우 drizzle.__drizzle_migrations 의 해당 행도 삭제해야 한다.
