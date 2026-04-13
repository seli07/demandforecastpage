import { useState, useMemo } from "react";
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, ComposedChart, ReferenceLine, CartesianGrid } from "recharts";

const COLORS = {
  bg: "#0a0f1a",
  card: "#111827",
  cardBorder: "#1e293b",
  accent: "#22d3ee",
  accentDim: "#0e7490",
  warn: "#f59e0b",
  danger: "#ef4444",
  success: "#10b981",
  text: "#e2e8f0",
  textDim: "#64748b",
  grid: "#1e293b",
};

function generateForecastData(sparsity, seasonality) {
  const data = [];
  for (let i = 0; i < 52; i++) {
    const week = `W${String(i + 1).padStart(2, "0")}`;
    const base = 40 + Math.sin((i / 52) * Math.PI * 2 * seasonality) * 15;
    const noise = (1 - sparsity) * (Math.random() * 10 - 5) + sparsity * (Math.random() * 25 - 12);
    const actual = Math.max(0, Math.round(base + noise));
    const forecast = Math.round(base + Math.sin((i / 52) * Math.PI * 2 * seasonality) * 2);
    const ciWidth = 8 + sparsity * 20 + Math.random() * 5;
    data.push({
      week, actual: i < 40 ? actual : null, forecast,
      ciLow: Math.max(0, Math.round(forecast - ciWidth)),
      ciHigh: Math.round(forecast + ciWidth),
      isForecast: i >= 36,
    });
  }
  return data;
}

function generatePipelineMetrics(sparsity) {
  const cleanPct = 55 + sparsity * 15;
  const extractPct = 15;
  const modelPct = 15 - sparsity * 3;
  const deployPct = 100 - cleanPct - extractPct - modelPct;
  return {
    extraction: { pct: `${extractPct}%`, sources: "Multiple", challenge: "Schema drift, access barriers" },
    cleaning: { pct: `${cleanPct.toFixed(0)}%`, discrepancies: `${(12 + sparsity * 30).toFixed(0)}K+`, challenge: "Conflicts, gaps, duplicates" },
    modeling: { pct: `${modelPct.toFixed(0)}%`, trials: "200", challenge: "Per-segment tuning" },
    validation: { pct: `${deployPct.toFixed(0)}%`, mape: `${(8 + sparsity * 14).toFixed(1)}%`, coverage: `${(92 - sparsity * 8).toFixed(0)}%`, sparseSegments: Math.round(sparsity * 25) },
  };
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, padding: "14px 16px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || COLORS.accent, marginTop: 4, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function PipelineStep({ step, title, pct, details, active, onClick }) {
  const isActive = active === step;
  return (
    <div onClick={() => onClick(step)} style={{
      background: isActive ? `${COLORS.accent}11` : COLORS.card,
      border: `1px solid ${isActive ? COLORS.accent : COLORS.cardBorder}`,
      borderRadius: 8, padding: 16, cursor: "pointer", transition: "all 0.2s",
      flex: 1, minWidth: 200,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          background: isActive ? COLORS.accent : COLORS.cardBorder, color: isActive ? COLORS.bg : COLORS.textDim,
          fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
        }}>{step}</div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: isActive ? COLORS.accent : COLORS.text }}>{title}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: isActive ? COLORS.accent : COLORS.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{pct}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {Object.entries(details).map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: COLORS.textDim }}>{k}</span>
            <span style={{ color: COLORS.text, fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SliderControl({ label, value, onChange, min, max, step, format }) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 13, color: COLORS.accent, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: COLORS.accent, height: 4, cursor: "pointer" }} />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a2332", border: `1px solid ${COLORS.cardBorder}`, borderRadius: 6, padding: 12, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ color: COLORS.textDim, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => p.value != null && (
        <div key={i} style={{ color: p.color || COLORS.text, marginBottom: 2 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(0) : p.value}
        </div>
      ))}
    </div>
  );
};

const SEGMENTS = [
  { label: "Install — Fiber", color: "#22d3ee" },
  { label: "Repair — Fiber", color: "#818cf8" },
  { label: "Install — Copper/Legacy", color: "#a78bfa" },
  { label: "Repair — Copper/Legacy", color: "#f59e0b" },
  { label: "Maintenance / Other", color: "#64748b" },
];

