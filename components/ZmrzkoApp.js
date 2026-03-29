'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useItems, useArchived, useFreezers, useCategories } from '@/lib/hooks';

const SUGG = [
  { n: "Piščančja prsa", c: "perutnina" }, { n: "Piščančja bedra", c: "perutnina" },
  { n: "Puranja prsa", c: "perutnina" }, { n: "Goveja zrezek", c: "goveje" },
  { n: "Mleto goveje", c: "goveje" }, { n: "Goveja juha (kosti)", c: "goveje" },
  { n: "Svinjski zrezek", c: "svinjsko" }, { n: "Svinjska rebra", c: "svinjsko" },
  { n: "Mleto svinjsko", c: "svinjsko" }, { n: "Svinjski file", c: "svinjsko" },
  { n: "Losos file", c: "riba" }, { n: "Brancin", c: "riba" },
  { n: "Postrv", c: "riba" }, { n: "Kozice", c: "riba" },
  { n: "Škampi", c: "riba" }, { n: "Tuna steak", c: "riba" },
  { n: "Brokoli", c: "zelenjava" }, { n: "Špinača", c: "zelenjava" },
  { n: "Grah", c: "zelenjava" }, { n: "Koruza", c: "zelenjava" },
  { n: "Mešana zelenjava", c: "zelenjava" }, { n: "Jagode", c: "sadje" },
  { n: "Maline", c: "sadje" }, { n: "Borovnice", c: "sadje" },
  { n: "Bolognese", c: "pripravljena" }, { n: "Gulaž", c: "pripravljena" },
  { n: "Piščančja juha", c: "pripravljena" }, { n: "Goveja juha", c: "pripravljena" },
  { n: "Lazanja", c: "pripravljena" }, { n: "Kruh", c: "pecivo" },
  { n: "Pica testo", c: "pecivo" }, { n: "Burek", c: "pecivo" },
  { n: "Štruklji", c: "pecivo" }, { n: "Sladoled", c: "drugo" },
  { n: "Maslo", c: "drugo" }, { n: "Pasja hrana - govedina", c: "psi" },
  { n: "Pasja hrana - piščanec", c: "psi" },
];

const FREEZER_ICONS = ["🏠", "🏡", "🏢", "🚗", "🏔️", "🏗️", "🏪", "⛺"];
const CAT_ICONS = ["📦", "🦐", "🧀", "🥟", "🌽", "🍕", "🐕", "🥚", "🍰", "🫐", "🥜", "🍗"];
const CAT_COLORS = ["#EF4444", "#F97316", "#F59E0B", "#22C55E", "#0EA5E9", "#6366F1", "#A855F7", "#EC4899", "#64748B"];
const QTY_OPTS = ["100g", "250g", "500g", "1kg", "1 kos", "2 kosa", "500ml", "1L"];

function getSt(item) {
  const d = (new Date(item.expiry) - new Date()) / 864e5;
  return d < 0 ? "expired" : d < 30 ? "warning" : "ok";
}
function fmtD(d) { return new Date(d).toLocaleDateString("sl-SI", { day: "numeric", month: "short", year: "numeric" }); }
function wksUntil(d) {
  const days = Math.ceil((new Date(d) - new Date()) / 864e5);
  if (days < 0) { const w = Math.floor(Math.abs(days) / 7); return w === 0 ? Math.abs(days) + "d čez" : w + "t čez"; }
  return days < 7 ? days + "d" : Math.floor(days / 7) + "t";
}
const stCol = s => s === "expired" ? "#EF4444" : s === "warning" ? "#F59E0B" : "#22C55E";
const stBg = s => s === "expired" ? "rgba(239,68,68,0.08)" : s === "warning" ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.04)";

