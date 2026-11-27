"use client";
// 데스크톱: 병원 이름 + 메뉴 + 문의 전화 + 로그인 (ScreenDoctors 상단 헤더).
// 모바일(768px 이하): 56px 앱 바 — 이전 · 제목 · 메뉴(Drawer).
import { Drawer } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { cx } from "@/lib/cx";
import { formatPhone } from "@/lib/format";
import { setSession, useSession } from "@/lib/session";
import styles from "./SiteHeader.module.scss";

const NAV = [
  { href: "/book", label: "진료 예약" },
  { href: "/me/reservations", label: "내 예약" },
];

interface BarInfo {
  title: string;
  back: string | null;
}

/** 경로별 앱 바 제목과 이전 화면. 이전은 history 가 아니라 명시한 경로로 돌아가 흐름이 흔들리지 않게 한다. */
function barInfo(pathname: string, fallbackTitle: string): BarInfo {
  if (pathname === "/") return { title: fallbackTitle, back: null };
  if (pathname === "/book") return { title: "진료과·의사 선택", back: "/" };
  if (pathname === "/book/schedule") return { title: "일시 선택", back: "/book" };
  if (pathname === "/book/intake") return { title: "사전 문진", back: "/book/schedule" };
  if (pathname === "/book/confirm") return { title: "예약 확인", back: "/book/intake" };
  if (pathname.startsWith("/book/complete")) return { title: "예약 완료", back: null };
  if (pathname === "/login") return { title: "로그인", back: "/" };
  if (pathname.startsWith("/me/reservations")) return { title: "내 예약", back: "/" };
  return { title: fallbackTitle, back: "/" };
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader({
  hospitalName,
  hospitalPhone,
}: {
  hospitalName: string;
  hospitalPhone: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const [menuOpen, menu] = useDisclosure(false);
  const bar = barInfo(pathname, hospitalName);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  function logout() {
    setSession(null);
    menu.close();
    router.push("/");
  }

  return (
    <>
      <header className={styles.desktop}>
        <div className={styles.desktopIn}>
          <Link href="/" className={styles.brand}>
            <span className={styles.mark} aria-hidden="true">
              케
            </span>
            {hospitalName}
          </Link>
          <nav className={styles.gnb} aria-label="주요 메뉴">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
          <span className={styles.tel}>
            예약 문의 <b>{hospitalPhone}</b>
          </span>
          {session === undefined ? null : session ? (
            <>
              <span className={styles.user}>{session.name ?? formatPhone(session.phone)}님</span>
              <Button size="sm" onClick={logout}>
                로그아웃
              </Button>
            </>
          ) : (
            <Button href="/login">로그인</Button>
          )}
        </div>
      </header>

      <header className={styles.appBar}>
        <div className={styles.appBarSide}>
          {bar.back ? (
            <Link href={bar.back} className={styles.barButton} aria-label="이전 화면으로">
              <ChevronLeft />
              <span>이전</span>
            </Link>
          ) : null}
        </div>
        <p className={styles.appBarTitle}>{bar.title}</p>
        <div className={cx(styles.appBarSide, styles.right)}>
          <button type="button" className={styles.barButton} onClick={menu.open} aria-haspopup="dialog">
            <MenuIcon />
            <span>메뉴</span>
          </button>
        </div>
      </header>

      <Drawer
        opened={menuOpen}
        onClose={menu.close}
        position="right"
        size="min(320px, 88vw)"
        title="메뉴"
        classNames={{ title: styles.drawerTitle }}
      >
        <nav className={styles.drawerNav} aria-label="주요 메뉴">
          <Link href="/" onClick={menu.close}>
            홈
          </Link>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={menu.close}>
              {n.label}
            </Link>
          ))}
          {session ? (
            <button type="button" onClick={logout}>
              로그아웃
            </button>
          ) : (
            <Link href="/login" onClick={menu.close}>
              로그인
            </Link>
          )}
        </nav>
        <p className={styles.drawerTel}>
          예약 문의 <b>{hospitalPhone}</b>
        </p>
        {session ? (
          <p className={styles.drawerTel}>
            인증된 번호 <b>{formatPhone(session.phone)}</b>
          </p>
        ) : null}
      </Drawer>
    </>
  );
}
