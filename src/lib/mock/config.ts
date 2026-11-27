// 화면 개발용 mock 설정. 백엔드가 붙으면 이 파일의 값은 setting 테이블(data-model.md 6절)에서 온다.
// 이 파일과 src/lib/mock/ 아래 모든 값은 가짜 정보다. 실제 개인정보를 넣지 않는다.

/**
 * !!! 화면 개발용 고정 인증번호 !!!
 * 실제 SMS 를 보내지 않고 모든 번호에 이 값을 정답으로 받아들인다.
 * 백엔드 연동 시 src/lib/api/auth.ts 와 함께 삭제한다. 운영 코드에 남기지 않는다.
 */
export const MOCK_OTP_CODE = "123456";

/** 인증번호 유효 시간(초). 3분은 확정값 (data-model.md otp_ttl_seconds) */
export const OTP_TTL_SECONDS = 180;
/** 인증번호 입력 허용 횟수 (data-model.md otp_max_attempts 제안값) */
export const OTP_MAX_ATTEMPTS = 5;

/** 화면 개발용 회원(아이디) 계정 */
export const MOCK_MEMBER = {
  loginId: "carebook",
  password: "carebook1!",
  name: "홍길동",
  phone: "01012345678",
} as const;

/** 시안과 같은 가짜 번호. 이 번호로 인증하면 시드 예약이 보인다. */
export const MOCK_SEED_PHONE = "01012345678";

/**
 * "제출 시 이미 예약됨" 을 재현하는 시간. 어느 의사·어느 날이든 이 시간을 골라 예약하면
 * createReservation 이 SLOT_TAKEN 으로 응답하고 그 슬롯을 마감 처리한다 (ScreenSchedule 시안의 15:00).
 */
export const MOCK_RACE_TIME = "15:00";

/** true 면 화면에 mock 사용 안내(인증번호, 15:00 동작)를 띄운다. 백엔드 연동 시 false. */
export const SHOW_MOCK_HINTS = true;

/** 취소 마감 규칙: 진료 N일 전 HH:mm (Q6 미확정, 시안 예시는 전날 18:00) */
export const CANCEL_DEADLINE = { daysBefore: 1, time: "18:00" } as const;

/** 예약 가능 최소 리드타임(분) (Q15 제안값) */
export const MIN_LEAD_MINUTES = 30;

/** 예약 가능 일수 (시안: 앞으로 2주) */
export const BOOKING_WINDOW_DAYS = 14;

/** 네트워크 지연 흉내(ms) */
export const MOCK_LATENCY_MS = 500;

/**
 * 건강 정보(문진) 수집·이용 동의문. 민감정보라 별도 동의가 필요하다 (Q11).
 * 문구와 보관 기간은 법무 확인 전 임시값이다 (Q22, data-model.md intake_retention_days 제안 365일).
 */
export const SENSITIVE_CONSENT = {
  version: "mock-0",
  title: "건강 정보 수집·이용 동의 (필수)",
  items: "증상, 복용 중인 약, 알레르기, 해외 방문 여부",
  purpose: "진료 전 의료진 확인",
  retention: "진료일부터 1년간 보관 후 파기",
} as const;