const S = {
  app: { maxWidth: 430, margin: "0 auto", minHeight: "100vh", position: "relative", overflow: "hidden" },
  frost1: { position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle,rgba(56,189,248,0.08) 0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" },
  frost2: { position: "absolute", bottom: 100, left: -80, width: 250, height: 250, background: "radial-gradient(circle,rgba(99,102,241,0.06) 0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" },
  inp: { width: "100%", boxSizing: "border-box", padding: "14px 16px", background: "rgba(30,41,59,0.8)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 14, color: "#E2E8F0", fontSize: 16, outline: "none", fontWeight: 500 },
  lbl: { fontSize: 13, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 8 },
};

function Pill({ active, color, onClick, children, small }) {
  return <button onClick={onClick} style={{ padding: small ? "6px 10px" : "8px 14px", borderRadius: 20, border: "1px solid", borderColor: active ? (color ? color + "80" : "rgba(56,189,248,0.5)") : "rgba(71,85,105,0.3)", background: active ? (color ? color + "20" : "rgba(56,189,248,0.15)") : "rgba(30,41,59,0.5)", color: active ? (color || "#38BDF8") : "#94A3B8", fontSize: small ? 12 : 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>{children}</button>;
}

function FC({ label, value }) {
  return <div style={{ background: "rgba(30,41,59,0.6)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(71,85,105,0.2)" }}><div style={{ fontSize: 11, color: "#64748B", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 15, fontWeight: 700, color: "#E2E8F0" }}>{value}</div></div>;
}

function Btn({ onClick, children, v = "primary", disabled = false, style: s = {} }) {
  const map = { primary: { bg: "linear-gradient(135deg,#0EA5E9,#6366F1)", c: "#fff", b: "none", sh: "0 8px 32px rgba(14,165,233,0.25)" }, success: { bg: "linear-gradient(135deg,#22C55E,#059669)", c: "#fff", b: "none", sh: "0 8px 32px rgba(34,197,94,0.3)" }, ghost: { bg: "transparent", c: "#64748B", b: "1px solid rgba(71,85,105,0.3)", sh: "none" } };
  const st = map[v] || map.primary;
  return <button onClick={onClick} disabled={disabled} style={{ width: "100%", padding: "15px", borderRadius: 14, border: st.b, background: st.bg, color: st.c, fontSize: 16, fontWeight: 700, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, boxShadow: st.sh, ...s }}>{children}</button>;
}

function Modal({ children, onClose }) {
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }}><div onClick={e => e.stopPropagation()} style={{ background: "linear-gradient(180deg,#1E293B,#0F172A)", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 430, padding: "24px 20px 36px", border: "1px solid rgba(71,85,105,0.3)", borderBottom: "none", maxHeight: "85vh", overflowY: "auto" }}><div style={{ width: 36, height: 4, background: "#334155", borderRadius: 2, margin: "0 auto 20px" }} />{children}</div></div>;
}

function FreezerDD({ freezers, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const allSel = selected.length === 0;
  const lbl = allSel ? "Vse" : selected.length === 1 ? (freezers.find(f => f.id === selected[0])?.icon + " " + freezers.find(f => f.id === selected[0])?.name) : selected.length + " izbrani";
  const toggle = id => { if (id === "all") { onChange([]); return; } const next = selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]; onChange(next.length === freezers.length ? [] : next); };
  const chk = on => ({ width: 18, height: 18, borderRadius: 4, border: "2px solid " + (on ? "#38BDF8" : "#475569"), background: on ? "#38BDF8" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", flexShrink: 0 });
  return <div ref={ref} style={{ position: "relative" }}><button onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 14, border: "1px solid " + (open ? "rgba(56,189,248,0.5)" : "rgba(71,85,105,0.3)"), background: open ? "rgba(56,189,248,0.12)" : "rgba(30,41,59,0.6)", color: "#E2E8F0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}><span>{lbl}</span><span style={{ fontSize: 10, color: "#64748B", transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }}>▼</span></button>{open && <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 200, background: "#1E293B", border: "1px solid rgba(71,85,105,0.4)", borderRadius: 16, padding: 6, zIndex: 60, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}><button onClick={() => { toggle("all"); setOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "none", background: allSel ? "rgba(56,189,248,0.12)" : "transparent", color: allSel ? "#38BDF8" : "#94A3B8", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}><span style={chk(allSel)}>{allSel ? "✓" : ""}</span> Vse</button>{freezers.map(f => { const on = allSel || selected.includes(f.id); return <button key={f.id} onClick={() => toggle(f.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "none", background: (!allSel && on) ? "rgba(56,189,248,0.08)" : "transparent", color: on ? "#E2E8F0" : "#64748B", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}><span style={chk(!allSel && on)}>{(!allSel && on) ? "✓" : ""}</span> {f.icon} {f.name}</button>; })}</div>}</div>;
}

function LabelInp({ value, onChange, labels, placeholder }) {
  const [focused, setFocused] = useState(false);
  const sug = useMemo(() => { if (!focused || !labels.length) return []; if (!value) return labels.slice(0, 5); return labels.filter(l => l.toLowerCase().includes(value.toLowerCase()) && l !== value).slice(0, 5); }, [value, focused, labels]);
  return <div style={{ position: "relative" }}><input value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)} placeholder={placeholder} style={S.inp} />{sug.length > 0 && <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#1E293B", border: "1px solid rgba(71,85,105,0.4)", borderRadius: 12, padding: 4, zIndex: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>{sug.map((s, i) => <button key={i} onMouseDown={() => onChange(s)} style={{ width: "100%", padding: "10px 14px", border: "none", borderRadius: 8, background: "transparent", color: "#CBD5E1", fontSize: 14, cursor: "pointer", textAlign: "left", fontWeight: 500 }}><span style={{ color: "#818CF8" }}>📎</span> {s}</button>)}</div>}</div>;
}

export default function ZmrzkoApp() {
  const { items, loading: itemsLoading, addItem, updateItem, deleteItem } = useItems();
  const { archived, loading: archLoading, archiveItem } = useArchived();
  const { freezers, addFreezer } = useFreezers();
  const { categories, addCategory } = useCategories();

  const [screen, setScreen] = useState("home");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [showCatFilter, setShowCatFilter] = useState(false);
  const [selFrzs, setSelFrzs] = useState([]);
  const [showDetail, setShowDetail] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [archView, setArchView] = useState("monthly");
  const [archSearch, setArchSearch] = useState("");
  const [archCat, setArchCat] = useState(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCat, setNewCat] = useState({ label: "", icon: "📦", color: "#64748B", months: 6 });
  const [showNewFrz, setShowNewFrz] = useState(false);
  const [newFrz, setNewFrz] = useState({ name: "", icon: "🏠" });
  const [addStep, setAddStep] = useState(0);
  const [addData, setAddData] = useState({ name: "", cat: "", qty: "", packets: 1, label: "", frozen: new Date().toISOString().split("T")[0], expiry: "", freezer: "home" });
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);

  const existingLabels = useMemo(() => [...new Set([...items, ...archived].map(i => i.label).filter(Boolean))], [items, archived]);

  useEffect(() => { if (screen === "add" && inputRef.current) setTimeout(() => inputRef.current?.focus(), 120); }, [screen, addStep]);

  const hasCats = Object.keys(categories).length > 0;
  const allF = selFrzs.length === 0;
  const vis = allF ? items : items.filter(i => selFrzs.includes(i.freezer));
  const expC = vis.filter(i => getSt(i) === "expired").length;
  const warnC = vis.filter(i => getSt(i) === "warning").length;

  const filtered = vis.filter(i => {
    if (filterCat && i.cat !== filterCat) return false;
    if (filterStatus === "expired" && getSt(i) !== "expired") return false;
    if (filterStatus === "warning" && getSt(i) !== "warning") return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !(i.label && i.label.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }).sort((a, b) => {
    if (a.sticky && !b.sticky) return -1;
    if (!a.sticky && b.sticky) return 1;
    return new Date(a.expiry) - new Date(b.expiry);
  });

  function recalc(f, c) {
    const cat = categories[c];
    const e = new Date(f);
    e.setMonth(e.getMonth() + (cat?.months || 6));
    return e.toISOString().split("T")[0];
  }

  // Loading screen
  if (itemsLoading || !hasCats) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#0B1120,#111827)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>❄️</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            <span style={{ background: "linear-gradient(135deg,#E2E8F0,#38BDF8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ZMRZK</span>
            <span style={{ color: "#38BDF8" }}>❄️</span>
          </div>
          <div style={{ color: "#475569", marginTop: 8, fontSize: 14 }}>Nalagam...</div>
        </div>
      </div>
    );
  }

  // ─── ARCHIVE ───
  if (showArchive) {
    const fa = archived.filter(a => {
      if (archSearch && !a.name.toLowerCase().includes(archSearch.toLowerCase()) && !(a.label && a.label.toLowerCase().includes(archSearch.toLowerCase()))) return false;
      if (archCat && a.cat !== archCat) return false;
      return true;
    });
    const byMonth = {};
    fa.forEach(a => { const d = new Date(a.archived_at); const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); if (!byMonth[k]) byMonth[k] = { label: d.toLocaleDateString("sl-SI", { month: "long", year: "numeric" }), items: [] }; byMonth[k].items.push(a); });
    const byItem = {};
    fa.forEach(a => { if (!byItem[a.name]) byItem[a.name] = { cat: a.cat, items: [] }; byItem[a.name].items.push(a); });
    const byCat = {};
    fa.forEach(a => { if (!byCat[a.cat]) byCat[a.cat] = []; byCat[a.cat].push(a); });
    const tot = fa.length;
    const mc = Object.keys(byMonth).length;

    return (
      <div style={S.app}><div style={S.frost1} /><div style={S.frost2} />
        <div style={{ position: "relative", zIndex: 1, padding: "16px 16px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingTop: 12 }}>
            <button onClick={() => setShowArchive(false)} style={{ background: "rgba(30,41,59,0.8)", border: "1px solid rgba(71,85,105,0.3)", borderRadius: 12, padding: "10px 16px", color: "#94A3B8", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>← Nazaj</button>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>📦 Arhiv</h2>
          </div>
          <div style={{ position: "relative", marginBottom: 12 }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#475569" }}>🔍</span><input value={archSearch} onChange={e => setArchSearch(e.target.value)} placeholder="Išči v arhivu..." style={{ ...S.inp, paddingLeft: 38, border: "1px solid rgba(71,85,105,0.3)", fontSize: 14 }} />{archSearch && <button onClick={() => setArchSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748B", fontSize: 16, cursor: "pointer" }}>✕</button>}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}><Pill small active={!archCat} onClick={() => setArchCat(null)}>Vse</Pill>{Object.entries(categories).map(([k, v]) => { const cnt = archived.filter(a => a.cat === k).length; return cnt ? <Pill key={k} small active={archCat === k} color={v.color} onClick={() => setArchCat(archCat === k ? null : k)}>{v.icon} {cnt}</Pill> : null; })}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>{[["Zadetki", tot, "#38BDF8"], ["Povpr./mes", mc ? Math.round(tot / mc) : 0, "#818CF8"], ["Izdelkov", Object.keys(byItem).length, "#22C55E"]].map(([l, v, c]) => <div key={l} style={{ background: "rgba(30,41,59,0.6)", borderRadius: 14, padding: "12px 10px", border: "1px solid rgba(71,85,105,0.2)", textAlign: "center" }}><div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{l}</div><div style={{ fontSize: 24, fontWeight: 800, color: c, marginTop: 2 }}>{v}</div></div>)}</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}><Pill small active={archView === "monthly"} onClick={() => setArchView("monthly")}>📅 Mesečno</Pill><Pill small active={archView === "category"} onClick={() => setArchView("category")}>📊 Kategorije</Pill><Pill small active={archView === "item"} onClick={() => setArchView("item")}>📋 Po izdelku</Pill></div>
          {tot === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: "#475569" }}><div style={{ fontSize: 48, marginBottom: 12 }}>📭</div><p>Ni zadetkov</p></div>}

          {archView === "monthly" && Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).map(([k, { label, items: mi }]) => <div key={k} style={{ marginBottom: 16 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><h3 style={{ fontSize: 14, fontWeight: 700, color: "#94A3B8", margin: 0, textTransform: "capitalize" }}>{label}</h3><span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>{mi.length}</span></div>{mi.map((it, i) => { const cat = categories[it.cat] || { icon: "❄️", label: "Drugo" }; return <div key={it.id + "-" + i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "rgba(30,41,59,0.4)", borderRadius: 12, marginBottom: 3, border: "1px solid rgba(71,85,105,0.12)" }}><span style={{ fontSize: 18 }}>{cat.icon}</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#CBD5E1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div><div style={{ fontSize: 11, color: "#475569" }}>{it.qty}{it.packets > 1 ? " / " + it.packets + "p" : ""}{it.label ? " · " + it.label : ""}</div></div><div style={{ fontSize: 11, color: "#475569", flexShrink: 0 }}>{fmtD(it.archived_at)}</div></div>; })}</div>)}

          {archView === "category" && Object.entries(byCat).sort((a, b) => b[1].length - a[1].length).map(([ck, ci]) => { const cat = categories[ck] || { icon: "❄️", label: "Drugo", color: "#64748B" }; return <div key={ck} style={{ marginBottom: 16 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><h3 style={{ fontSize: 14, fontWeight: 700, color: cat.color, margin: 0 }}>{cat.icon} {cat.label}</h3><span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>{ci.length}</span></div><div style={{ height: 6, borderRadius: 3, background: "rgba(30,41,59,0.6)", marginBottom: 8, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 3, background: cat.color, width: Math.min(100, (ci.length / tot) * 300) + "%", opacity: 0.7 }} /></div>{ci.slice(0, 5).map((it, i) => <div key={it.id + "-" + i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", background: "rgba(30,41,59,0.3)", borderRadius: 10, marginBottom: 3 }}><div style={{ flex: 1, fontSize: 13, color: "#CBD5E1", fontWeight: 500 }}>{it.name}</div><div style={{ fontSize: 11, color: "#475569" }}>{it.qty}</div><div style={{ fontSize: 11, color: "#475569" }}>{fmtD(it.archived_at)}</div></div>)}{ci.length > 5 && <div style={{ fontSize: 12, color: "#475569", padding: "4px 12px" }}>+ še {ci.length - 5}</div>}</div>; })}

          {archView === "item" && Object.entries(byItem).sort((a, b) => b[1].items.length - a[1].items.length).map(([name, { cat: ck, items: ie }]) => { const cat = categories[ck] || { icon: "❄️", label: "Drugo", color: "#64748B" }; const mb = {}; ie.forEach(e => { const d = new Date(e.archived_at); const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); if (!mb[k]) mb[k] = { label: d.toLocaleDateString("sl-SI", { month: "short", year: "2-digit" }), count: 0 }; mb[k].count++; }); const mx = Math.max(...Object.values(mb).map(m => m.count)); return <div key={name} style={{ marginBottom: 16 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span style={{ fontSize: 20 }}>{cat.icon}</span><div><div style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>{name}</div><div style={{ fontSize: 12, color: cat.color, fontWeight: 600 }}>Skupaj: {ie.length}× | {cat.label}</div></div></div><div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 50, padding: "0 4px", marginBottom: 4 }}>{Object.entries(mb).sort((a, b) => a[0].localeCompare(b[0])).map(([k, { count }]) => <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}><div style={{ fontSize: 10, color: "#64748B", fontWeight: 700 }}>{count}</div><div style={{ width: "100%", maxWidth: 28, height: Math.max(8, (count / mx) * 36), background: cat.color, borderRadius: 4, opacity: 0.6 }} /></div>)}</div><div style={{ display: "flex", gap: 3, padding: "0 4px" }}>{Object.entries(mb).sort((a, b) => a[0].localeCompare(b[0])).map(([k, { label }]) => <div key={k} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "#475569", fontWeight: 600 }}>{label}</div>)}</div></div>; })}
        </div>
      </div>
    );
  }

  // ─── HOME ───
  if (screen === "home") {
    return (
      <div style={S.app}><div style={S.frost1} /><div style={S.frost2} />
        <div style={{ position: "relative", zIndex: 1, padding: "16px 16px 100px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px" }}><span style={{ background: "linear-gradient(135deg,#E2E8F0,#38BDF8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ZMRZK</span><span style={{ color: "#38BDF8" }}>❄️</span></span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <FreezerDD freezers={freezers} selected={selFrzs} onChange={setSelFrzs} />
              <button onClick={() => { setShowArchive(true); setArchSearch(""); setArchCat(null); }} style={{ background: "rgba(30,41,59,0.6)", border: "1px solid rgba(71,85,105,0.2)", borderRadius: 10, padding: "8px 10px", color: "#64748B", fontSize: 14, cursor: "pointer", fontWeight: 600, lineHeight: 1 }}>📦</button>
            </div>
          </div>

          {(expC > 0 || warnC > 0) && <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>{expC > 0 && <button onClick={() => setFilterStatus(filterStatus === "expired" ? null : "expired")} style={{ background: filterStatus === "expired" ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.12)", color: "#EF4444", fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 20, border: "1px solid " + (filterStatus === "expired" ? "rgba(239,68,68,0.6)" : "rgba(239,68,68,0.25)"), cursor: "pointer" }}>🔴 {expC} poteklo</button>}{warnC > 0 && <button onClick={() => setFilterStatus(filterStatus === "warning" ? null : "warning")} style={{ background: filterStatus === "warning" ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.1)", color: "#F59E0B", fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 20, border: "1px solid " + (filterStatus === "warning" ? "rgba(245,158,11,0.5)" : "rgba(245,158,11,0.2)"), cursor: "pointer" }}>🟠 {warnC} poteče kmalu</button>}{filterStatus && <button onClick={() => setFilterStatus(null)} style={{ background: "transparent", border: "1px solid rgba(71,85,105,0.3)", borderRadius: 20, padding: "6px 12px", color: "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✕</button>}</div>}

          <div style={{ display: "flex", gap: 8, marginBottom: showCatFilter ? 8 : 12 }}><div style={{ position: "relative", flex: 1 }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#475569" }}>🔍</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Išči..." style={{ ...S.inp, paddingLeft: 38, border: "1px solid rgba(71,85,105,0.3)", fontSize: 14 }} /></div><button onClick={() => setShowCatFilter(!showCatFilter)} style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, border: "1px solid " + (showCatFilter || filterCat ? "rgba(99,102,241,0.5)" : "rgba(71,85,105,0.3)"), background: showCatFilter || filterCat ? "rgba(99,102,241,0.12)" : "rgba(30,41,59,0.6)", color: showCatFilter || filterCat ? "#818CF8" : "#64748B", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>☰{filterCat && <span style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: "50%", background: "#818CF8" }} />}</button></div>

          {showCatFilter && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, padding: "10px 12px", background: "rgba(30,41,59,0.4)", borderRadius: 14, border: "1px solid rgba(71,85,105,0.15)" }}><Pill small active={!filterCat} onClick={() => setFilterCat(null)}>Vse</Pill>{Object.entries(categories).map(([k, v]) => { const cnt = vis.filter(i => i.cat === k).length; return cnt ? <Pill key={k} small active={filterCat === k} color={v.color} onClick={() => setFilterCat(filterCat === k ? null : k)}>{v.icon} {v.label} ({cnt})</Pill> : null; })}</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{filtered.map(item => { const cat = categories[item.cat] || { icon: "❄️", color: "#64748B" }; const st = getSt(item); const frz = freezers.find(f => f.id === item.freezer); return <div key={item.id} onClick={() => { setShowDetail(item); setEditMode(false); }} style={{ background: stBg(st), border: "1px solid " + (st === "expired" ? "rgba(239,68,68,0.2)" : st === "warning" ? "rgba(245,158,11,0.15)" : "rgba(71,85,105,0.15)"), borderRadius: 16, padding: "12px 14px", cursor: "pointer", position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: cat.color, borderRadius: "16px 0 0 16px" }} /><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 8, flex: 1, minWidth: 0 }}><span style={{ fontSize: 24, flexShrink: 0 }}>{cat.icon}</span><div style={{ minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</span>{item.sticky && <span style={{ fontSize: 10 }}>📌</span>}</div><div style={{ fontSize: 11, color: "#64748B", display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}><span>{item.qty}{item.packets > 1 ? " · " + item.packets + "p" : ""}</span>{allF && frz && <><span>·</span><span>{frz.icon}</span></>}{item.label && <><span>·</span><span style={{ color: "#818CF8", fontWeight: 600 }}>{item.label}</span></>}</div></div></div><div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}><div style={{ fontSize: 12, fontWeight: 800, color: stCol(st), background: stCol(st) + "15", padding: "3px 8px", borderRadius: 8, display: "inline-block", marginBottom: 2 }}>{wksUntil(item.expiry)}</div><div style={{ fontSize: 10, color: "#475569" }}>{fmtD(item.expiry)}</div></div></div></div>; })}</div>

          {filtered.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: "#475569" }}><div style={{ fontSize: 48, marginBottom: 12 }}>{ items.length === 0 ? "❄️" : "🔍"}</div><p>{items.length === 0 ? "Zamrzovalnik je prazen — dodaj prvi izdelek!" : "Ni zadetkov"}</p></div>}
        </div>

        <button onClick={() => { const df = selFrzs.length === 1 ? selFrzs[0] : "home"; setAddData({ name: "", cat: "", qty: "", packets: 1, label: "", frozen: new Date().toISOString().split("T")[0], expiry: "", freezer: df }); setAddStep(0); setSuggestions([]); setScreen("add"); }} style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", width: 62, height: 62, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#0EA5E9,#6366F1)", color: "#fff", fontSize: 30, fontWeight: 300, cursor: "pointer", boxShadow: "0 8px 32px rgba(14,165,233,0.4),0 0 0 4px rgba(14,165,233,0.1)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>+</button>

        {/* Detail Modal */}
        {showDetail && (() => {
          const item = showDetail; const cat = categories[item.cat] || { icon: "❄️", label: "Drugo", color: "#64748B" }; const st = getSt(item); const frz = freezers.find(f => f.id === item.freezer);
          if (editMode && editData) {
            return <Modal onClose={() => setEditMode(false)}><h3 style={{ fontSize: 18, fontWeight: 800, color: "#E2E8F0", margin: "0 0 20px", textAlign: "center" }}>✏️ Uredi izdelek</h3><label style={S.lbl}>Ime</label><input value={editData.name} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} style={{ ...S.inp, marginBottom: 14 }} /><label style={S.lbl}>Kategorija</label><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>{Object.entries(categories).map(([k, v]) => <button key={k} onClick={() => setEditData(d => ({ ...d, cat: k }))} style={{ padding: "7px 11px", borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid " + (editData.cat === k ? v.color + "80" : "rgba(71,85,105,0.3)"), background: editData.cat === k ? v.color + "20" : "rgba(30,41,59,0.5)", color: editData.cat === k ? v.color : "#94A3B8" }}>{v.icon} {v.label}</button>)}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}><div><label style={S.lbl}>Količina</label><input value={editData.qty} onChange={e => setEditData(d => ({ ...d, qty: e.target.value }))} style={S.inp} /></div><div><label style={S.lbl}>Paketi</label><div style={{ display: "flex", alignItems: "center", gap: 8 }}><button onClick={() => setEditData(d => ({ ...d, packets: Math.max(1, d.packets - 1) }))} style={{ width: 40, height: 46, borderRadius: 10, border: "1px solid rgba(71,85,105,0.3)", background: "rgba(30,41,59,0.6)", color: "#94A3B8", fontSize: 20, cursor: "pointer" }}>−</button><span style={{ fontSize: 20, fontWeight: 800, color: "#E2E8F0", minWidth: 24, textAlign: "center" }}>{editData.packets}</span><button onClick={() => setEditData(d => ({ ...d, packets: d.packets + 1 }))} style={{ width: 40, height: 46, borderRadius: 10, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.1)", color: "#818CF8", fontSize: 20, cursor: "pointer" }}>+</button></div></div></div><label style={S.lbl}>Labela</label><LabelInp value={editData.label} onChange={v => setEditData(d => ({ ...d, label: v }))} labels={existingLabels} placeholder="opcijsko" /><div style={{ height: 14 }} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}><div><label style={S.lbl}>Zamrznjeno</label><input type="date" value={editData.frozen} onChange={e => setEditData(d => ({ ...d, frozen: e.target.value }))} style={{ ...S.inp, colorScheme: "dark" }} /></div><div><label style={S.lbl}>Rok uporabe</label><input type="date" value={editData.expiry} onChange={e => setEditData(d => ({ ...d, expiry: e.target.value }))} style={{ ...S.inp, colorScheme: "dark" }} /></div></div><label style={S.lbl}>Zamrzovalnik</label><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>{freezers.map(f => <button key={f.id} onClick={() => setEditData(d => ({ ...d, freezer: f.id }))} style={{ padding: "9px 14px", borderRadius: 12, border: "1px solid " + (editData.freezer === f.id ? "rgba(56,189,248,0.5)" : "rgba(71,85,105,0.3)"), background: editData.freezer === f.id ? "rgba(56,189,248,0.12)" : "rgba(30,41,59,0.5)", color: editData.freezer === f.id ? "#38BDF8" : "#94A3B8", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{f.icon} {f.name}</button>)}</div><Btn v="success" onClick={async () => { await updateItem(editData.id, { name: editData.name, cat: editData.cat, qty: editData.qty, packets: editData.packets, label: editData.label, frozen: editData.frozen, expiry: editData.expiry, freezer: editData.freezer }); setShowDetail(editData); setEditMode(false); }}>💾 Shrani</Btn><Btn v="ghost" onClick={() => setEditMode(false)} style={{ marginTop: 8 }}>Prekliči</Btn></Modal>;
          }
          return <Modal onClose={() => setShowDetail(null)}><div style={{ textAlign: "center", marginBottom: 18 }}><span style={{ fontSize: 56 }}>{cat.icon}</span><h2 style={{ fontSize: 22, fontWeight: 800, margin: "8px 0 4px" }}>{item.name}</h2><div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}><span style={{ fontSize: 13, fontWeight: 700, color: stCol(st), background: stCol(st) + "15", padding: "4px 12px", borderRadius: 12 }}>{st === "expired" ? "Poteklo" : st === "warning" ? "Poteče kmalu" : "OK"} · {wksUntil(item.expiry)}</span>{item.label && <span style={{ fontSize: 13, color: "#818CF8", fontWeight: 600, background: "rgba(129,140,248,0.1)", padding: "4px 12px", borderRadius: 12 }}>{item.label}</span>}</div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}><FC label="Kategorija" value={cat.label} /><FC label="Količina" value={item.qty + (item.packets > 1 ? " / " + item.packets + " pak." : "")} /><FC label="Zamrznjeno" value={fmtD(item.frozen)} /><FC label="Rok uporabe" value={fmtD(item.expiry)} /><FC label="Zamrzovalnik" value={frz ? frz.icon + " " + frz.name : "—"} /><FC label="Pripeto" value={item.sticky ? "📌 Da" : "Ne"} /></div>{item.packets > 1 && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 14, marginBottom: 14 }}><div><div style={{ fontSize: 13, fontWeight: 700, color: "#818CF8" }}>Odštej paket</div><div style={{ fontSize: 12, color: "#64748B" }}>Trenutno: {item.packets}</div></div><button onClick={async () => { await updateItem(item.id, { packets: item.packets - 1 }); setShowDetail({ ...item, packets: item.packets - 1 }); }} style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.15)", color: "#818CF8", fontSize: 20, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−1</button></div>}<div style={{ display: "flex", flexDirection: "column", gap: 8 }}><Btn v="success" onClick={async () => { await archiveItem(item); setShowDetail(null); }}>✓ Uporabljeno → Arhiv</Btn><div style={{ display: "flex", gap: 8 }}><button onClick={() => { setEditData({ ...item }); setEditMode(true); }} style={{ flex: 1, padding: "13px", borderRadius: 14, border: "1px solid rgba(56,189,248,0.3)", background: "rgba(56,189,248,0.08)", color: "#38BDF8", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>✏️ Uredi</button><button onClick={async () => { await updateItem(item.id, { sticky: !item.sticky }); setShowDetail({ ...item, sticky: !item.sticky }); }} style={{ flex: 1, padding: "13px", borderRadius: 14, border: "1px solid rgba(71,85,105,0.3)", background: item.sticky ? "rgba(245,158,11,0.1)" : "rgba(30,41,59,0.6)", color: item.sticky ? "#F59E0B" : "#94A3B8", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{item.sticky ? "📌 Odpni" : "📌 Pripni"}</button></div><button onClick={async () => { await deleteItem(item.id); setShowDetail(null); }} style={{ padding: "12px", borderRadius: 14, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", color: "#EF4444", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: 0.8 }}>🗑 Zbriši</button></div></Modal>;
        })()}
      </div>
    );
  }

  // ─── ADD ───
  const stepLabels = ["Ime", "Količina", "Datum", "Potrdi"];
  return (
    <div style={S.app}><div style={S.frost1} /><div style={S.frost2} />
      <div style={{ position: "relative", zIndex: 1, padding: "16px 16px 40px", minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}><button onClick={() => { if (addStep === 0) setScreen("home"); else setAddStep(addStep - 1); }} style={{ background: "rgba(30,41,59,0.8)", border: "1px solid rgba(71,85,105,0.3)", borderRadius: 12, padding: "10px 16px", color: "#94A3B8", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>← Nazaj</button><h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Dodaj izdelek</h2><button onClick={() => setScreen("home")} style={{ background: "rgba(30,41,59,0.8)", border: "1px solid rgba(71,85,105,0.3)", borderRadius: 12, width: 40, height: 40, color: "#94A3B8", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button></div>
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>{stepLabels.map((l, i) => <div key={i} style={{ flex: 1, textAlign: "center" }}><div style={{ height: 4, borderRadius: 2, marginBottom: 6, background: i <= addStep ? "linear-gradient(90deg,#0EA5E9,#6366F1)" : "rgba(51,65,85,0.5)" }} /><span style={{ fontSize: 11, color: i <= addStep ? "#38BDF8" : "#475569", fontWeight: 600 }}>{l}</span></div>)}</div>

        {addStep === 0 && <div><label style={S.lbl}>Kaj zamrzuješ?</label><input ref={inputRef} value={addData.name} onChange={e => { setAddData(d => ({ ...d, name: e.target.value })); setSuggestions(e.target.value.length >= 2 ? SUGG.filter(s => s.n.toLowerCase().includes(e.target.value.toLowerCase())).slice(0, 5) : []); }} placeholder="npr. piščančja prsa, losos..." style={{ ...S.inp, fontSize: 17 }} />{suggestions.length > 0 && <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>{suggestions.map((s, i) => { const cat = categories[s.c]; return <button key={i} onClick={() => { const exp = new Date(addData.frozen); exp.setMonth(exp.getMonth() + (cat?.months || 6)); setAddData(d => ({ ...d, name: s.n, cat: s.c, expiry: exp.toISOString().split("T")[0] })); setSuggestions([]); setAddStep(1); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", background: "rgba(30,41,59,0.8)", border: "1px solid rgba(71,85,105,0.3)", borderRadius: 14, color: "#E2E8F0", fontSize: 15, cursor: "pointer", textAlign: "left" }}><span style={{ fontSize: 22 }}>{cat?.icon}</span><div><div style={{ fontWeight: 600 }}>{s.n}</div><div style={{ fontSize: 12, color: cat?.color, fontWeight: 600 }}>{cat?.label} · rok {cat?.months} mes.</div></div></button>; })}</div>}{addData.name.length >= 2 && suggestions.length === 0 && <div style={{ marginTop: 16 }}><p style={{ fontSize: 13, color: "#64748B", marginBottom: 10 }}>Izberi kategorijo:</p><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>{Object.entries(categories).map(([k, v]) => <button key={k} onClick={() => { const exp = new Date(addData.frozen); exp.setMonth(exp.getMonth() + (v.months || 6)); setAddData(d => ({ ...d, cat: k, expiry: exp.toISOString().split("T")[0] })); setAddStep(1); }} style={{ padding: "14px 6px", background: "rgba(30,41,59,0.6)", border: "1px solid rgba(71,85,105,0.2)", borderRadius: 14, color: "#E2E8F0", cursor: "pointer", textAlign: "center" }}><div style={{ fontSize: 24, marginBottom: 4 }}>{v.icon}</div><div style={{ fontSize: 11, fontWeight: 600, color: v.color }}>{v.label}</div></button>)}<button onClick={() => setShowNewCat(true)} style={{ padding: "14px 6px", background: "transparent", border: "1px dashed rgba(71,85,105,0.4)", borderRadius: 14, color: "#475569", cursor: "pointer", textAlign: "center" }}><div style={{ fontSize: 24, marginBottom: 4 }}>+</div><div style={{ fontSize: 11, fontWeight: 600 }}>Nova</div></button></div></div>}{addData.name.length >= 2 && addData.cat && <Btn onClick={() => setAddStep(1)} style={{ marginTop: 20 }}>Naprej →</Btn>}</div>}

        {addStep === 1 && <div><div style={{ textAlign: "center", marginBottom: 20 }}><span style={{ fontSize: 44 }}>{categories[addData.cat]?.icon}</span><h3 style={{ fontSize: 20, fontWeight: 700, margin: "8px 0 0" }}>{addData.name}</h3><span style={{ fontSize: 13, color: categories[addData.cat]?.color, fontWeight: 600 }}>{categories[addData.cat]?.label}</span></div><label style={S.lbl}>Količina</label><input ref={inputRef} value={addData.qty} onChange={e => setAddData(d => ({ ...d, qty: e.target.value }))} placeholder="npr. 500g, 2 kosa, 1L" style={{ ...S.inp, marginBottom: 8 }} /><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>{QTY_OPTS.map(q => <button key={q} onClick={() => setAddData(d => ({ ...d, qty: q }))} style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid " + (addData.qty === q ? "rgba(99,102,241,0.5)" : "rgba(71,85,105,0.3)"), background: addData.qty === q ? "rgba(99,102,241,0.15)" : "rgba(30,41,59,0.5)", color: addData.qty === q ? "#818CF8" : "#94A3B8", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{q}</button>)}</div><label style={S.lbl}>Št. paketov</label><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}><button onClick={() => setAddData(d => ({ ...d, packets: Math.max(1, d.packets - 1) }))} style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid rgba(71,85,105,0.3)", background: "rgba(30,41,59,0.6)", color: "#94A3B8", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button><span style={{ fontSize: 24, fontWeight: 800, minWidth: 32, textAlign: "center" }}>{addData.packets}</span><button onClick={() => setAddData(d => ({ ...d, packets: d.packets + 1 }))} style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.1)", color: "#818CF8", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button><span style={{ fontSize: 13, color: "#64748B" }}>paketov</span></div><label style={S.lbl}>Labela <span style={{ fontWeight: 400, color: "#475569" }}>(opcijsko)</span></label><LabelInp value={addData.label} onChange={v => setAddData(d => ({ ...d, label: v }))} labels={existingLabels} placeholder="npr. za Reksa, za 4 osebe..." /><div style={{ height: 24 }} /><Btn onClick={() => setAddStep(2)} disabled={!addData.qty}>Naprej →</Btn></div>}

        {addStep === 2 && <div><div style={{ textAlign: "center", marginBottom: 20 }}><span style={{ fontSize: 44 }}>{categories[addData.cat]?.icon}</span><h3 style={{ fontSize: 20, fontWeight: 700, margin: "8px 0 0" }}>{addData.name}</h3><span style={{ fontSize: 13, color: "#64748B" }}>{addData.qty}{addData.packets > 1 ? " / " + addData.packets + " pak." : ""} · {categories[addData.cat]?.label}</span></div><label style={S.lbl}>Kdaj si zamrznil/a?</label><input type="date" value={addData.frozen} onChange={e => { const f = e.target.value; setAddData(d => ({ ...d, frozen: f, expiry: recalc(f, d.cat) })); }} style={{ ...S.inp, marginBottom: 8, colorScheme: "dark" }} /><div style={{ marginBottom: 20 }}><button onClick={() => { const t = new Date().toISOString().split("T")[0]; setAddData(d => ({ ...d, frozen: t, expiry: recalc(t, d.cat) })); }} style={{ padding: "12px 24px", borderRadius: 12, border: "1px solid rgba(56,189,248,0.3)", background: "rgba(56,189,248,0.1)", color: "#38BDF8", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Danes</button></div><label style={S.lbl}>Rok uporabe <span style={{ fontWeight: 400, color: "#475569" }}>(klikni za spremembo)</span></label><input type="date" value={addData.expiry || recalc(addData.frozen, addData.cat)} onChange={e => setAddData(d => ({ ...d, expiry: e.target.value }))} style={{ ...S.inp, marginBottom: 6, colorScheme: "dark" }} /><div style={{ padding: "8px 14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 10, marginBottom: 20 }}><span style={{ fontSize: 12, color: "#22C55E", fontWeight: 600 }}>{categories[addData.cat]?.label}: privzeto {categories[addData.cat]?.months} mes.</span></div><label style={S.lbl}>Zamrzovalnik</label><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>{freezers.map(f => <button key={f.id} onClick={() => setAddData(d => ({ ...d, freezer: f.id }))} style={{ padding: "10px 16px", borderRadius: 14, border: "1px solid " + (addData.freezer === f.id ? "rgba(56,189,248,0.5)" : "rgba(71,85,105,0.3)"), background: addData.freezer === f.id ? "rgba(56,189,248,0.12)" : "rgba(30,41,59,0.5)", color: addData.freezer === f.id ? "#38BDF8" : "#94A3B8", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{f.icon} {f.name}</button>)}<button onClick={() => setShowNewFrz(true)} style={{ padding: "10px 16px", borderRadius: 14, border: "1px dashed rgba(71,85,105,0.4)", background: "transparent", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Nov</button></div><Btn onClick={() => setAddStep(3)}>Naprej →</Btn></div>}

        {addStep === 3 && (() => { const cat = categories[addData.cat] || { icon: "❄️", label: "Drugo", color: "#64748B" }; const frz = freezers.find(f => f.id === addData.freezer); const exp = addData.expiry || recalc(addData.frozen, addData.cat); return <div><div style={{ textAlign: "center", marginBottom: 24 }}><div style={{ fontSize: 64, marginBottom: 6 }}>{cat.icon}</div><h3 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>{addData.name}</h3><span style={{ fontSize: 14, color: cat.color, fontWeight: 600 }}>{cat.label}</span>{addData.label && <div style={{ fontSize: 13, color: "#818CF8", marginTop: 4 }}>📎 {addData.label}</div>}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}><FC label="Količina" value={addData.qty + (addData.packets > 1 ? " / " + addData.packets + " pak." : "")} /><FC label="Zamrznjeno" value={fmtD(addData.frozen)} /><FC label="Rok uporabe" value={fmtD(exp)} /><FC label="Zamrzovalnik" value={frz ? frz.icon + " " + frz.name : "—"} /></div><Btn v="success" onClick={async () => { await addItem({ name: addData.name, cat: addData.cat || "drugo", qty: addData.qty || "1 kos", packets: addData.packets || 1, label: addData.label || "", frozen: addData.frozen, expiry: exp, freezer: addData.freezer, sticky: false }); setScreen("home"); }}>✓ Shrani v zamrzovalnik</Btn><Btn v="ghost" onClick={() => setAddStep(0)} style={{ marginTop: 8 }}>← Uredi od začetka</Btn></div>; })()}
      </div>

      {showNewCat && <Modal onClose={() => setShowNewCat(false)}><h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 20px", textAlign: "center" }}>Nova kategorija</h3><label style={S.lbl}>Ime</label><input value={newCat.label} onChange={e => setNewCat(c => ({ ...c, label: e.target.value }))} placeholder="npr. Morski sadeži" style={{ ...S.inp, marginBottom: 14 }} /><label style={S.lbl}>Emoji ikona</label><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>{CAT_ICONS.map(ic => <button key={ic} onClick={() => setNewCat(c => ({ ...c, icon: ic }))} style={{ width: 44, height: 44, borderRadius: 12, fontSize: 22, border: "2px solid " + (newCat.icon === ic ? "#38BDF8" : "rgba(71,85,105,0.3)"), background: newCat.icon === ic ? "rgba(56,189,248,0.12)" : "rgba(30,41,59,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</button>)}</div><label style={S.lbl}>Barva</label><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>{CAT_COLORS.map(col => <button key={col} onClick={() => setNewCat(c => ({ ...c, color: col }))} style={{ width: 36, height: 36, borderRadius: 10, background: col, border: "3px solid " + (newCat.color === col ? "#fff" : "transparent"), cursor: "pointer", opacity: newCat.color === col ? 1 : 0.5 }} />)}</div><label style={S.lbl}>Rok uporabe (meseci)</label><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}><button onClick={() => setNewCat(c => ({ ...c, months: Math.max(1, c.months - 1) }))} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid rgba(71,85,105,0.3)", background: "rgba(30,41,59,0.6)", color: "#94A3B8", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button><span style={{ fontSize: 22, fontWeight: 800, minWidth: 32, textAlign: "center" }}>{newCat.months}</span><button onClick={() => setNewCat(c => ({ ...c, months: c.months + 1 }))} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.1)", color: "#818CF8", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button><span style={{ fontSize: 13, color: "#64748B" }}>mesecev</span></div><Btn onClick={async () => { if (!newCat.label) return; await addCategory(newCat); setNewCat({ label: "", icon: "📦", color: "#64748B", months: 6 }); setShowNewCat(false); }} disabled={!newCat.label}>Dodaj kategorijo</Btn></Modal>}

      {showNewFrz && <Modal onClose={() => setShowNewFrz(false)}><h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 20px", textAlign: "center" }}>Nov zamrzovalnik</h3><label style={S.lbl}>Ime</label><input value={newFrz.name} onChange={e => setNewFrz(f => ({ ...f, name: e.target.value }))} placeholder="npr. Garaža" style={{ ...S.inp, marginBottom: 14 }} /><label style={S.lbl}>Ikona</label><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>{FREEZER_ICONS.map(ic => <button key={ic} onClick={() => setNewFrz(f => ({ ...f, icon: ic }))} style={{ width: 44, height: 44, borderRadius: 12, fontSize: 22, border: "2px solid " + (newFrz.icon === ic ? "#38BDF8" : "rgba(71,85,105,0.3)"), background: newFrz.icon === ic ? "rgba(56,189,248,0.12)" : "rgba(30,41,59,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</button>)}</div><Btn onClick={async () => { if (!newFrz.name) return; await addFreezer(newFrz); setNewFrz({ name: "", icon: "🏠" }); setShowNewFrz(false); }} disabled={!newFrz.name}>Dodaj zamrzovalnik</Btn></Modal>}
    </div>
  );
}
