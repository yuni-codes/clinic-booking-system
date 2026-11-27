import { PageContainer } from "@/components/layout/PageContainer";
import { PatientShell } from "@/components/layout/PatientShell";
import { Button, Notice } from "@/components/ui";
import { getHospital, listDepartments } from "@/lib/api/catalog";
import styles from "./page.module.scss";

const HOW_TO = [
  "진료과와 의사를 선택합니다.",
  "진료 날짜와 시간을 선택합니다.",
  "사전 문진표를 작성합니다.",
  "예약 내용을 확인하고 예약합니다.",
];

export default async function Home() {
  const [hospital, departments] = await Promise.all([getHospital(), listDepartments()]);
  return (
    <PatientShell>
      <PageContainer className={styles.page}>
        <section className={styles.hero} aria-labelledby="home-title">
          <h1 id="home-title">{hospital.name}</h1>
          <p>
            휴대폰 번호만 있으면 회원가입 없이도 진료를 예약하고, 내 예약을 확인하고, 취소할 수
            있습니다.
          </p>
          <div className={styles.actions}>
            <Button variant="primary" size="lg" href="/book">
              예약하기
            </Button>
            <Button size="lg" href="/me/reservations">
              내 예약 보기
            </Button>
          </div>
        </section>

        <div className={styles.cols}>
          <section className={styles.card} aria-labelledby="home-how">
            <h2 id="home-how">예약은 이렇게 합니다</h2>
            <ol className={styles.steps}>
              {HOW_TO.map((text, i) => (
                <li key={text}>
                  <b aria-hidden="true">{i + 1}</b>
                  {text}
                </li>
              ))}
            </ol>
            <Notice tone="info" title="취소는 진료 전날 18:00까지">
              그 이후에는 {hospital.phone}로 전화해 주세요.
            </Notice>
          </section>

          <section className={styles.card} aria-labelledby="home-depts">
            <h2 id="home-depts">진료과</h2>
            <ul className={styles.depts}>
              {departments.map((d) => (
                <li key={d.id}>
                  <b>{d.name}</b>
                  <span>{d.description}</span>
                </li>
              ))}
            </ul>
            <p className={styles.tel}>
              예약 문의 <b>{hospital.phone}</b>
            </p>
          </section>
        </div>
      </PageContainer>
    </PatientShell>
  );
}
