"use client";
// 예약 4단계: 사전 문진 (ScreenIntake). 필수 항목이 빠지면 제출 시 첫 빠진 항목으로 스크롤 + 오류 문구.
// 건강 정보는 민감정보라 별도 동의(체크)가 필요하다 (Q11).
import { Checkbox } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChoiceGroup, Notice, TextField } from "@/components/ui";
import { doctorFullName } from "@/lib/doctor";
import { formatDate } from "@/lib/date";
import { SENSITIVE_CONSENT } from "@/lib/mock/config";
import type { Department, Doctor, IntakeForm } from "@/lib/types";
import { useBooking } from "./BookingProvider";
import { guardForIntake, useBookingGuard } from "./useBookingGuard";
import { StepFrame } from "./StepFrame";
import styles from "./IntakeStep.module.scss";

type RequiredKey = "visit" | "symptoms" | "since" | "meds" | "allergy" | "travel" | "consent";

const REQUIRED: { key: RequiredKey; label: string }[] = [
  { key: "visit", label: "방문 구분" },
  { key: "symptoms", label: "증상" },
  { key: "since", label: "증상 시작 시기" },
  { key: "meds", label: "복용 중인 약" },
  { key: "allergy", label: "알레르기" },
  { key: "travel", label: "해외 방문" },
  { key: "consent", label: "건강 정보 수집 동의" },
];

const NONE = "해당 없음";

function isFilled(key: RequiredKey, f: IntakeForm, consent: boolean): boolean {
  switch (key) {
    case "symptoms":
      return f.symptoms.length > 0;
    case "consent":
      return consent;
    default:
      return f[key] !== "";
  }
}

const elementId = (key: RequiredKey) => `intake-${key}`;

