import type { Metadata } from "next";
import { SchedulePicker } from "@/components/booking/SchedulePicker";
import { listDepartments, listDoctors } from "@/lib/api/catalog";

export const metadata: Metadata = { title: "일시 선택" };

export default async function SchedulePage() {
  const [departments, doctors] = await Promise.all([listDepartments(), listDoctors()]);
  return <SchedulePicker departments={departments} doctors={doctors} />;
}
