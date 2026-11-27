import type { Metadata } from "next";
import { DoctorSelect } from "@/components/booking/DoctorSelect";
import { getHospital, listDepartments, listDoctors } from "@/lib/api/catalog";

export const metadata: Metadata = { title: "진료과·의사 선택" };

export default async function BookPage() {
  const [hospital, departments, doctors] = await Promise.all([
    getHospital(),
    listDepartments(),
    listDoctors(),
  ]);
  return <DoctorSelect departments={departments} doctors={doctors} hospitalPhone={hospital.phone} />;
}
