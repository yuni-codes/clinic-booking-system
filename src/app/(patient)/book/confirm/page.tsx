import type { Metadata } from "next";
import { ConfirmStep } from "@/components/booking/ConfirmStep";
import { listDepartments, listDoctors } from "@/lib/api/catalog";

export const metadata: Metadata = { title: "예약 확인" };

export default async function ConfirmPage() {
  const [departments, doctors] = await Promise.all([listDepartments(), listDoctors()]);
  return <ConfirmStep departments={departments} doctors={doctors} />;
}
