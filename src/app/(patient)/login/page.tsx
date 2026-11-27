import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { getHospital } from "@/lib/api/catalog";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage() {
  const hospital = await getHospital();
  // useSearchParams(next) 를 쓰는 클라이언트 컴포넌트는 Suspense 로 감싼다.
  return (
    <Suspense fallback={null}>
      <LoginScreen hospitalPhone={hospital.phone} />
    </Suspense>
  );
}
