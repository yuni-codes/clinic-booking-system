// 고정 mock 데이터 (병원 정보, 진료과, 의사, 휴진). 모두 가짜 정보다.
// 백엔드 연동 시 src/lib/api/catalog.ts 가 DB 조회로 바뀌며 이 파일은 시드로만 남는다.
import type { Department, Doctor, DoctorWeeklyHour, Hospital } from "../types";

export const HOSPITAL: Hospital = {
  id: "hospital-1",
  name: "케어북 병원",
  timezone: "Asia/Seoul",
  phone: "02-1234-5678",
  address: "서울특별시 가나구 다라로 123 (가짜 주소)",
};

export const DEPARTMENTS: Department[] = [
  { id: "dept-im", name: "내과", description: "감기 · 소화기 · 만성질환", sortOrder: 1, isActive: true },
  { id: "dept-os", name: "정형외과", description: "관절 · 척추 · 골절", sortOrder: 2, isActive: true },
  { id: "dept-ent", name: "이비인후과", description: "귀 · 코 · 목", sortOrder: 3, isActive: true },
  { id: "dept-derm", name: "피부과", description: "습진 · 여드름 · 두드러기", sortOrder: 4, isActive: true },
  { id: "dept-fm", name: "가정의학과", description: "건강검진 · 예방접종", sortOrder: 5, isActive: true },
];

/** 평일 09:00–18:00(점심 13:00–14:00), 토요일 09:00–13:00(점심 없음) */
function weeklyHours(openWeekdays: number[]): DoctorWeeklyHour[] {
  return [1, 2, 3, 4, 5, 6, 7].map((weekday) => {
    if (!openWeekdays.includes(weekday)) return { weekday, isOpen: false };
    if (weekday === 6) return { weekday, isOpen: true, startTime: "09:00", endTime: "13:00" };
    return {
      weekday,
      isOpen: true,
      startTime: "09:00",
      endTime: "18:00",
      lunchStart: "13:00",
      lunchEnd: "14:00",
    };
  });
}

function doctor(
  id: string,
  departmentId: string,
  name: string,
  title: string,
  specialty: string,
  openWeekdays: number[],
  slotMinutes: number,
): Doctor {
  return {
    id,
    departmentId,
    name,
    title,
    specialty,
    photoUrl: null,
    slotMinutes,
    weeklyHours: weeklyHours(openWeekdays),
    isActive: true,
  };
}

export const DOCTORS: Doctor[] = [
  doctor("doc-im-1", "dept-im", "김서연", "교수", "소화기 · 내시경", [1, 3, 5], 30),
  doctor("doc-im-2", "dept-im", "박준호", "교수", "호흡기 · 알레르기", [2, 4, 6], 30),
  doctor("doc-im-3", "dept-im", "오민재", "전문의", "당뇨 · 고혈압 · 갑상선", [1, 2, 4, 5], 20),
  doctor("doc-os-1", "dept-os", "이도윤", "원장", "무릎 · 어깨 관절", [1, 2, 3, 4, 5], 30),
  doctor("doc-os-2", "dept-os", "문가은", "전문의", "척추 · 골다공증", [2, 4], 15),
  doctor("doc-ent-1", "dept-ent", "정유나", "원장", "비염 · 축농증 · 수면무호흡", [1, 3, 5, 6], 30),
  doctor("doc-derm-1", "dept-derm", "한소율", "원장", "습진 · 여드름 · 두드러기", [2, 3, 5], 30),
  doctor("doc-fm-1", "dept-fm", "최현우", "원장", "건강검진 · 예방접종", [1, 2, 3, 4, 5], 30),
];

/** 휴진: 오늘 기준 일수 오프셋(from..to 포함). 의사 휴진일 표시(DateStrip 휴진) 재현용. */
export const CLOSURE_OFFSETS: { doctorId: string; fromOffset: number; toOffset: number }[] = [
  { doctorId: "doc-os-1", fromOffset: 3, toOffset: 4 },
  { doctorId: "doc-fm-1", fromOffset: 6, toOffset: 7 },
];
