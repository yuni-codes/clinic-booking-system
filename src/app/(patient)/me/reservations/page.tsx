import type { Metadata } from "next";
import { MyReservations } from "@/components/me/MyReservations";
import { getHospital } from "@/lib/api/catalog";

export const metadata: Metadata = { title: "내 예약" };

export default async function MyReservationsPage() {
  const hospital = await getHospital();
  return <MyReservations hospitalPhone={hospital.phone} />;
}
