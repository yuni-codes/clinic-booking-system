// 병원·진료과·의사 조회. 시그니처는 서버 조회(Server Component 의 await)나 Server Action 으로 옮겨도 그대로 쓴다.
// 교체 지점: 본문을 Drizzle 조회(department, doctor, doctor_weekly_hour)로 바꾼다.
import { DEPARTMENTS, DOCTORS, HOSPITAL } from "../mock/data";
import type { Department, Doctor, Hospital } from "../types";

export async function getHospital(): Promise<Hospital> {
  return HOSPITAL;
}

export async function listDepartments(): Promise<Department[]> {
  return DEPARTMENTS.filter((d) => d.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listDoctors(filter?: { departmentId?: string }): Promise<Doctor[]> {
  return DOCTORS.filter(
    (d) => d.isActive && (!filter?.departmentId || d.departmentId === filter.departmentId),
  );
}

export async function getDoctor(id: string): Promise<Doctor | null> {
  return DOCTORS.find((d) => d.id === id) ?? null;
}
