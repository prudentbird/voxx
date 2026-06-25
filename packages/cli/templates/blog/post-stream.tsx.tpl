"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { PostMeta, VoxxConfig } from "@prudentbird/voxx-core";
import { PostCard } from "./_post-card";

export function PostStream({
  children,
  initialCount,
  total,
  perBatch,
  endpoint,
  tag,
  config,
}: {
  /** Server-rendered first batch — already in the initial HTML. */
  children: ReactNode;
  initialCount: number;
  total: number;
  perBatch: number;
  /** Route that returns a metadata slice, e.g. `/blog/posts`. */
  endpoint: string;
  /** Active tag filter, forwarded to the endpoint. */
  tag?: string;
  config: VoxxConfig;
}) {
  const [appended, setAppended] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLLIElement | null>(null);

  const loaded = initialCount + appended.length;
  const hasMore = loaded < total;

  const fetchBatch = useCallback(
    async (offset: number) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          offset: String(offset),
          limit: String(perBatch),
        });
        if (tag) params.set("tag", tag);
        const res = await fetch(`${endpoint}?${params.toString()}`);
        if (!res.ok) return;
        const batch = (await res.json()) as PostMeta[];
        setAppended((prev) => [...prev, ...batch]);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [endpoint, perBatch, tag],
  );

  // Load the next batch when the sentinel scrolls into view.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchBatch(loaded);
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchBatch, hasMore, loaded]);

  return (
    <ul className="voxx-postlist">
      {children}
      {appended.map((post) => (
        <PostCard key={post.slug} post={post} config={config} />
      ))}
      {hasMore ? (
        <li
          ref={sentinelRef}
          className="voxx-postlist__sentinel"
          aria-hidden="true"
        />
      ) : null}
      {loading ? (
        <li className="voxx-postlist__status" role="status">
          Loading…
        </li>
      ) : null}
    </ul>
  );
}
