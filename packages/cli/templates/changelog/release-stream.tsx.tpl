"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { VoxxConfig } from "@prudentbird/voxx-core";
import { ReleaseItem, type StreamRelease } from "./_release-item";

export function ReleaseStream({
  children,
  initialCount,
  total,
  perBatch,
  endpoint,
  config,
}: {
  /** Server-rendered first batch — already in the initial HTML. */
  children: ReactNode;
  initialCount: number;
  total: number;
  perBatch: number;
  /** Route that returns a rendered slice, e.g. `/changelog/releases`. */
  endpoint: string;
  config: VoxxConfig;
}) {
  const [appended, setAppended] = useState<StreamRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loaded = initialCount + appended.length;
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;
  const hasMore = loaded < total;

  const load = useCallback(
    async (params: URLSearchParams) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const res = await fetch(`${endpoint}?${params.toString()}`);
        if (!res.ok) return;
        const batch = (await res.json()) as StreamRelease[];
        if (batch.length > 0) setAppended((prev) => [...prev, ...batch]);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [endpoint],
  );

  // Load the next batch when the sentinel scrolls into view.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void load(
            new URLSearchParams({
              offset: String(loaded),
              limit: String(perBatch),
            }),
          );
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [load, hasMore, loaded, perBatch]);

  // Deep links: when the URL targets a release that isn't loaded yet, ask the
  // endpoint for everything up to it in one request, then scroll once rendered.
  useEffect(() => {
    function jumpToHash() {
      const slug = decodeURIComponent(window.location.hash.slice(1));
      if (!slug) return;
      if (document.getElementById(slug)) {
        document.getElementById(slug)?.scrollIntoView();
        return;
      }
      setScrollTarget(slug);
      void load(
        new URLSearchParams({ offset: String(loadedRef.current), until: slug }),
      );
    }
    jumpToHash();
    window.addEventListener("hashchange", jumpToHash);
    return () => window.removeEventListener("hashchange", jumpToHash);
  }, [load]);

  // Once a deep-link target has rendered, scroll to it.
  useEffect(() => {
    if (!scrollTarget) return;
    const el = document.getElementById(scrollTarget);
    if (el) {
      el.scrollIntoView();
      setScrollTarget(null);
    }
  }, [scrollTarget, appended]);

  return (
    <div className="voxx-releases">
      {children}
      {appended.map((post) => (
        <ReleaseItem key={post.slug} post={post} config={config} />
      ))}
      {hasMore ? (
        <div
          ref={sentinelRef}
          className="voxx-releases__sentinel"
          aria-hidden="true"
        />
      ) : null}
      {loading ? (
        <p className="voxx-releases__status" role="status">
          Loading…
        </p>
      ) : null}
    </div>
  );
}
