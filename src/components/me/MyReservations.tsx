"use client";
// 내 예약 조회·취소 (ScreenMyBookings, M-01). 다가오는 예약이 먼저, 취소는 항상 Dialog 로 한 번 더 묻는다.
// 취소 마감이 지났으면 취소 버튼 대신 전화 안내를 보여 준다.
import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button, Dialog, Notice, ReservationCard, Segmented } from "@/components/ui";
import { cancelReservation, getMyProfile, listMyReservations } from "@/lib/api/reservations";
import { formatDate, seoulDateKey } from "@/lib/date";
import { formatPhone } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useAsync } from "@/lib/use-async";
import type { ReservationView } from "@/lib/types";
import styles from "./MyReservations.module.scss";

type Tab = "upcoming" | "past";

export function MyReservations({ hospitalPhone }: { hospitalPhone: string }) {
  const session = useSession();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [target, setTarget] = useState<ReservationView | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const key = session?.phone ?? "none";
  const list = useAsync(`mine:${key}`, () => listMyReservations(session ?? null));
  const profile = useAsync(`profile:${key}`, () => getMyProfile(session ?? null));

  async function confirmCancel() {
    if (!target || cancelling) return;
    setCancelling(true);
    const result = await cancelReservation(session ?? null, target.reservationNo);
    setCancelling(false);
    if (!result.ok) {
      setCancelError(result.error.message);
      setTarget(null);
      list.reload();
      return;
    }
    setCancelError(null);
    setToast(`${formatDate(target.date)} ${target.time} 예약을 취소했습니다.`);
    window.setTimeout(() => setToast(null), 5000);
    setTarget(null);
    list.reload();
  }

  if (session === undefined) return null;

  if (session === null) {
    return (
      <PageContainer narrow className={styles.page}>
        <div className={styles.intro}>
          <h1>내 예약</h1>
          <p>휴대폰 인증을 하면 회원가입 없이도 내 예약을 확인하고 취소할 수 있습니다.</p>
        </div>
        <div>
          <Button variant="primary" size="lg" href="/login?next=/me/reservations">
            휴대폰 인증하기
          </Button>
        </div>
      </PageContainer>
    );
  }

  const result = list.data;
  const loaded = result?.ok ? result.data : null;
  const rows = loaded ? (tab === "upcoming" ? loaded.upcoming : loaded.past) : [];
  const expiredUpcoming = loaded?.upcoming.filter((r) => !r.cancelable) ?? [];
  const me = profile.data?.ok ? profile.data.data : null;
  const todayKey = seoulDateKey(new Date());

  return (
    <PageContainer className={styles.page}>
      <div className={styles.head}>
        <div className={styles.intro}>
          <h1>내 예약</h1>
          <p>취소는 진료 전날 18:00까지 할 수 있습니다.</p>
        </div>
        <Button variant="primary" href="/book">
          새 예약하기
        </Button>
      </div>

      {cancelError ? (
        <Notice tone="danger" title="예약을 취소하지 못했습니다">
          {cancelError}
        </Notice>
      ) : null}

      <div className={styles.cols}>
        <div className={styles.main}>
          <div className={styles.seg}>
            <Segmented
              label="예약 구분"
              value={tab}
              onChange={(v) => setTab(v as Tab)}
              options={[
                { value: "upcoming", label: "다가오는 예약" },
                { value: "past", label: "지난 예약" },
              ]}
            />
          </div>

          {list.loading ? (
            <p role="status" className={styles.muted}>
              예약을 불러오는 중입니다.
            </p>
          ) : result && !result.ok ? (
            <Notice tone="danger" title="예약을 불러오지 못했습니다">
              {result.error.message}
            </Notice>
          ) : (
            <div className={styles.list}>
              {rows.length ? (
                rows.map((r) => (
                  <ReservationCard
                    key={r.id}
                    date={r.date}
                    time={r.time}
                    department={r.departmentName}
                    doctor={r.doctorName}
                    status={r.status}
                    note={noteOf(r, tab, hospitalPhone, todayKey)}
                    actions={actionsOf(r, tab, hospitalPhone, () => {
                      setCancelError(null);
                      setTarget(r);
                    })}
                  />
                ))
              ) : (
                <div className={styles.empty}>
                  {tab === "upcoming" ? "다가오는 예약이 없습니다." : "지난 예약이 없습니다."}
                </div>
              )}
            </div>
          )}
        </div>

        <aside className={styles.aside}>
          <section className={styles.me} aria-labelledby="me-heading">
            <h2 id="me-heading">내 정보</h2>
            <dl>
              <div>
                <dt>이름</dt>
                <dd>{me?.name ?? "-"}</dd>
              </div>
              <div>
                <dt>휴대폰</dt>
                <dd className="tabular-nums">{formatPhone(session.phone)}</dd>
              </div>
            </dl>
            <p className={styles.muted}>
              {session.kind === "guest" ? "휴대폰 인증으로 조회 중입니다." : "회원으로 로그인했습니다."}
            </p>
          </section>
          <Notice tone="info" title="진료 전날 문자 안내">
            예약 하루 전 오후 6시에 진료 시간과 준비 사항을 문자로 보내 드립니다.
          </Notice>
          {expiredUpcoming.map((r) => (
            <Notice
              key={r.id}
              tone="warning"
              title={`${formatDate(r.date)} ${r.departmentName} 예약`}
            >
              취소 마감이 지났습니다. 방문이 어려우면 {hospitalPhone}로 연락해 주세요.
            </Notice>
          ))}
        </aside>
      </div>

      <Dialog
        open={target !== null}
        alert
        title="예약을 취소할까요?"
        onClose={() => (cancelling ? undefined : setTarget(null))}
        actions={
          <>
            <Button onClick={() => setTarget(null)} disabled={cancelling}>
              돌아가기
            </Button>
            <Button variant="danger" loading={cancelling} loadingText="취소 중…" onClick={confirmCancel}>
              예약 취소하기
            </Button>
          </>
        }
      >
        {target
          ? `${formatDate(target.date)} ${target.time} ${target.departmentName} ${target.doctorName} 예약이 취소됩니다. 같은 시간은 다른 분이 예약할 수 있습니다.`
          : null}
      </Dialog>

      {toast ? (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      ) : null}
    </PageContainer>
  );
}

function noteOf(r: ReservationView, tab: Tab, phone: string, todayKey: string): string {
  if (r.statusDb === "cancelled") {
    return r.cancelledAt ? `${formatDate(seoulDateKey(new Date(r.cancelledAt)))} 취소` : "취소됨";
  }
  if (tab === "past") return r.statusDb === "completed" ? "진료를 마쳤습니다" : r.statusDb === "no_show" ? "방문하지 않으셨습니다" : "";
  if (!r.cancelable) return `취소 마감이 지났습니다. ${phone}로 연락해 주세요.`;
  const today = r.date === todayKey ? "오늘 진료 · " : "";
  return `${today}${r.intakeDone ? "문진표 작성 완료" : "문진표 미작성"}`;
}

function actionsOf(r: ReservationView, tab: Tab, phone: string, onCancel: () => void) {
  if (tab !== "upcoming" || r.statusDb === "cancelled") return undefined;
  // 취소 마감이 지나면 버튼 대신 전화 안내(전화 걸기)
  return r.cancelable ? (
    <Button size="sm" onClick={onCancel}>
      예약 취소
    </Button>
  ) : (
    <Button size="sm" href={`tel:${phone.replaceAll("-", "")}`}>
      전화로 취소
    </Button>
  );
}
