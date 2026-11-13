// 6. Scan your own site: a live, passive outside-in check of any domain, answered in Threat Owls' verdicts
// (Fix now, Review, Not enough data, Looks good) with why it matters and what to do. Logic: src/lib/scanner.js.
import { useMemo, useRef, useState } from 'react';
import { TRACK } from '../../brand/track.js';
import { VERDICTS, cleanHost, runScan } from '../../lib/scanner.js';
import { useKeepAlive } from '../EngineContext.jsx';
import { BuyLink, Lamp, useContent, useSectionId } from '../content.jsx';

const N_BARS = 72;
const MARK = { fix: '!', review: '~', unknown: '?', ok: '✓' };

// The meter: the page's own waveform, filled as the scan moves through its steps.
function Meter({ progress, running }) {
  const bars = useMemo(() => {
    const per = TRACK.env.length / N_BARS;
    return Array.from({ length: N_BARS }, (_, i) => {
      let m = 0;
      for (let k = Math.floor(i * per); k < Math.floor((i + 1) * per); k++) m = Math.max(m, TRACK.env[k]);
      return Math.max(8, m);
    });
  }, []);
  return (
    <div className={`scan-meter${running ? ' running' : ''}`} aria-hidden="true">
      {bars.map((h, i) => <i key={i} style={{ height: `${h}%` }} className={i / N_BARS < progress ? 'on' : undefined} />)}
      <b className="scan-head" style={{ left: `${(progress * 100).toFixed(2)}%` }} />
    </div>
  );
}

export default function Scanner() {
  const { scan } = useContent();
  const sid = useSectionId('demo');
  const section = useRef(null), input = useRef(null), results = useRef(null);
  useKeepAlive(section);
  const [host, setHost] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const [steps, setSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const TOTAL_STEPS = 6;

  const start = async (e, value) => {
    e?.preventDefault();
    const h = cleanHost(value ?? host);
    if (!h) { setError(scan.badHost); input.current.focus(); return; }
    setHost(h); setError(''); setPhase('running'); setResult(null); setSteps([]); setFilter('all');
    try {
      const r = await runScan(h, (s) => setSteps((list) => {
        const i = list.findIndex((x) => x.key === s.key);
        return i < 0 ? [...list, s] : list.map((x, k) => (k === i ? s : x));
      }));
      setResult(r); setPhase('done');
      setTimeout(() => results.current?.focus({ preventScroll: true }), 50);
    } catch { setError(scan.failed); setPhase('idle'); }
  };

  const done = steps.filter((s) => s.state === 'done').length;
  const progress = phase === 'done' ? 1 : phase === 'running' ? Math.min(0.97, (done + 0.5) / TOTAL_STEPS) : 0;
  const shown = result ? result.findings.filter((f) => filter === 'all' || f.verdict === filter) : [];
  const headline = !result ? '' : result.counts.fix ? (result.counts.fix === 1 ? scan.fix1 : scan.fixN.replace('{n}', result.counts.fix)) : result.counts.review ? (result.counts.review === 1 ? scan.review1 : scan.reviewN.replace('{n}', result.counts.review)) : scan.clean;

  return (
    <section className="ch ch-scan" id={sid} data-ch={sid} aria-labelledby="scan-h" ref={section}>
      <div className="scan-copy">
        <h2 id="scan-h">{scan.h2}</h2>
        <p>{scan.p}</p>
      </div>

      <form className="scan-form" onSubmit={start} noValidate>
        <label htmlFor="scan-host" className="vh">{scan.label}</label>
        <span className="scan-pre" aria-hidden="true">https://</span>
        <input id="scan-host" ref={input} type="text" inputMode="url" autoComplete="url" spellCheck="false" autoCapitalize="none"
          placeholder={scan.placeholder} value={host} onChange={(e) => setHost(e.target.value)} disabled={phase === 'running'} />
        <button className="btn" type="submit" disabled={phase === 'running'}>{phase === 'running' ? scan.scanning : scan.button}</button>
      </form>
      <p className="scan-hint">
        {error ? <span className="scan-err" role="alert">{error}</span> : <>{scan.note} <button type="button" className="scan-try" onClick={() => start(null, scan.example)} disabled={phase === 'running'}>{scan.tryExample.replace('{host}', scan.example)}</button></>}
      </p>

      <div className={`scan-board is-${phase}`}>
        <div className="scan-grade" aria-live="polite">
          <span className="scan-kicker"><Lamp className={phase === 'running' ? 'rec' : ''} />{phase === 'running' ? scan.live : result ? result.host : scan.idle}</span>
          <p className="scan-letter" data-grade={result?.grade || ''}>{result ? result.grade : phase === 'running' ? '…' : '?'}</p>
          <p className="scan-score">{result?.score != null ? <><b>{result.score}</b> / 100</> : scan.gradeHint}</p>
          {result && <p className="scan-headline">{headline}</p>}
        </div>
        <div className="scan-run">
          <Meter progress={progress} running={phase === 'running'} />
          <ol className="scan-log">
            {(steps.length ? steps : scan.idleSteps.map((label, i) => ({ key: i, label, state: 'idle' }))).map((s) => {
              const worst = s.found?.find((f) => f.verdict === 'fix') || s.found?.find((f) => f.verdict === 'review') || s.found?.find((f) => f.verdict === 'unknown');
              const v = s.state === 'done' ? (worst ? worst.verdict : 'ok') : s.state;
              return (
                <li key={s.key} className={`v-${v}`}>
                  <span className="scan-mark">{s.state === 'run' ? '' : s.state === 'idle' ? '·' : MARK[v]}</span>
                  <span>{s.label}</span>
                  <span className="scan-state">{s.state === 'run' ? scan.checking : s.state === 'done' ? (s.found?.length ? VERDICTS[v].label : scan.checked) : ''}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {result && (
        <div className="scan-results" ref={results} tabIndex={-1} aria-label={scan.resultsLabel}>
          <div className="scan-filter" role="group" aria-label={scan.filterLabel}>
            {['all', 'fix', 'review', 'unknown', 'ok'].map((v) => {
              const n = v === 'all' ? result.findings.length : result.counts[v];
              if (v !== 'all' && !n) return null;
              return <button key={v} type="button" className={`v-${v}`} aria-pressed={filter === v} onClick={() => setFilter(v)}>{v === 'all' ? scan.all : VERDICTS[v].label}<span>{n}</span></button>;
            })}
          </div>
          <ul className="scan-cards">
            {shown.map((f) => (
              <li key={f.id} className={`scan-card v-${f.verdict}`}>
                <p className="scan-tag"><span className="scan-chip">{VERDICTS[f.verdict].label}</span><span>{f.area} · {f.label}</span></p>
                <p className="scan-saw">{f.saw}</p>
                {f.verdict !== 'ok' && f.why && <p className="scan-why"><b>{scan.why}</b> {f.why}</p>}
                {f.verdict !== 'ok' && f.what && <p className="scan-what"><b>{scan.what}</b> {f.what}</p>}
              </li>
            ))}
          </ul>
          <div className="scan-cta">
            <p>{scan.outro}</p>
            <BuyLink>{scan.cta}</BuyLink>
          </div>
        </div>
      )}
    </section>
  );
}
