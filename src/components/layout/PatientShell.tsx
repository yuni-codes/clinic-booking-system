// 환자 화면 공통 틀: 헤더(데스크톱) / 앱 바(모바일) + 본문. 서버 컴포넌트이고 병원 정보만 조회한다.
import { Suspense, type ReactNode } from "react";
import { getHospital } from "@/lib/api/catalog";
import { SiteHeader } from "./SiteHeader";
import styles from "./PatientShell.module.scss";

export async function PatientShell({ children }: { children: ReactNode }) {
  const hospital = await getHospital();
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        본문으로 바로가기
      </a>
      {/* usePathname 은 요청 시점 값이라 동적 경로에서는 Suspense 가 필요하다. 그 사이 병원 이름만 먼저 보여 준다. */}
      <Suspense fallback={<div className={styles.headerFallback}>{hospital.name}</div>}>
        <SiteHeader hospitalName={hospital.name} hospitalPhone={hospital.phone} />
      </Suspense>
      <main id="main" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
