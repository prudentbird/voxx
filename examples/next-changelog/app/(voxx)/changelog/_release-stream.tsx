"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { VoxxConfig } from "@prudentbird/voxx-core";
import { ReleaseItem, type StreamRelease } from "./_release-item";

/** The release slug a URL hash points at, decoded defensively. */
function hashSlug(): string {
  const raw = window.location.hash.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

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
  /** Route that returns a rendered slice, e.g. `/changelog/api`. */
  endpoint: string;
  config: VoxxConfig;
}) {
  const [appended, setAppended] = useState<StreamRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const issuedForRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loaded = initialCount + appended.length;
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

  // Record the release a deep link points at, on load and on hash change.
  useEffect(() => {
    function jumpToHash() {
      const slug = hashSlug();
      if (slug) setScrollTarget(slug);
    }
    jumpToHash();
    window.addEventListener("hashchange", jumpToHash);
    return () => window.removeEventListener("hashchange", jumpToHash);
  }, []);

  // Resolve a deep-link target: scroll once it has rendered, otherwise fetch
  // everything up to it (once), and give up if it never turns up. Re-runs when a
  // load settles, so a target requested mid-fetch is not dropped.
  useEffect(() => {
    if (!scrollTarget) {
      issuedForRef.current = null;
      return;
    }
    const el = document.getElementById(scrollTarget);
    if (el) {
      el.scrollIntoView();
      setScrollTarget(null);
      issuedForRef.current = null;
      return;
    }
    if (loading) return;
    if (issuedForRef.current === scrollTarget) {
      // Already fetched up to this slug and it still isn't here — it doesn't exist.
      setScrollTarget(null);
      issuedForRef.current = null;
      return;
    }
    issuedForRef.current = scrollTarget;
    void load(
      new URLSearchParams({ offset: String(loaded), until: scrollTarget }),
    );
  }, [scrollTarget, appended, loading, loaded, load]);

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
