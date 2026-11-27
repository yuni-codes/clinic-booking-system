import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import "@mantine/core/styles.css";
import "./globals.scss";
import { Providers } from "./providers";

// 한글 글리프는 unicode-range 로 분할 로드되고, preload 는 latin 만 한다.
const ibmPlexSansKr = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-ibm-plex-sans-kr", // src/theme.ts 의 FONT_VARIABLE 과 동일해야 함
});

export const metadata: Metadata = {
  title: "병원 예약 시스템",
  description: "병원 진료 예약 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={ibmPlexSansKr.variable}
      {...mantineHtmlProps}
    >
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
