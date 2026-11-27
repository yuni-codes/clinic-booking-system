import type { Metadata } from "next";
import { IntakeStep } from "@/components/booking/IntakeStep";
import { listDepartments, listDoctors } from "@/lib/api/catalog";

export const metadata: Metadata = { title: "사전 문진" };

export default async function IntakePage() {
  const [departments, doctors] = await Promise.all([listDepartments(), listDoctors()]);
  return <IntakeStep departments={departments} doctors={doctors} />;
}
