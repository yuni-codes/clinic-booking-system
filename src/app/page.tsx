import { Button, Text, Title } from "@mantine/core";
import styles from "./page.module.scss";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <Title order={1}>병원 예약 시스템</Title>
        <Text c="dimmed">Next.js + Mantine + SCSS 프로젝트가 준비되었습니다.</Text>
        <Button>예약하기</Button>
      </main>
    </div>
  );
}
