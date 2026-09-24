import { useEffect, useState } from "react";
import {
  CalendarRange, Search as SearchIcon, Navigation, MapPin, X,
  Layers3, ArrowLeftRight, Satellite, Radio
} from "lucide-react";
import {
  LineChart as ReLine, Line, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, BarChart as RBar, Bar
} from "recharts";
import { api } from "../api/client.js";
import { Alert, Badge, SectionTitle, StatCard } from "../components/ui.jsx";
import MapView from "../components/MapView.jsx";

function isoDate(daysAgo = 0) {
  const d = new Date(Date.now() - daysAgo * 86400e3);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

const INDEXES = [
  { id: "auto", label: "Auto — SAR intensity" },
  { id: "ndvi", label: "NDVI — vegetation" },
  { id: "ndwi", label: "NDWI — water" },
  { id: "ndbi", label: "NDBI — built-up" }
];

export default function ChangeDetect() {
  const [data, setData] = useState(null);
  const [custom, setCustom] = useState(null); // { name, latitude, longitude }
  const [locName, setLocName] = useState("Punjab");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [before, setBefore] = useState(isoDate(540));
  const [after, setAfter] = useState(isoDate(120));
  const [index, setIndex] = useState("auto");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  // Debounced place-name -> coordinates search (Open-Meteo geocoding).
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/api/realtime/geocode?q=${encodeURIComponent(q)}&limit=5`);
        setSuggestions(res.results || []);
      } catch {
        setSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const run = async (override = null) => {
    if (running) return;
    setRunning(true);
    setError("");
    try {
      const p = new URLSearchParams();
      p.set("before", before);
      p.set("after", after);
      p.set("index", index);
      if (override) {
        p.set("lat", override.latitude);
        p.set("lng", override.longitude);
        p.set("location", override.name);
      } else if (custom) {
        p.set("lat", custom.latitude);
        p.set("lng", custom.longitude);
        p.set("location", custom.name);
      } else if (locName.trim()) {
        p.set("location", locName.trim());
      }
      const res = await api.get(`/api/geospatial/compare?${p}`);
      setData(res);
      if (!custom && !override && res && res.location) setLocName(res.location);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Device location is not available in this browser. Search for a city instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const target = { name: "My location", latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCustom(target);
        run(target);
      },
      () => setError("Could not access your device location. Search for a city instead.")
    );
  };

  const pickSuggestion = r => {
    setCustom({ name: r.label || r.name, latitude: r.latitude, longitude: r.longitude });
    setSearch("");
    setSuggestions([]);
  };

  const clearCustom = () => {
    setCustom(null);
    setLocName("Punjab");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="animate-fade-up">
        <div className="section-kicker">Satellite change intelligence</div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Before / After <span className="gradient-text">Satellite Comparison</span>
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Compare satellite "scenes" between two dates — pick any location, a
          before date and an after date, and see what changed: aligned
          before/after maps, a change mask (expansion vs reduction) and true
          geometric statistics. Uses the deterministic demo engine and is
          clearly labelled simulated.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* controls */}
      <div className="card p-5">
        <SectionTitle icon={<CalendarRange className="h-4 w-4" />}>Define the comparison</SectionTitle>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-space-700 bg-space-850/50 p-3.5">
            <label className="label" htmlFor="compare-location">Location</label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="compare-location"
                className="input !pl-9"
                placeholder={custom ? `${custom.name} — click × or search a new city` : "Search any city… or type a region (e.g. Punjab)"}
                value={custom ? `${custom.name} · ${Number(custom.latitude).toFixed(2)}°, ${Number(custom.longitude).toFixed(2)}°` : locName}
                onChange={e => { if (custom) clearCustom(); setLocName(e.target.value); }}
              />
              {custom && (
                <button type="button" onClick={clearCustom} title="Clear chosen location" className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-accent">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-space-700 bg-space-900/95 shadow-2xl backdrop-blur-md">
                  {suggestions.map(r => (
                    <button
                      key={`${r.name}-${r.latitude}-${r.longitude}`}
                      onClick={() => pickSuggestion(r)}
                      className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-space-800 hover:text-white"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.name}</span>
                        <span className="block truncate text-[11px] text-slate-500">{r.label}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <button type="button" onClick={useMyLocation} className="chip !cursor-pointer hover:border-accent hover:text-accent">
                <Navigation className="mr-1 h-3 w-3" /> Use my location
              </button>
              {custom && <span className="chip !cursor-default"><MapPin className="mr-1 h-3 w-3 text-accent" /> {custom.name}</span>}
              <span className="chip !cursor-default">Default region: Punjab</span>
            </div>
          </div>

          <div className="rounded-xl border border-space-700 bg-space-850/50 p-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="label">Before date
                <input type="date" className="input mt-1" value={before} max={after} onChange={e => setBefore(e.target.value)} />
              </label>
              <label className="label">After date
                <input type="date" className="input mt-1" value={after} min={before} onChange={e => setAfter(e.target.value)} />
              </label>
            </div>
            <label className="label">Signal / index</label>
            <div className="flex flex-wrap gap-2">
              {INDEXES.map(ix => (
                <button
                  key={ix.id}
                  type="button"
                  onClick={() => setIndex(ix.id)}
                  className={`chip !cursor-pointer ${index === ix.id ? "!border-accent/60 !text-accent" : ""}`}
                >
                  {ix.label}
                </button>
              ))}
            </div>
            <button onClick={run} disabled={running} className="btn-primary mt-3 w-full justify-center">
              {running ? "Comparing…" : "Compare dates"}
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {data && <ComparisonResult data={data} running={running} />}
    </div>
  );
}

function ComparisonResult({ data }) {
  const s = data.stats || {};
  const beforeCount = data.before_geojson?.features?.length || 0;
  const afterCount = data.after_geojson?.features?.length || 0;
  const changeCount = data.change_geojson?.features?.length || 0;

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <div className="section-kicker">{data.location} · {data.before} → {data.after}</div>
        <h2 className="text-xl font-bold tracking-tight text-white">
          Results <span className="text-slate-500">· {data.index} · {data.satellite}</span>
        </h2>
      </div>

      {/* stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Changed area" value={`${s.changed_area_km2} km²`} sub={`${changeCount} cells`} accent="text-rose-400" />
        <StatCard label="Expansion" value={`${s.expansion_area_km2 || 0} km²`} sub={`${s.expansion_cells} cells — gain`} accent="text-orange-400" />
        <StatCard label="Reduction" value={`${s.reduction_area_km2 || 0} km²`} sub={`${s.reduction_cells} cells — loss`} accent="text-sky-400" />
        <StatCard label="Signal change" value={`${s.signal_before} → ${s.signal_after}`} sub={`${s.percent_change}% Δ · trend ${s.trend}`} accent="text-accent" />
      </div>

      {/* before / after maps */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Satellite className="h-4 w-4 text-accent" /> Before · {data.before}
            <Badge color="amber">simulated</Badge>
          </div>
          <MapView geojson={data.before_geojson} op="compare-scene" height="320px" baseLayer="Satellite" showBounds={false} />
          <p className="mt-1 text-[11px] text-slate-500">Scene intensity — {beforeCount} cells in the AOI</p>
        </div>
        <div className="card p-4">
          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Satellite className="h-4 w-4 text-accent" /> After · {data.after}
            <Badge color="amber">simulated</Badge>
          </div>
          <MapView geojson={data.after_geojson} op="compare-scene" height="320px" baseLayer="Satellite" showBounds={false} />
          <p className="mt-1 text-[11px] text-slate-500">Scene intensity — {afterCount} cells in the AOI</p>
        </div>
      </div>

      {/* change map */}
      <div className="card p-4">
        <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Layers3 className="h-4 w-4 text-rose-400" /> Change mask · expansion vs reduction
          <Badge color="amber">simulated</Badge>
        </div>
        <MapView geojson={data.change_geojson} op="change-detection" height="340px" baseLayer="Satellite" showBounds={false} />
        <p className="mt-1 text-[11px] text-slate-500">
          Orange = expansion / gain · blue = reduction / loss · {changeCount} changed cells · confidence {data.confidence || "—"}
        </p>
      </div>

      {/* charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 text-sm font-semibold text-slate-200">Expansion vs reduction (cells)</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RBar data={(data.charts?.categories || []).map(c => ({ name: c.name, value: c.value }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                <RTooltip />
                <Bar dataKey="value" fill="#fb923c" radius={[6, 6, 0, 0]} />
              </RBar>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-4">
          <div className="mb-2 text-sm font-semibold text-slate-200">Signal between the two dates</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ReLine data={data.charts?.timeseries || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v => String(v).slice(0, 10)} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                <RTooltip />
                <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} name="Signal" />
              </ReLine>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* provenance */}
      <div className="card border-l-4 !border-l-amber-500/50 p-4">
        <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-amber-400">
          <Radio className="h-4 w-4" /> Simulated demo comparison
        </div>
        <p className="text-xs leading-5 text-slate-500">
          {data.note} Location: <span className="text-slate-300">{data.location}</span> ·
          window <span className="text-slate-300">{data.before} → {data.after}</span> ·
          engine {data.index} · {data.satellite}.
        </p>
      </div>
    </div>
  );
}