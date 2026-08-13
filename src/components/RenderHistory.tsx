'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type RenderOutput = {
  profile: string;
  width: number;
  height: number;
  downloadUrl: string | null;
};

type RenderHistoryItem = {
  jobId: string;
  projectId: string;
  title: string;
  completedAt: string;
  outputs: RenderOutput[];
};

const HISTORY_KEY = 'faceless_studio_render_history_v1';

export default function RenderHistory() {
  const [items, setItems] = useState<RenderHistoryItem[]>([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as RenderHistoryItem[]);
    } catch {
      setItems([]);
    }
  }, []);

  if (items.length === 0) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold">No completed renders yet</h2>
        <p className="mt-2 text-sm text-ink-300">The old demo cards are gone. Completed renders from this browser appear here after the worker finishes them.</p>
        <Link href="/studio" className="mt-4 inline-flex rounded-md border border-signal-500 px-3 py-2 text-xs font-semibold text-signal-500 hover:bg-signal-500 hover:text-ink-950">Open Studio</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <article key={item.jobId} className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-signal-500">Completed render</p>
              <h2 className="mt-1 text-lg font-semibold">{item.title}</h2>
              <p className="mt-1 text-xs text-ink-300">{new Date(item.completedAt).toLocaleString()}</p>
            </div>
            <p className="font-mono text-[10px] text-ink-300">{item.jobId}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.outputs.map((output) => output.downloadUrl ? (
              <a key={`${item.jobId}-${output.profile}`} className="tag hover:border-signal-500" href={output.downloadUrl}>
                {output.profile} · {output.width}×{output.height}
              </a>
            ) : null)}
          </div>
        </article>
      ))}
    </div>
  );
}
