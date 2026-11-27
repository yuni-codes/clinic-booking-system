import { MOCK_LATENCY_MS } from "../mock/config";

/** mock 전용: 네트워크 지연 흉내. 백엔드 연동 시 호출부와 함께 삭제. */
export function latency(ms: number = MOCK_LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
