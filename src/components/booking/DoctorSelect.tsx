"use client";
// 예약 1·2단계: 진료과 -> 의사 (ScreenDoctors). 데스크톱은 진료과 400px / 의사 패널 두 열,
// 1024px 미만은 위아래, 모바일은 진료과를 가로로 미는 칩으로 보여 준다.
import { useRouter } from "next/navigation";
import { Badge, DepartmentTile, DepartmentTiles, DoctorCard, Notice } from "@/components/ui";
import { clinicDayLabels, doctorFullName, worksOnWeekday } from "@/lib/doctor";
import { useSeoulWeekday } from "@/lib/use-today";
import type { Department, Doctor } from "@/lib/types";
import { useBooking } from "./BookingProvider";
import { StepFrame } from "./StepFrame";
import styles from "./DoctorSelect.module.scss";

export function DoctorSelect({
  departments,
  doctors,
  hospitalPhone,
}: {
  departments: Department[];
  doctors: Doctor[];
  hospitalPhone: string;
}) {
  const router = useRouter();
  const { draft, selectDoctor } = useBooking();
  const todayWeekday = useSeoulWeekday();

  const department = departments.find((d) => d.id === draft.departmentId) ?? null;
  const departmentDoctors = department ? doctors.filter((d) => d.departmentId === department.id) : [];
  const doctor = departmentDoctors.find((d) => d.id === draft.doctorId) ?? null;

  function chooseDepartment(d: Department) {
    // 진료과를 바꾸면 그 과의 첫 의사가 기본 선택된다.
    const first = doctors.find((x) => x.departmentId === d.id);
    selectDoctor(d.id, d.id === draft.departmentId ? draft.doctorId : (first?.id ?? null));
  }

  return (
    <StepFrame
      step={department ? 1 : 0}
      title="진료과와 의사를 선택해 주세요"
      description="어느 진료과로 가야 할지 모르겠다면 가정의학과를 선택해 주세요."
      layout="bar"
      summary={[
        { label: "진료과", value: department?.name, placeholder: "진료과를 선택해 주세요" },
        {
          label: "의사",
          value: doctor ? doctorFullName(doctor) : null,
          placeholder: "의사를 선택해 주세요",
        },
      ]}
      primary={{
        label: "다음: 일시 선택",
        disabled: !doctor,
        onClick: () => router.push("/book/schedule"),
      }}
    >
      <div className={styles.cols}>
        <section className={styles.panel} aria-labelledby="dept-heading">
          <h2 id="dept-heading">
            진료과 <span>{departments.length}개</span>
          </h2>
          <DepartmentTiles>
            {departments.map((d) => (
              <DepartmentTile
                key={d.id}
                name={d.name}
                note={d.description}
                selected={d.id === draft.departmentId}
                onSelect={() => chooseDepartment(d)}
              />
            ))}
          </DepartmentTiles>
        </section>

        <section className={styles.panel} aria-labelledby="doctor-heading">
          <div className={styles.head}>
            <h2 id="doctor-heading">{department ? `${department.name} 의료진` : "의료진"}</h2>
            {department ? (
              <span className={styles.count}>{departmentDoctors.length}명 · 노란 요일에 진료합니다</span>
            ) : null}
          </div>
          {!department ? (
            <div className={styles.empty}>진료과를 먼저 선택해 주세요.</div>
          ) : departmentDoctors.length ? (
            <div className={styles.doctors}>
              {departmentDoctors.map((d) => (
                <DoctorCard
                  key={d.id}
                  name={d.name}
                  title={d.title}
                  department={department.name}
                  specialty={d.specialty}
                  days={clinicDayLabels(d)}
                  badge={
                    todayWeekday !== null && worksOnWeekday(d, todayWeekday) ? (
                      <Badge status="live">오늘 진료</Badge>
                    ) : null
                  }
                  selected={d.id === draft.doctorId}
                  onSelect={() => selectDoctor(department.id, d.id)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>이 진료과는 전화로 예약해 주세요. {hospitalPhone}</div>
          )}
          <Notice tone="info" title="처음 오시나요?">
            초진은 진료 시간이 조금 더 걸릴 수 있습니다. 예약 시간 15분 전까지 1층 원무과에 도착해
            주세요.
          </Notice>
        </section>
      </div>
    </StepFrame>
  );
}