export function IntakeStep({
  departments,
  doctors,
}: {
  departments: Department[];
  doctors: Doctor[];
}) {
  const router = useRouter();
  const { draft, update } = useBooking();
  const ready = useBookingGuard(guardForIntake(draft));
  const [tried, setTried] = useState(false);

  const f = draft.intake;
  const doctor = doctors.find((d) => d.id === draft.doctorId) ?? null;
  const department = departments.find((d) => d.id === doctor?.departmentId) ?? null;

  if (!ready || !doctor) return null;

  const set = <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) =>
    update({ intake: { ...f, [key]: value } });

  const filledCount = REQUIRED.filter((r) => isFilled(r.key, f, draft.consentSensitive)).length;
  const missing = REQUIRED.filter((r) => !isFilled(r.key, f, draft.consentSensitive));
  const err = (key: RequiredKey) =>
    tried && !isFilled(key, f, draft.consentSensitive) ? "이 항목을 선택해 주세요." : undefined;

  function submit() {
    setTried(true);
    if (missing.length > 0) {
      const target = document.getElementById(elementId(missing[0].key));
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
      return;
    }
    router.push("/book/confirm");
  }

  return (
    <StepFrame
      step={3}
      title="사전 문진표를 작성해 주세요"
      description="진료 전에 의료진이 미리 확인합니다. 3분 정도 걸리며, 작성한 내용은 진료 목적으로만 사용됩니다."
      layout="aside"
      summary={[
        { label: "진료과", value: department?.name },
        { label: "의사", value: doctorFullName(doctor) },
        {
          label: "일시",
          value: draft.date && draft.slot ? `${formatDate(draft.date)} ${draft.slot.time}` : null,
        },
      ]}
      primary={{ label: "문진 제출하고 예약 확인", onClick: submit }}
      back={{ label: "이전: 일시 다시 선택", href: "/book/schedule" }}
      asideExtra={
        <>
          <div className={styles.prog}>
            <div className={styles.progText}>
              <span>필수 항목</span>
              <b>
                {filledCount} / {REQUIRED.length}
              </b>
            </div>
            <div
              className={styles.progBar}
              role="progressbar"
              aria-label="필수 항목 작성"
              aria-valuenow={filledCount}
              aria-valuemin={0}
              aria-valuemax={REQUIRED.length}
            >
              <i style={{ width: `${(filledCount / REQUIRED.length) * 100}%` }} />
            </div>
          </div>
          <ul className={styles.todo}>
            {REQUIRED.map((r) => (
              <li key={r.key} className={isFilled(r.key, f, draft.consentSensitive) ? styles.ok : undefined}>
                {r.label}
              </li>
            ))}
          </ul>
          <p className={styles.fine}>입력한 내용은 이전 단계로 돌아가도 유지됩니다.</p>
        </>
      }
    >
      {tried && missing.length > 0 ? (
        <Notice tone="danger" title={`빠진 항목이 ${missing.length}개 있습니다`}>
          빨간 문구가 있는 질문에 답해 주세요.
        </Notice>
      ) : null}

      <section className={styles.section} aria-labelledby="sec1">
        <div className={styles.sectionHead}>
          <b>01</b>
          <h2 id="sec1">방문 정보</h2>
        </div>
        <ChoiceGroup
          id={elementId("visit")}
          legend="이 병원에 처음 오시나요?"
          required
          options={["초진", "재진"]}
          value={f.visit}
          onChange={(v) => set("visit", v as IntakeForm["visit"])}
          error={err("visit")}
        />
        <ChoiceGroup
          legend="방문 목적"
          options={["진료 · 상담", "검사 결과 확인", "처방 갱신", "건강검진"]}
          value={f.purpose}
          onChange={(v) => set("purpose", v)}
        />
      </section>

      <section className={styles.section} aria-labelledby="sec2">
        <div className={styles.sectionHead}>
          <b>02</b>
          <h2 id="sec2">증상</h2>
        </div>
        <ChoiceGroup
          id={elementId("symptoms")}
          type="multiple"
          legend="해당하는 증상을 모두 골라 주세요"
          required
          options={["기침", "발열", "콧물", "인후통", "두통", "복통", "설사", "어지러움", NONE]}
          value={f.symptoms}
          onChange={(next) => {
            // "해당 없음" 은 다른 증상과 함께 고를 수 없다.
            const justAddedNone = next.includes(NONE) && !f.symptoms.includes(NONE);
            set("symptoms", justAddedNone ? [NONE] : next.filter((s) => s !== NONE));
          }}
          error={err("symptoms")}
        />
        <ChoiceGroup
          id={elementId("since")}
          legend="증상이 언제부터 있었나요?"
          required
          options={["오늘", "1–2일 전", "3일 전", "1주 이상", "한 달 이상"]}
          value={f.since}
          onChange={(v) => set("since", v)}
          error={err("since")}
        />
        <TextField
          label="증상을 자세히 적어 주세요"
          multiline
          maxLength={500}
          placeholder="예: 밤에 기침이 심해지고, 해열제를 먹으면 열이 잠시 내려갑니다."
          value={f.detail}
          onChange={(e) => set("detail", e.target.value)}
          hint="선택 사항입니다. 500자까지 쓸 수 있습니다."
        />
      </section>

      <section className={styles.section} aria-labelledby="sec3">
        <div className={styles.sectionHead}>
          <b>03</b>
          <h2 id="sec3">건강 정보</h2>
        </div>
        <div className={styles.row2}>
          <ChoiceGroup
            id={elementId("meds")}
            legend="복용 중인 약이 있나요?"
            required
            options={["있음", "없음"]}
            value={f.meds}
            onChange={(v) => set("meds", v as IntakeForm["meds"])}
            error={err("meds")}
          />
          <ChoiceGroup
            id={elementId("allergy")}
            legend="약물 · 음식 알레르기가 있나요?"
            required
            options={["있음", "없음", "모름"]}
            value={f.allergy}
            onChange={(v) => set("allergy", v)}
            error={err("allergy")}
          />
        </div>
        {f.meds === "있음" ? (
          <TextField
            label="복용 중인 약 이름"
            placeholder="예: 고혈압약 (아모디핀), 아스피린"
            value={f.medsName}
            onChange={(e) => set("medsName", e.target.value)}
          />
        ) : null}
        <ChoiceGroup
          id={elementId("travel")}
          legend="최근 2주 이내 해외에 다녀오셨나요?"
          required
          options={["예", "아니오"]}
          value={f.travel}
          onChange={(v) => set("travel", v)}
          error={err("travel")}
        />
      </section>

      <section className={styles.section} aria-labelledby="sec4">
        <div className={styles.sectionHead}>
          <b>04</b>
          <h2 id="sec4">민감정보 수집 동의</h2>
        </div>
        <div id={elementId("consent")} tabIndex={-1} className={styles.consent}>
          <Checkbox
            size="lg"
            checked={draft.consentSensitive}
            onChange={(e) => update({ consentSensitive: e.currentTarget.checked })}
            error={err("consent") ? "동의해 주셔야 예약할 수 있습니다." : undefined}
            label={
              <span className={styles.consentLabel}>
                {SENSITIVE_CONSENT.title}
                <span className={styles.req}>필수</span>
              </span>
            }
          />
          <dl className={styles.consentInfo}>
            <div>
              <dt>수집 항목</dt>
              <dd>{SENSITIVE_CONSENT.items}</dd>
            </div>
            <div>
              <dt>이용 목적</dt>
              <dd>{SENSITIVE_CONSENT.purpose}</dd>
            </div>
            <div>
              <dt>보관 기간</dt>
              <dd>{SENSITIVE_CONSENT.retention}</dd>
            </div>
          </dl>
          <p className={styles.fine}>동의하지 않으면 사전 문진을 제출할 수 없어 예약이 진행되지 않습니다.</p>
        </div>
      </section>
    </StepFrame>
  );
}
