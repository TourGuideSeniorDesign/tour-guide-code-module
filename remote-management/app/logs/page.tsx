"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Log = {
  id: number;
  source: string;
  level: string;
  message: string;
  timestamp: string;
};

type Page = { logs: Log[]; next_cursor: number | null; has_more: boolean };

const levelColor: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  debug: "bg-gray-100 text-gray-800",
};

export default function LogsPage() {
  const [source, setSource] = useState("");
  const [level, setLevel] = useState("");
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    async (cursor?: number) => {
      const sp = new URLSearchParams();
      if (cursor) sp.set("cursor", String(cursor));
      if (source) sp.set("source", source);
      if (level) sp.set("level", level);
      const res = await fetch(`/api/logs?${sp}`, { cache: "no-store" });
      return (await res.json()) as Page;
    },
    [source, level],
  );

  // Reset and poll head whenever filters change.
  useEffect(() => {
    let cancelled = false;
    setPages([]);
    setDone(false);

    const poll = async () => {
      const head = await fetchPage();
      if (!cancelled) {
        setPages((prev) => [head, ...prev.slice(1)]);
        setDone(!head.has_more);
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    const last = pages[pages.length - 1];
    if (!last?.has_more || !last.next_cursor) {
      setDone(true);
      return;
    }
    setLoading(true);
    try {
      const next = await fetchPage(last.next_cursor);
      setPages((prev) => [...prev, next]);
      if (!next.has_more) setDone(true);
    } finally {
      setLoading(false);
    }
  }, [pages, loading, done, fetchPage]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const allLogs = pages.flatMap((p) => p.logs);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Logs</h1>
      <div className="flex gap-4">
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Sources</option>
          <option value="application">Application</option>
          <option value="microcontroller">Microcontroller</option>
        </select>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All Levels</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {allLogs.length === 0 ? (
          <div className="p-4 text-gray-500">No logs found</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Time</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Source</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Level</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">{log.source}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          levelColor[log.level] ?? "bg-gray-100"
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div ref={loadMoreRef} className="p-4 text-center text-sm text-gray-400">
              {loading
                ? "Loading more..."
                : done
                  ? "No more logs"
                  : "Scroll for more"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
