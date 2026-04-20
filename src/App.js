import React, { useState, useEffect } from "react";
import StatsWidget from './components/StatsWidget';

const JSONBIN_BIN_ID = "69d6d01636566621a8914c8f";
const JSONBIN_API_KEY = "$2a$10$11sgWrptIfwQlehYtSaNEuGQKpkG6HT2OBoyIYHeJT51yPaXi1xxW";
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

async function incrementVisit() {
  const hasVisited = localStorage.getItem('has_visited');
  if (hasVisited) return false;
  
  try {
    const r = await fetch(`${JSONBIN_URL}/latest`, { 
      headers: { "X-Master-Key": JSONBIN_API_KEY } 
    });
    const j = await r.json();
    const currentVisits = j.record.visits || 0;
    
    await fetch(JSONBIN_URL, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json", 
        "X-Master-Key": JSONBIN_API_KEY 
      },
      body: JSON.stringify({ ...j.record, visits: currentVisits + 1 })
    });
    
    localStorage.setItem('has_visited', 'true');
    return true;
  } catch (e) {
    console.error("Visit count error:", e);
    return false;
  }
}

async function loadFromBin() {
  try {
    const r = await fetch(`${JSONBIN_URL}/latest`, { 
      headers: { "X-Master-Key": JSONBIN_API_KEY } 
    });
    const j = await r.json();
    return j.record;
  } catch { 
    return null; 
  }
}

const fmt = (iso) => { 
  const d = new Date(iso + "T00:00:00"); 
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }); 
};

export default function DervardDevlog() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState(0);

  useEffect(() => {
    loadFromBin().then(d => { 
      if (d) {
        setData(d);
        setVisits(d.visits || 0);
      }
      setLoading(false); 
    });
    
    incrementVisit().then(updated => {
      if (updated) {
        loadFromBin().then(d => {
          if (d) setVisits(d.visits || 0);
        });
      }
    });
    
    const iv = setInterval(async () => { 
      const fresh = await loadFromBin(); 
      if (fresh) {
        setData(fresh);
        setVisits(fresh.visits || 0);
      }
    }, 30000);
    
    return () => clearInterval(iv);
  }, []);

  if (loading || !data) return (
    <div style={{ background: "#0a0a0f", color: "#888", display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      Загрузка...
    </div>
  );

  const accent = "#e84545"; 
  const green = "#2ecc71"; 
  const amber = "#f39c12";
  const tp = "#e8e8ec"; 
  const ts = "#888892"; 
  const tm = "#555560";
  const bg = "#08080d"; 
  const sf = "#111118"; 
  const sf2 = "#191920"; 
  const bd = "#2a2a35";
  const fm = "'JetBrains Mono', monospace";

  return (
    <div style={{ minHeight: "100vh", background: bg, color: tp, fontFamily: "'Chakra Petch', sans-serif", padding: "40px 20px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet" />
      
      <div style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <StatsWidget />
        
        <div style={{
          background: sf,
          border: `1px solid ${bd}`,
          borderRadius: 20,
          padding: "6px 14px",
          fontFamily: fm,
          fontSize: 12,
          color: ts,
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
        }}>
          <span style={{ fontSize: 14 }}>👁️</span>
          <span>{visits.toLocaleString()}</span>
        </div>
      </div>
      
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontSize: 12, fontFamily: fm, color: tm, letterSpacing: 4 }}>Development Log</div>
          <h1 style={{ fontSize: "clamp(48px, 8vw, 72px)", background: `linear-gradient(135deg, ${tp}, ${accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
            {data.siteName}
          </h1>
          <p style={{ fontFamily: fm, fontSize: 14, color: ts }}>{data.subtitle}</p>
          <div style={{ display: "inline-block", marginTop: 16, padding: "4px 16px", border: `1px solid ${accent}50`, borderRadius: 4, fontFamily: fm, fontSize: 13, color: accent }}>
            {data.version}
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 48 }}>
          {[
            { key: "planned", label: "В планах", color: tm, icon: "◇" },
            { key: "inProgress", label: "В разработке", color: amber, icon: "◈" },
            { key: "done", label: "Реализовано", color: green, icon: "◆" }
          ].map(({ key, label, color, icon }) => (
            <div key={key} style={{ background: sf, border: `1px solid ${bd}`, borderRadius: 8, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ color, fontSize: 14 }}>{icon}</span>
                <span style={{ fontFamily: fm, fontSize: 11, color, letterSpacing: 2 }}>{label}</span>
                <span style={{ marginLeft: "auto", fontFamily: fm, fontSize: 11, color: tm }}>{data[key]?.length || 0}</span>
              </div>
              {data[key]?.map((item) => (
                <div key={item.id} style={{ padding: "8px 12px", marginBottom: 6, background: sf2, borderRadius: 4, fontSize: 13, color: ts, borderLeft: `2px solid ${color}40` }}>
                  {item.text}
                </div>
              ))}
            </div>
          ))}
        </div>

        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 3, height: 20, background: accent, borderRadius: 2 }} />
            <h2 style={{ margin: 0, fontSize: 20 }}>Changelog</h2>
          </div>
          <div style={{ position: "relative", paddingLeft: 28 }}>
            <div style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 1, background: bd }} />
            {data.changelog?.map((entry, idx) => (
              <div key={entry.id} style={{ marginBottom: 32, position: "relative" }}>
                <div style={{ position: "absolute", left: -24, top: 6, width: 11, height: 11, borderRadius: "50%", background: idx === 0 ? accent : sf2, border: `2px solid ${idx === 0 ? accent : tm}` }} />
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: fm, fontSize: 12, color: accent }}>{entry.version}</span>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{entry.title}</span>
                  <span style={{ fontFamily: fm, fontSize: 11, color: tm, marginLeft: "auto" }}>{fmt(entry.date)}</span>
                </div>
                <div style={{ background: sf, border: `1px solid ${bd}`, borderRadius: 6, padding: "12px 16px" }}>
                  {entry.entries?.map((e, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "4px 0", fontSize: 13, color: ts }}>
                      <span style={{ color: green, fontSize: 10, marginTop: 4 }}>▸</span>
                      <span>{e}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div style={{ marginTop: 60, textAlign: "center", fontSize: 11, fontFamily: fm, color: tm }}>
          Данные обновляются автоматически
        </div>
      </div>
    </div>
  );
}
