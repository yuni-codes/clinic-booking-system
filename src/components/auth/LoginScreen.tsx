"use client";
// 로그인 (ScreenLogin). Segmented 로 휴대폰 번호 / 아이디 전환.
// 휴대폰: 번호 -> 인증번호 받기 -> 6자리 입력(3분 타이머) -> 인증하고 로그인. 비회원도 이 인증만으로 예약·조회한다.
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button, Notice, PhoneField, Segmented, TextField } from "@/components/ui";
import { loginWithPassword, requestPhoneCode, verifyPhoneCode } from "@/lib/api/auth";
import { formatCountdown, formatPhone, isValidPhone } from "@/lib/format";
import { MOCK_MEMBER, MOCK_OTP_CODE, MOCK_SEED_PHONE, SHOW_MOCK_HINTS } from "@/lib/mock/config";
import { setSession } from "@/lib/session";
import styles from "./LoginScreen.module.scss";

type Mode = "phone" | "id";

/** 같은 출처의 상대 경로만 허용 (open redirect 방지) */
function safeNext(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
  return "/me/reservations";
}

export function LoginScreen({ hospitalPhone }: { hospitalPhone: string }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [mode, setMode] = useState<Mode>("phone");

  // 휴대폰 인증
  const [phone, setPhone] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [codeError, setCodeError] = useState<string | undefined>();

  // 아이디 로그인
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [idError, setIdError] = useState<string | undefined>();
  const [loggingIn, setLoggingIn] = useState(false);

  // 3분 타이머: 만료 시각 기준으로 남은 초를 갱신한다.
  useEffect(() => {
    if (expiresAt === null) return;
    const tick = () => setRemaining(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const sent = expiresAt !== null;
  const expired = sent && remaining === 0;

  async function sendCode() {
    if (!isValidPhone(phone) || sending) return;
    setSending(true);
    setPhoneError(undefined);
    setCodeError(undefined);
    setCode("");
    const result = await requestPhoneCode({ phone, purpose: "login" });
    setSending(false);
    if (!result.ok) {
      setPhoneError(result.error.message);
      return;
    }
    setExpiresAt(new Date(result.data.expiresAt).getTime());
  }

  async function verify() {
    if (code.length !== 6 || verifying) return;
    setVerifying(true);
    setCodeError(undefined);
    const result = await verifyPhoneCode({ phone, code, purpose: "login" });
    if (!result.ok) {
      setVerifying(false);
      setCodeError(result.error.message);
      return;
    }
    setSession(result.data);
    router.replace(next);
  }

  async function loginById() {
    if (loggingIn) return;
    if (!loginId.trim() || !password) {
      setIdError("아이디와 비밀번호를 모두 입력해 주세요.");
      return;
    }
    setLoggingIn(true);
    setIdError(undefined);
    const result = await loginWithPassword({ loginId: loginId.trim(), password });
    if (!result.ok) {
      setLoggingIn(false);
      setIdError(result.error.message);
      return;
    }
    setSession(result.data);
    router.replace(next);
  }

  return (
    <PageContainer className={styles.page}>
      <div className={styles.login}>
        <div className={styles.pitch}>
          <h1>
            예약 조회와 취소를
            <br />한 곳에서
          </h1>
          <p>
            휴대폰 번호만 있으면 회원가입 없이도 예약하고, 내 예약을 확인하고, 취소할 수 있습니다.
          </p>
          <ul className={styles.feat}>
            <li>
              <b aria-hidden="true">1</b>
              <span>
                휴대폰 인증으로 바로 로그인
                <small>아이디와 비밀번호를 기억하지 않아도 됩니다.</small>
              </span>
            </li>
            <li>
              <b aria-hidden="true">2</b>
              <span>
                다가오는 예약과 문진표 확인
                <small>진료 전날 문자로도 안내해 드립니다.</small>
              </span>
            </li>
            <li>
              <b aria-hidden="true">3</b>
              <span>
                진료 전날 18:00까지 직접 취소
                <small>그 이후에는 {hospitalPhone}로 연락해 주세요.</small>
              </span>
            </li>
          </ul>
        </div>

        <section className={styles.box} aria-labelledby="login-heading">
          <h2 id="login-heading">로그인</h2>
          <div className={styles.seg}>
            <Segmented
              label="로그인 방식"
              value={mode}
              onChange={(v) => setMode(v as Mode)}
              options={[
                { value: "phone", label: "휴대폰 번호" },
                { value: "id", label: "아이디" },
              ]}
            />
          </div>

          {SHOW_MOCK_HINTS ? (
            // !!! 화면 개발용 안내. 백엔드 연동 시 SHOW_MOCK_HINTS 를 false 로 바꾸면 사라진다.
            <Notice tone="info" title="화면 개발용 안내">
              실제 문자는 발송되지 않습니다. 인증번호는 <b>{MOCK_OTP_CODE}</b> 입니다. 예약이 있는 번호는{" "}
              {formatPhone(MOCK_SEED_PHONE)} 입니다. 아이디 로그인은 아이디 {MOCK_MEMBER.loginId}, 비밀번호{" "}
              {MOCK_MEMBER.password} 를 입력해 주세요.
            </Notice>
          ) : null}

          {mode === "phone" ? (
            <>
              <PhoneField
                value={phone}
                onChange={(v) => {
                  setPhone(v);
                  setExpiresAt(null);
                  setCode("");
                  setPhoneError(undefined);
                  setCodeError(undefined);
                }}
                error={phoneError}
                action={
                  <Button
                    disabled={!isValidPhone(phone)}
                    loading={sending}
                    loadingText="전송 중…"
                    onClick={sendCode}
                  >
                    {sent ? "다시 받기" : "인증번호 받기"}
                  </Button>
                }
              />
              {sent ? (
                <TextField
                  label="인증번호"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="6자리 숫자"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ""));
                    setCodeError(undefined);
                  }}
                  error={
                    codeError ??
                    (expired ? "인증 시간이 지났습니다. 인증번호를 다시 받아 주세요." : undefined)
                  }
                  hint={`${formatPhone(phone)}로 보냈습니다 · 남은 시간 ${formatCountdown(remaining)}`}
                />
              ) : null}
              <Button
                variant="primary"
                size="lg"
                block
                disabled={!sent || expired || code.length !== 6}
                loading={verifying}
                loadingText="인증 중…"
                onClick={verify}
              >
                인증하고 로그인
              </Button>
            </>
          ) : (
            <>
              <TextField
                label="아이디"
                placeholder="아이디"
                autoComplete="username"
                value={loginId}
                onChange={(e) => {
                  setLoginId(e.target.value);
                  setIdError(undefined);
                }}
              />
              <TextField
                label="비밀번호"
                type="password"
                placeholder="비밀번호"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setIdError(undefined);
                }}
                error={idError}
              />
              <Button variant="primary" size="lg" block loading={loggingIn} loadingText="로그인 중…" onClick={loginById}>
                로그인
              </Button>
              <div className={styles.divider}>또는</div>
              <Button block onClick={() => setMode("phone")}>
                비회원으로 예약 조회
              </Button>
            </>
          )}
          <p className={styles.fine}>로그인하면 개인정보 처리방침에 동의한 것으로 봅니다.</p>
        </section>
      </div>
    </PageContainer>
  );
}
