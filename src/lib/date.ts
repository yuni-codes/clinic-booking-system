// 날짜·시간 유틸. 병원 현지 시간대(Asia/Seoul, data-model.md 1절) 기준이며 Intl 표준 API만 쓴다.
// 날짜 문자열("DateKey")은 YYYY-MM-DD, 시각은 HH:mm(24시간제), 저장용 시각은 UTC ISO 문자열이다.

export const SEOUL_TZ = "Asia/Seoul";
export const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type DateKey = string;

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SEOUL_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function seoulParts(date: Date) {
  const out: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(date)) out[p.type] = p.value;
  return out;
}

/** 서울 기준 날짜(YYYY-MM-DD) */
export function seoulDateKey(date: Date): DateKey {
  const p = seoulParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/** 서울 기준 시각(HH:mm) */
export function seoulTime(date: Date): string {
  const p = seoulParts(date);
  return `${p.hour}:${p.minute}`;
}

function parseKey(key: DateKey) {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

/** 날짜에 일수를 더한다(시간대 영향 없는 달력 계산). */
export function addDays(key: DateKey, days: number): DateKey {
  const { y, m, d } = parseKey(key);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** 0=일 … 6=토 */
export function weekdayOf(key: DateKey): number {
  const { y, m, d } = parseKey(key);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** data-model.md 의 weekday: 1=월 … 7=일 */
export function isoWeekdayOf(key: DateKey): number {
  const w = weekdayOf(key);
  return w === 0 ? 7 : w;
}

export function dayOfMonth(key: DateKey): number {
  return parseKey(key).d;
}

/** 표기 형식 `M월 D일 (요일)` */
export function formatDate(key: DateKey): string {
  const { m, d } = parseKey(key);
  return `${m}월 ${d}일 (${WEEK_LABELS[weekdayOf(key)]})`;
}

/** 두 날짜 사이 일수 (b - a) */
export function diffDays(a: DateKey, b: DateKey): number {
  const pa = parseKey(a);
  const pb = parseKey(b);
  return Math.round(
    (Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000,
  );
}

/** 서울 벽시계 날짜+시각 -> UTC ISO (한국은 일광절약시간이 없어 +09:00 고정) */
export function seoulWallToIso(key: DateKey, time: string): string {
  return new Date(`${key}T${time}:00+09:00`).toISOString();
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function timeOfMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
