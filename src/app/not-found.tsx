import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { PatientShell } from "@/components/layout/PatientShell";
import { Button } from "@/components/ui";
import styles from "./not-found.module.scss";

export const metadata: Metadata = { title: "페이지를 찾을 수 없습니다" };

export default function NotFound() {
  return (
    <PatientShell>
      <PageContainer narrow>
        <section className={styles.box}>
          <h1>페이지를 찾을 수 없습니다</h1>
          <p>주소가 바뀌었거나 없는 페이지입니다. 홈에서 다시 찾아 주세요.</p>
          <div>
            <Button variant="primary" size="lg" href="/">
              홈으로 가기
            </Button>
          </div>
        </section>
      </PageContainer>
    </PatientShell>
  );
}
