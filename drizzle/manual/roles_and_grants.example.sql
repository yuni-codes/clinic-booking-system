-- 예시(자동 적용 대상 아님): 환경별로 역할 이름이 다르므로 journal 밖에 둔다. 운영 배포 시 DBA 가 조정해 적용.
-- 목적: 앱 DB 계정이 이력/동의를 변조하지 못하고, 문진(건강정보) 접근을 최소화한다.
-- (트리거 차단과 별개로 권한 자체를 제거하는 2중 방어)
--   clinic_migrator : 마이그레이션 실행(스키마 소유자)
--   clinic_app      : Next.js 서버가 쓰는 런타임 계정

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clinic_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clinic_app;

REVOKE UPDATE, DELETE, TRUNCATE ON reservation_event FROM clinic_app;
REVOKE UPDATE, DELETE, TRUNCATE ON consent FROM clinic_app;
REVOKE UPDATE, TRUNCATE ON audit_log FROM clinic_app;     -- DELETE 는 파기 배치용으로 트리거가 1년 경과분만 허용
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM clinic_app;

-- 문진: 저장/조회/파기만. 암호문 컬럼과 purged_at 외 수정 금지.
REVOKE UPDATE, DELETE ON intake_response FROM clinic_app;
GRANT UPDATE (payload_enc, purged_at) ON intake_response TO clinic_app;
-- 더 엄격히 하려면 문진 조회 전용 역할(clinic_intake_reader)을 분리하고, 문진 복호화 키를 그 프로세스에만 둔다.
