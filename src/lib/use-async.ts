"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * key 가 바뀔 때마다 load 를 호출하는 조회 훅. 결과가 현재 key 의 것이 아니면 data 는 undefined(로딩 중).
 * 나중에 서버 조회로 바뀌면 이 훅을 쓰는 자리를 Server Component 의 await 나 use() 로 옮긴다.
 */
export function useAsync<T>(key: string, load: () => Promise<T>) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ key: string; data: T } | null>(null);
  const fullKey = `${key}#${version}`;

  useEffect(() => {
    let cancelled = false;
    load().then((data) => {
      if (!cancelled) setResult({ key: fullKey, data });
    });
    return () => {
      cancelled = true;
    };
    // load 는 key 로 식별되는 클로저다. key 가 같으면 다시 호출하지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const data = result && result.key === fullKey ? result.data : undefined;
  return { data, loading: data === undefined, reload };
}