export default function DemandForecastingDemo() {
  const [sparsity, setSparsity] = useState(0.3);
  const [seasonality, setSeasonality] = useState(1.5);
  const [activeStep, setActiveStep] = useState(1);
  const [regionCount, setRegionCount] = useState(100);

  const data = useMemo(() => generateForecastData(sparsity, seasonality), [sparsity, seasonality]);
  const metrics = useMemo(() => generatePipelineMetrics(sparsity), [sparsity]);
  const totalModels = useMemo(() => regionCount * SEGMENTS.length, [regionCount]);

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", padding: "24px 20px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: COLORS.accent, textTransform: "uppercase", letterSpacing: 3, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>Interactive Demo</div>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, fontFamily: "'Space Grotesk', sans-serif", background: `linear-gradient(135deg, ${COLORS.accent}, #818cf8)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Demand Forecasting Pipeline
        </h1>
        <p style={{ color: COLORS.textDim, fontSize: 15, marginTop: 8, maxWidth: 640, margin: "8px auto 0" }}>
          NeuralProphet with parallelized hyperparameter tuning — regional demand optimization across service segments
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 24, marginBottom: 28, flexWrap: "wrap", background: COLORS.card, borderRadius: 10, padding: 20, border: `1px solid ${COLORS.cardBorder}` }}>
        <SliderControl label="Data Sparsity" value={sparsity} onChange={setSparsity} min={0.1} max={0.9} step={0.1} format={v => `${(v * 100).toFixed(0)}%`} />
        <SliderControl label="Seasonality Strength" value={seasonality} onChange={setSeasonality} min={0.5} max={3} step={0.25} format={v => `${v.toFixed(2)}x`} />
        <SliderControl label="Regions" value={regionCount} onChange={setRegionCount} min={20} max={200} step={10} format={v => `${v}`} />
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        <MetricCard label="MAPE" value={metrics.validation.mape} sub="Mean Absolute % Error" color={parseFloat(metrics.validation.mape) > 15 ? COLORS.warn : COLORS.success} />
        <MetricCard label="CI Coverage" value={metrics.validation.coverage} sub="Prediction interval coverage" />
        <MetricCard label="Sparse Segments" value={metrics.validation.sparseSegments} sub={`of ${totalModels} total models`} color={metrics.validation.sparseSegments > 15 ? COLORS.warn : COLORS.text} />
        <MetricCard label="HP Trials" value="200" sub="Optuna per model segment" />
      </div>

      {/* Forecast Chart */}
      <div style={{ background: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.cardBorder}`, padding: "20px 16px", marginBottom: 28 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Demand — Weekly Forecast (Single Segment View)</div>
        <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 16 }}>
          Shaded region = {(sparsity * 100).toFixed(0)}% sparsity confidence interval · Dashed line = forecast horizon start
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: COLORS.textDim }} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: COLORS.textDim }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x="W37" stroke={COLORS.warn} strokeDasharray="5 5" label={{ value: "Forecast →", fill: COLORS.warn, fontSize: 10 }} />
            <Area type="monotone" dataKey="ciHigh" stackId="ci" stroke="none" fill="transparent" />
            <Area type="monotone" dataKey="ciLow" stackId="ci2" stroke="none" fill={`${COLORS.accent}22`} />
            <Line type="monotone" dataKey="forecast" stroke={COLORS.accent} strokeWidth={2} dot={false} name="Forecast" />
            <Line type="monotone" dataKey="actual" stroke="#818cf8" strokeWidth={1.5} dot={{ r: 2, fill: "#818cf8" }} name="Actual" connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 12, fontSize: 11 }}>
          <span><span style={{ display: "inline-block", width: 12, height: 3, background: "#818cf8", marginRight: 6, verticalAlign: "middle" }} />Actual</span>
          <span><span style={{ display: "inline-block", width: 12, height: 3, background: COLORS.accent, marginRight: 6, verticalAlign: "middle" }} />Forecast</span>
          <span><span style={{ display: "inline-block", width: 12, height: 8, background: `${COLORS.accent}22`, marginRight: 6, verticalAlign: "middle", border: `1px solid ${COLORS.accent}44` }} />Confidence Interval</span>
        </div>
      </div>

      {/* Model Segmentation */}
      <div style={{ background: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.cardBorder}`, padding: 20, marginBottom: 28 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Model Segmentation — Each Region × Work Type</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 2 }}>
            {regionCount} regions × {SEGMENTS.length} segments = <span style={{ color: COLORS.accent, fontWeight: 700 }}>{totalModels} independent models</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, height: 36, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
          {SEGMENTS.map((s, i) => {
            const pcts = [30, 25, 18, 20, 7];
            return (
              <div key={s.label} style={{ width: `${pcts[i]}%`, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: COLORS.bg, minWidth: 0, overflow: "hidden" }}>
                {pcts[i] >= 15 ? `${pcts[i]}%` : ""}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11 }}>
          {SEGMENTS.map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              <span style={{ color: COLORS.textDim }}>{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 12, fontStyle: "italic", lineHeight: 1.5 }}>
          Segments shown are for telecom dispatch. In other industries, segmentation might be by product line, route type, service tier, customer class, or any operational dimension that drives distinct demand patterns. Each segment gets its own independently tuned NeuralProphet model.
        </div>
      </div>

      {/* Pipeline Steps */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>End-to-End Pipeline — % of Total Effort (Click to Explore)</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <PipelineStep step={1} title="Data Extraction" pct={metrics.extraction.pct} active={activeStep} onClick={setActiveStep}
            details={{ Sources: metrics.extraction.sources, Challenge: metrics.extraction.challenge }} />
          <PipelineStep step={2} title="Cleaning & Validation" pct={metrics.cleaning.pct} active={activeStep} onClick={setActiveStep}
            details={{ Discrepancies: metrics.cleaning.discrepancies, Challenge: metrics.cleaning.challenge }} />
          <PipelineStep step={3} title="NeuralProphet Modeling" pct={metrics.modeling.pct} active={activeStep} onClick={setActiveStep}
            details={{ "HP Trials": metrics.modeling.trials, "Total Models": `${totalModels}`, Parallelism: "GPU workers" }} />
          <PipelineStep step={4} title="Forecast & Deploy" pct={metrics.validation.pct} active={activeStep} onClick={setActiveStep}
            details={{ MAPE: metrics.validation.mape, "CI Coverage": metrics.validation.coverage }} />
        </div>
      </div>

      {/* Key Insight */}
      <div style={{ background: `${COLORS.warn}0d`, border: `1px solid ${COLORS.warn}33`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.warn, marginBottom: 6 }}>Key Insight: Data Quality Dominates the Timeline</div>
        <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7 }}>
          At <strong>{(sparsity * 100).toFixed(0)}% sparsity</strong>, data cleaning and validation consumes <strong>{metrics.cleaning.pct}</strong> of total pipeline effort.
          Sparse segments produce wider confidence intervals (±{(8 + sparsity * 20).toFixed(0)} units) — this is honest uncertainty, not model failure.
          The NeuralProphet hyperparameter tuning across all {totalModels} model segments uses parallelized Optuna trials with GPU workers.
        </div>
      </div>

      {/* Delivery Time Split */}
      <div style={{ background: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.cardBorder}`, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Time-of-Delivery Distribution (Example)</div>
        <div style={{ display: "flex", gap: 4, height: 32, borderRadius: 6, overflow: "hidden" }}>
          {[
            { label: "Morning", pct: 35, color: "#22d3ee" },
            { label: "Midday", pct: 28, color: "#818cf8" },
            { label: "Afternoon", pct: 25, color: "#a78bfa" },
            { label: "Evening", pct: 12, color: "#6366f1" },
          ].map(s => (
            <div key={s.label} style={{ width: `${s.pct}%`, background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: COLORS.bg }}>
              {s.pct}%
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: COLORS.textDim, justifyContent: "center", flexWrap: "wrap" }}>
          {["Morning 6-10am", "Midday 10am-1pm", "Afternoon 1-5pm", "Evening 5-8pm"].map(l => <span key={l}>{l}</span>)}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ background: `${COLORS.cardBorder}44`, borderRadius: 10, padding: 20, marginBottom: 20, borderLeft: `3px solid ${COLORS.textDim}` }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textDim, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Important Context</div>
        <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.8 }}>
          <strong style={{ color: COLORS.text }}>Timelines vary dramatically by client.</strong> The percentages above reflect relative effort — not absolute durations. In organizations with weak data governance, the extraction and cleaning phase alone can stretch to <strong style={{ color: COLORS.warn }}>weeks or even months</strong>. Data is often siloed across teams, undocumented, or exists only as institutional knowledge held by individuals. Getting access to the right data — and understanding what it actually represents — requires persistent cross-team relationship-building, not just SQL queries. You may spend significant time simply learning who owns what data and convincing them to share it.
        </div>
        <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.8, marginTop: 12 }}>
          <strong style={{ color: COLORS.text }}>All numbers are illustrative.</strong> Every deployment is different. The number of regions, how models are subdivided (by work type, media, geography, product line), the volume of data discrepancies, and the overall data landscape are unique to each client and industry. This demo shows the pipeline methodology and the reality of the work — not any specific engagement.
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: 16, fontSize: 11, color: COLORS.textDim }}>
        Built by Sravan · NeuralProphet + Optuna + Conformal Prediction Intervals · Demand Forecasting
      </div>
    </div>
  );
}
