// 케어북 Mantine 테마. 값의 출처는 design-system/project/tokens.json 이다.
// 이 파일은 함수(cssVariablesResolver)를 포함하므로 서버 컴포넌트에서 직접 쓰지 말고
// src/app/providers.tsx (client) 를 통해 MantineProvider 에 전달한다.
import {
  createTheme,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from "@mantine/core";

/** layout.tsx 의 next/font 가 선언하는 CSS 변수 이름과 반드시 같아야 한다. */
export const FONT_VARIABLE = "--font-ibm-plex-sans-kr";

/** tokens.json type.families.sans (웹폰트 자리만 next/font 변수로 교체) */
const FONT_SANS = `var(${FONT_VARIABLE}), "IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif`;

/**
 * primary 노랑 10단계 (밝음 -> 어두움). 라이트 기준 filled = index 4 (#ffd400),
 * filled-hover = index 5 (#f2c500). 다크 테마 값은 아래 resolver 에서 CSS 변수로 덮어쓴다.
 * 토큰에 있는 값: 0, 2, 3, 4, 5, 7, 9. 토큰에 없어 사이를 채운 값: 1, 6, 8.
 */
const primary: MantineColorsTuple = [
  "#fff8cc", // primary-soft (light)
  "#fff1a0", // (보간)
  "#ffe27a", // primary-hover (dark)
  "#ffd84d", // primary (dark)
  "#ffd400", // primary (light)
  "#f2c500", // primary-hover (light)
  "#d4aa00", // (보간)
  "#a88600", // selected-border (light)
  "#6b5700", // (보간)
  "#2e2805", // primary-soft (dark)
];

const colorTokens = {
  light: {
    surface: "#ffffff",
    "surface-raised": "#ffffff",
    "surface-sunken": "#f3f4f6",
    line: "#e5e7eb",
    "line-strong": "#878d96",
    ink: "#111418",
    "ink-muted": "#4b5260",
    "ink-subtle": "#687080",
    primary: "#ffd400",
    "primary-hover": "#f2c500",
    "primary-strong": "#111418",
    "selected-border": "#a88600",
    "on-primary": "#111418",
    "primary-soft": "#fff8cc",
    accent: "#2fe6a0",
    "on-accent": "#06281b",
    success: "#047a52",
    "success-soft": "#e0fbf1",
    info: "#1f5fbf",
    "info-soft": "#e8effc",
    warning: "#c2410c",
    "warning-soft": "#fff1e8",
    danger: "#c81e1e",
    "on-danger": "#ffffff",
    "danger-soft": "#fdecec",
    focus: "#1f5fbf",
    "shadow-card":
      "0 1px 2px rgba(17,20,24,0.04), 0 4px 16px rgba(17,20,24,0.04)",
    "shadow-dialog": "0 12px 32px rgba(17,20,24,0.16)",
  },
  dark: {
    surface: "#0e1013",
    "surface-raised": "#171a1f",
    "surface-sunken": "#08090b",
    line: "#2a2e35",
    "line-strong": "#79808c",
    ink: "#f4f5f7",
    "ink-muted": "#b3b9c3",
    "ink-subtle": "#959ca8",
    primary: "#ffd84d",
    "primary-hover": "#ffe27a",
    "primary-strong": "#ffd84d",
    "selected-border": "#ffd84d",
    "on-primary": "#111418",
    "primary-soft": "#2e2805",
    accent: "#45f0b0",
    "on-accent": "#06281b",
    success: "#6ff2c0",
    "success-soft": "#0d2e22",
    info: "#8bb6f2",
    "info-soft": "#16263d",
    warning: "#ffa26b",
    "warning-soft": "#3a2010",
    danger: "#ff8b85",
    "on-danger": "#2a0906",
    "danger-soft": "#3a1515",
    focus: "#8bb6f2",
    "shadow-card": "0 1px 2px rgba(0,0,0,0.5)",
    "shadow-dialog": "0 12px 32px rgba(0,0,0,0.6)",
  },
} as const;

type Scheme = keyof typeof colorTokens;

function schemeVariables(scheme: Scheme): Record<string, string> {
  const t = colorTokens[scheme];
  // tokens.json 이름 그대로 --surface, --ink, --primary ... 로 노출 (bundle.css 와 동일)
  const own = Object.fromEntries(
    Object.entries(t).map(([name, value]) => [`--${name}`, value]),
  );
  return {
    ...own,
    // Mantine 기본 색 변수를 케어북 토큰에 연결
    "--mantine-color-body": "var(--surface)",
    "--mantine-color-text": "var(--ink)",
    "--mantine-color-bright": "var(--ink)",
    "--mantine-color-dimmed": "var(--ink-muted)",
    "--mantine-color-placeholder": "var(--ink-subtle)",
    "--mantine-color-anchor": "var(--info)",
    "--mantine-color-error": "var(--danger)",
    "--mantine-color-success": "var(--success)",
    "--mantine-color-default": "var(--surface-raised)",
    "--mantine-color-default-hover": "var(--surface-sunken)",
    "--mantine-color-default-color": "var(--ink)",
    "--mantine-color-default-border": "var(--line-strong)",
    "--mantine-color-disabled": "var(--surface-sunken)",
    "--mantine-color-disabled-color": "var(--ink-subtle)",
    "--mantine-color-disabled-border": "var(--line)",
    // primary: 테마 단계 배열 대신 토큰으로 직접 지정 (다크에서 hover 가 더 밝아지기 때문)
    "--mantine-primary-color-filled": "var(--primary)",
    "--mantine-primary-color-filled-hover": "var(--primary-hover)",
    "--mantine-primary-color-light": "var(--primary-soft)",
    "--mantine-primary-color-light-hover": "var(--primary-soft)",
    "--mantine-primary-color-light-color": "var(--primary-strong)",
    "--mantine-primary-color-contrast": "var(--on-primary)",
    "--mantine-color-primary-filled": "var(--primary)",
    "--mantine-color-primary-filled-hover": "var(--primary-hover)",
    "--mantine-color-primary-light": "var(--primary-soft)",
    "--mantine-color-primary-light-hover": "var(--primary-soft)",
    "--mantine-color-primary-light-color": "var(--primary-strong)",
    "--mantine-color-primary-text": "var(--primary-strong)",
    "--mantine-color-primary-outline": "var(--primary-strong)",
    "--mantine-color-primary-outline-hover": "var(--primary-soft)",
    // 그림자: 라이트/다크 값이 달라 scheme 별로 지정
    "--mantine-shadow-xs": "var(--shadow-card)",
    "--mantine-shadow-sm": "var(--shadow-card)",
    "--mantine-shadow-md": "var(--shadow-dialog)",
    "--mantine-shadow-lg": "var(--shadow-dialog)",
    "--mantine-shadow-xl": "var(--shadow-dialog)",
  };
}

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  // 색 이외의 공통 토큰 (tokens.json spacing / radius / size / type)
  variables: {
    "--font-sans": FONT_SANS,
    "--space-1": "4px",
    "--space-2": "8px",
    "--space-3": "12px",
    "--space-4": "16px",
    "--space-5": "24px",
    "--space-6": "32px",
    "--space-8": "48px",
    "--radius-sm": "6px",
    "--radius-md": "10px",
    "--radius-lg": "16px",
    "--radius-pill": "999px",
    "--control-md": "44px",
    "--control-lg": "52px",
    "--content-max": "640px",
    "--content-wide": "1200px",
    "--sidebar": "248px",
    "--border-selected": "1.5px",
  },
  light: schemeVariables("light"),
  dark: schemeVariables("dark"),
});

