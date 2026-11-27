// 휴대폰 인증·로그인. 화면 개발용 mock: 실제 SMS 는 보내지 않는다.
// 교체 지점: requestPhoneCode -> phone_verification INSERT + SMS 발송, verifyPhoneCode -> code_hash 비교 후
// 세션 발급(회원: user_id, 비회원: guest_phone_hash), loginWithPassword -> user_account 검증.
// 반환하는 Session 은 서버에서는 쿠키 세션이 대신하므로 클라이언트 저장(src/lib/session.ts)도 걷어낸다.
import { MOCK_MEMBER, MOCK_OTP_CODE, OTP_MAX_ATTEMPTS, OTP_TTL_SECONDS } from "../mock/config";
import { store } from "../mock/store";
import { fail, ok, type ApiResult, type Session } from "../types";
import { latency } from "./delay";

export type PhonePurpose = "guest_booking" | "guest_lookup" | "login";

export interface PhoneCodeIssued {
  ttlSeconds: number;
  /** ISO. 클라이언트 타이머의 기준 */
  expiresAt: string;
}

export async function requestPhoneCode(input: {
  phone: string;
  purpose: PhonePurpose;
}): Promise<ApiResult<PhoneCodeIssued>> {
  await latency(500);
  if (!/^01[016789]\d{7,8}$/.test(input.phone)) {
    return fail("VALIDATION", "휴대폰 번호를 다시 확인해 주세요.", { field: "phone" });
  }
  const expiresAt = Date.now() + OTP_TTL_SECONDS * 1000;
  store.otp.set(input.phone, { expiresAt, attempts: 0 });
  return ok({ ttlSeconds: OTP_TTL_SECONDS, expiresAt: new Date(expiresAt).toISOString() });
}

export async function verifyPhoneCode(input: {
  phone: string;
  code: string;
  purpose: PhonePurpose;
}): Promise<ApiResult<Session>> {
  await latency(500);
  const state = store.otp.get(input.phone);
  if (!state) return fail("CODE_EXPIRED", "인증번호를 먼저 받아 주세요.");
  if (Date.now() > state.expiresAt) {
    return fail("CODE_EXPIRED", "인증 시간이 지났습니다. 인증번호를 다시 받아 주세요.");
  }
  if (state.attempts >= OTP_MAX_ATTEMPTS) {
    return fail("TOO_MANY_ATTEMPTS", "입력 횟수를 넘었습니다. 인증번호를 다시 받아 주세요.");
  }
  if (input.code !== MOCK_OTP_CODE) {
    state.attempts += 1;
    return fail("INVALID_CODE", "인증번호가 맞지 않습니다. 문자로 받은 6자리 숫자를 다시 확인해 주세요.");
  }
  store.otp.delete(input.phone);
  return ok({ kind: "guest", phone: input.phone });
}

export async function loginWithPassword(input: {
  loginId: string;
  password: string;
}): Promise<ApiResult<Session>> {
  await latency(500);
  if (input.loginId !== MOCK_MEMBER.loginId || input.password !== MOCK_MEMBER.password) {
    return fail("INVALID_CREDENTIALS", "아이디 또는 비밀번호가 맞지 않습니다. 다시 확인해 주세요.");
  }
  return ok({
    kind: "member",
    phone: MOCK_MEMBER.phone,
    name: MOCK_MEMBER.name,
    loginId: MOCK_MEMBER.loginId,
  });
}
