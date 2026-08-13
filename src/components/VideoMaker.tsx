'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type RenderOutput = {
  profile: string;
  width: number;
  height: number;
  durationSeconds: number;
  downloadUrl: string | null;
};

type RenderHistoryItem = {
  jobId: string;
  projectId: string;
  title: string;
  completedAt: string;
  outputs: RenderOutput[];
};

type JobPayload = {
  status?: string;
  error?: string;
  detail?: string;
  outcome?: {
    status: string;
    outputs: RenderOutput[];
    errorMessage?: string;
    log?: string[];
  };
};

const HISTORY_KEY = 'faceless_studio_render_history_v1';
const WORKSPACE_KEY = 'faceless_studio_workspace_id_v1';

function id(prefix: string): string {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now()}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${value}`;
}

export default function VideoMaker() {
  const [workspaceId, setWorkspaceId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('Untitled faceless video');
  const [durationMinutes, setDurationMinutes] = useState(8);
  const [shortsCount, setShortsCount] = useState(1);
  const [storyboardScenes, setStoryboardScenes] = useState(8);
  const [style, setStyle] = useState<'cinematic' | 'cinematic-clean' | 'punchy' | 'documentary'>('cinematic-clean');
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState('idle');
  const [outcome, setOutcome] = useState<JobPayload['outcome']>();
  const [error, setError] = useState<string | null>(null);
  const storedJobRef = useRef<string | null>(null);

  useEffect(() => {
    const existing = localStorage.getItem(WORKSPACE_KEY);
    const workspace = existing || id('ws');
    if (!existing) localStorage.setItem(WORKSPACE_KEY, workspace);
    setWorkspaceId(workspace);
    setProjectId(id('project'));
  }, []);

  useEffect(() => {
    if (!jobId || jobStatus === 'completed' || jobStatus === 'failed') return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/render/jobs/${encodeURIComponent(jobId)}`, { cache: 'no-store' });
        const data = (await response.json()) as JobPayload;
        if (cancelled) return;
        if (!response.ok) {
          if (response.status !== 404) setError(data.detail || data.error || 'Render status is unavailable.');
          return;
        }
        const nextStatus = data.outcome?.status || data.status || 'queued';
        setJobStatus(nextStatus);
        if (data.outcome) setOutcome(data.outcome);
        if (nextStatus === 'failed') {
          setError(data.outcome?.errorMessage || 'Render failed. Check the worker logs.');
          setBusy(false);
        }
        if (nextStatus === 'completed') {
          setBusy(false);
          if (storedJobRef.current !== jobId && data.outcome) {
            const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as RenderHistoryItem[];
            const next: RenderHistoryItem[] = [
              {
                jobId,
                projectId,
                title,
                completedAt: new Date().toISOString(),
                outputs: data.outcome.outputs
              },
              ...history.filter((item) => item.jobId !== jobId)
            ].slice(0, 30);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
            storedJobRef.current = jobId;
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Render status request failed.');
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [jobId, jobStatus, projectId, title]);

  const visualCount = useMemo(
    () => files.filter((file) => file.type.startsWith('video/') || file.type.startsWith('image/') || /\.(mp4|mov|webm|mkv|jpg|jpeg|png|webp)$/i.test(file.name)).length,
    [files]
  );

  async function uploadSelectedFiles(): Promise<string[]> {
    const uploadedNames: string[] = [];
    for (const file of files) {
      const form = new FormData();
      form.set('userId', workspaceId);
      form.set('projectId', projectId);
      form.set('file', file);
      const response = await fetch('/api/assets/upload', { method: 'POST', body: form });
      const body = await response.json() as { ok?: boolean; error?: string; detail?: string };
      if (!response.ok || !body.ok) {
        throw new Error(`${file.name}: ${body.detail || body.error || 'upload failed'}`);
      }
      uploadedNames.push(file.name);
      setUploaded((current) => current.includes(file.name) ? current : [...current, file.name]);
    }
    return uploadedNames;
  }

  async function startRender() {
    setError(null);
    setOutcome(undefined);
    if (!workspaceId || !projectId) return setError('Workspace is still initializing.');
    if (title.trim().length < 2) return setError('Give the video a title.');
    if (files.length === 0 && uploaded.length === 0) return setError('Add at least one video or image asset.');
    if (files.length > 0 && visualCount === 0 && uploaded.length === 0) return setError('At least one visual asset is required.');

    setBusy(true);
    setJobStatus('uploading');
    try {
      if (files.length > 0) await uploadSelectedFiles();
      setJobStatus('queueing');
      const response = await fetch('/api/render/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: workspaceId,
          projectId,
          title: title.trim(),
          durationMinutes,
          shortsCount,
          storyboardScenes,
          style
        })
      });
      const data = await response.json() as { job?: { id: string; status: string }; error?: string; detail?: string };
      if (!response.ok || !data.job) throw new Error(data.detail || data.error || 'Could not queue render.');
      storedJobRef.current = null;
      setJobId(data.job.id);
      setJobStatus(data.job.status || 'queued');
    } catch (err) {
      setBusy(false);
      setJobStatus('failed');
      setError(err instanceof Error ? err.message : 'Render request failed.');
    }
  }

  function newProject() {
    setProjectId(id('project'));
    setFiles([]);
    setUploaded([]);
    setJobId(null);
    setJobStatus('idle');
    setOutcome(undefined);
    setError(null);
    setTitle('Untitled faceless video');
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="card flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-signal-500">Render Studio</p>
            <h2 className="mt-1 text-2xl font-semibold">Make the actual video</h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-300">Upload footage, stills, narration, and captions. The FFmpeg worker builds the long-form master, vertical exports, square preview, and thumbnail.</p>
          </div>
          <button className="tag hover:border-signal-500" onClick={newProject} type="button">New project</button>
        </div>

        <label className="grid gap-2 text-sm">
          <span className="font-medium">Video title</span>
          <input className="rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 outline-none focus:border-signal-500" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-2 text-xs text-ink-300">Target minutes
            <input className="rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-ink-50" type="number" min={1} max={60} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} />
          </label>
          <label className="grid gap-2 text-xs text-ink-300">Storyboard scenes
            <input className="rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-ink-50" type="number" min={1} max={40} value={storyboardScenes} onChange={(event) => setStoryboardScenes(Number(event.target.value))} />
          </label>
          <label className="grid gap-2 text-xs text-ink-300">Short exports
            <input className="rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-ink-50" type="number" min={0} max={10} value={shortsCount} onChange={(event) => setShortsCount(Number(event.target.value))} />
          </label>
          <label className="grid gap-2 text-xs text-ink-300">Pacing
            <select className="rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-ink-50" value={style} onChange={(event) => setStyle(event.target.value as typeof style)}>
              <option value="cinematic-clean">Cinematic clean</option>
              <option value="cinematic">Cinematic</option>
              <option value="punchy">Punchy</option>
              <option value="documentary">Documentary</option>
            </select>
          </label>
        </div>

        <label className="grid cursor-pointer gap-2 rounded-xl border border-dashed border-ink-700 p-5 hover:border-signal-500">
          <span className="font-medium">Add production assets</span>
          <span className="text-xs text-ink-300">Video: MP4/MOV/WebM. Stills: JPG/PNG/WebP. Narration: MP3/WAV/M4A. Captions: SRT/VTT. Put “music” in an audio filename to mark it as a music bed.</span>
          <input className="text-sm" type="file" multiple accept="video/*,image/*,audio/*,.srt,.vtt" onChange={(event) => setFiles(Array.from(event.target.files || []))} />
        </label>

        {(files.length > 0 || uploaded.length > 0) && (
          <div className="rounded-lg border border-ink-800 p-3 text-xs text-ink-300">
            <p>{files.length} selected · {visualCount} visual · {uploaded.length} uploaded to this project</p>
            <p className="mt-1 break-all font-mono text-[10px]">Project: {projectId || 'initializing'}</p>
          </div>
        )}

        <button className="rounded-lg bg-signal-500 px-5 py-3 font-semibold text-ink-950 disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || !workspaceId} onClick={() => void startRender()} type="button">
          {busy ? `Working · ${jobStatus}` : uploaded.length > 0 && files.length === 0 ? 'Render uploaded assets' : 'Upload & render video'}
        </button>
        {error && <div className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}
      </div>

      <div className="card flex flex-col gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-signal-500">Render state</p>
          <h2 className="mt-1 text-xl font-semibold capitalize">{jobStatus.replace(/_/g, ' ')}</h2>
          {jobId && <p className="mt-1 break-all font-mono text-[10px] text-ink-300">{jobId}</p>}
        </div>
        {!jobId && <p className="text-sm text-ink-300">Your completed export links appear here. Rendering works independently of YouTube OAuth.</p>}
        {outcome?.outputs && outcome.outputs.length > 0 && (
          <div className="grid gap-3">
            {outcome.outputs.map((output) => (
              <div key={`${output.profile}-${output.width}`} className="rounded-lg border border-ink-800 p-3">
                <p className="text-sm font-semibold">{output.profile}</p>
                <p className="mt-1 text-xs text-ink-300">{output.width} × {output.height}</p>
                {output.downloadUrl ? (
                  <a className="mt-3 inline-flex rounded-md border border-signal-500 px-3 py-2 text-xs font-semibold text-signal-500 hover:bg-signal-500 hover:text-ink-950" href={output.downloadUrl}>Download</a>
                ) : <p className="mt-2 text-xs text-ink-300">Output is outside the configured download root.</p>}
              </div>
            ))}
          </div>
        )}
        {outcome?.log && outcome.log.length > 0 && (
          <details className="text-xs text-ink-300">
            <summary className="cursor-pointer">Worker log</summary>
            <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-950 p-3">{outcome.log.join('\n')}</pre>
          </details>
        )}
      </div>
    </section>
  );
}
