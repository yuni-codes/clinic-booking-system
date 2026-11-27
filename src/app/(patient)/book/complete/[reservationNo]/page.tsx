import type { Metadata } from "next";
import { Suspense } from "react";
import { CompleteScreen } from "@/components/booking/CompleteScreen";
import { getHospital } from "@/lib/api/catalog";

export const metadata: Metadata = { title: "예약 완료" };

// cacheComponents: 요청 시점에야 알 수 있는 params 는 Suspense 안에서 읽는다.
export default function CompletePage(props: PageProps<"/book/complete/[reservationNo]">) {
  return (
    <Suspense fallback={null}>
      <CompleteContent params={props.params} />
    </Suspense>
  );
}

async function CompleteContent({
  params,
}: {
  params: PageProps<"/book/complete/[reservationNo]">["params"];
}) {
  const [{ reservationNo }, hospital] = await Promise.all([params, getHospital()]);
  return <CompleteScreen reservationNo={reservationNo} hospitalPhone={hospital.phone} />;
}
