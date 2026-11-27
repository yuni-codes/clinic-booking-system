/** 클래스 이름 합치기 (falsy 값 제외) */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(" ");
}
