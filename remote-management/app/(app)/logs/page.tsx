"use client";

import { Filter, ScrollText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";

type Log = {
  id: number;
  source: string;
  level: string;
  message: string;
  timestamp: string;
};

type Page = { logs: Log[]; next_cursor: number | null; has_more: boolean };

const levelVariant: Record<
  string,
  "info" | "warning" | "error" | "secondary"
> = {
  info: "info",
  warning: "warning",
  error: "error",
  debug: "secondary",
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
      <div className="flex items-center gap-2">
        <ScrollText className="h-6 w-6 text-(--color-muted-foreground)" />
        <h1 className="text-2xl font-bold tracking-tight">Logs</h1>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-(--color-muted-foreground)">
            <Filter className="h-3 w-3" />
            Filter
          </div>
          <Select
            value={source}
            onChange={setSource}
            options={[
              { value: "", label: "All sources" },
              { value: "application", label: "Application" },
              { value: "microcontroller", label: "Microcontroller" },
            ]}
          />
          <Select
            value={level}
            onChange={setLevel}
            options={[
              { value: "", label: "All levels" },
              { value: "info", label: "Info" },
              { value: "warning", label: "Warning" },
              { value: "error", label: "Error" },
              { value: "debug", label: "Debug" },
            ]}
          />
          <div className="ml-auto text-xs text-(--color-muted-foreground)">
            {allLogs.length} entries
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {allLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-(--color-muted-foreground)">
            No logs found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-(--color-border) bg-(--color-secondary)">
                  <tr>
                    <Th>Time</Th>
                    <Th>Source</Th>
                    <Th>Level</Th>
                    <Th>Message</Th>
                  </tr>
                </thead>
                <tbody>
                  {allLogs.map((log, i) => (
                    <tr
                      key={log.id}
                      className={`border-b border-(--color-border) transition-colors hover:bg-(--color-secondary)/60 ${
                        i % 2 === 1 ? "bg-(--color-secondary)/30" : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs tabular-nums text-(--color-muted-foreground)">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className="rounded-md bg-(--color-secondary) px-2 py-0.5 font-mono text-(--color-foreground)">
                          {log.source}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={levelVariant[log.level] ?? "secondary"}
                          className="uppercase"
                        >
                          {log.level}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {log.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              ref={loadMoreRef}
              className="p-4 text-center text-xs text-(--color-muted-foreground)"
            >
              {loading
                ? "Loading more…"
                : done
                  ? "No more logs"
                  : "Scroll for more"}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-(--color-muted-foreground)">
      {children}
    </th>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-(--color-border) bg-(--color-card) px-2 text-xs text-(--color-foreground) shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--color-ring)"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