export const theme = createTheme({
  primaryColor: "primary",
  colors: { primary },
  primaryShade: { light: 4, dark: 3 },
  // 노랑 위 글자는 on-primary(#111418). black 을 ink 로 두고 autoContrast 가 검정 글자를 고르게 한다.
  black: "#111418",
  white: "#ffffff",
  autoContrast: true,

  fontFamily: FONT_SANS,
  headings: {
    fontFamily: FONT_SANS,
    fontWeight: "700",
    sizes: {
      h1: { fontSize: "32px", lineHeight: "42px", fontWeight: "700" }, // display
      h2: { fontSize: "22px", lineHeight: "30px", fontWeight: "700" }, // title
      h3: { fontSize: "18px", lineHeight: "26px", fontWeight: "600" }, // subtitle
      h4: { fontSize: "16px", lineHeight: "26px", fontWeight: "600" }, // body-strong
      h5: { fontSize: "14px", lineHeight: "20px", fontWeight: "600" }, // label
      h6: { fontSize: "12px", lineHeight: "16px", fontWeight: "500" }, // caption
    },
  },
  fontSizes: {
    xs: "12px", // caption
    sm: "14px", // body-sm / label
    md: "16px", // body
    lg: "18px", // subtitle
    xl: "22px", // title
  },
  lineHeights: {
    xs: "16px",
    sm: "22px",
    md: "26px",
    lg: "26px",
    xl: "30px",
  },
  fontWeights: { regular: "400", medium: "600", bold: "700" },

  spacing: {
    xs: "8px", // space-2
    sm: "12px", // space-3
    md: "16px", // space-4
    lg: "24px", // space-5
    xl: "32px", // space-6
  },
  radius: {
    xs: "6px", // radius-sm
    sm: "6px", // radius-sm
    md: "10px", // radius-md
    lg: "16px", // radius-lg
    xl: "999px", // radius-pill
  },
  defaultRadius: "md",
  shadows: {
    xs: colorTokens.light["shadow-card"],
    sm: colorTokens.light["shadow-card"],
    md: colorTokens.light["shadow-dialog"],
    lg: colorTokens.light["shadow-dialog"],
    xl: colorTokens.light["shadow-dialog"],
  },

  focusRing: "auto",
  // 포커스 링 색(--focus)과 버튼/입력 높이는 src/styles/_mantine-overrides.scss 에서 처리한다.
  other: {
    contentMax: "640px",
    contentWide: "1200px",
    sidebar: "248px",
  },
});
