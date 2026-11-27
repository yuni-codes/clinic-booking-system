// 표기 형식 (design-system README 표기 형식 표). 대응: design-system/project/components/index.d.ts 의 유틸.

/** 숫자만 받아 010-0000-0000 으로 자동 하이픈 */
export function formatPhone(value: string): string {
  const d = String(value ?? "").replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function isValidPhone(value: string): boolean {
  return /^01[016789]\d{7,8}$/.test(String(value ?? "").replace(/\D/g, ""));
}

/** 010-****-5678 (관리자 목록용. 환자 화면은 본인 번호라 쓰지 않지만 공용 유틸로 둔다) */
export function maskPhone(value: string): string {
  const f = formatPhone(value).split("-");
  if (f.length !== 3) return formatPhone(value);
  return `${f[0]}-${f[1].replace(/./g, "*")}-${f[2]}`;
}

export function maskName(name: string): string {
  const n = String(name ?? "");
  if (n.length <= 1) return n;
  if (n.length === 2) return `${n[0]}*`;
  return `${n[0]}${n.slice(1, -1).replace(/./g, "*")}${n[n.length - 1]}`;
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
