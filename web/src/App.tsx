import { useEffect, useState } from 'react';
import {
  Activity, Blocks, Check, ChevronDown, Code2, Database, FolderKanban,
  LayoutDashboard, Plus, Settings, ShieldCheck, Table2, Sparkles, ArrowUpRight
} from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
type Health = { status: string; database?: boolean };

function ActivityChart() {
  const points = [42, 56, 48, 68, 60, 78, 70, 88, 76, 96];
  const coords = points.map((value, i) => `${i * 42},${110 - value}`).join(' ');
  return (
    <div className="chart-wrap">
      <div className="chart-meta"><span>Actividad reciente</span><span className="chart-period">Vista ilustrativa</span></div>
      <svg className="chart" viewBox="0 0 378 126" role="img" aria-label="Gráfica ilustrativa de actividad">
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity=".34" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 55, 85, 115].map(y => <line key={y} x1="0" x2="378" y1={y} y2={y} className="grid-line" />)}
        <polygon points={`0,126 ${coords} 378,126`} fill="url(#chartFill)" />
        <polyline points={coords} className="chart-line" />
        {points.map((value, i) => <circle key={i} cx={i * 42} cy={110 - value} r="2.8" className="chart-dot" />)}
      </svg>
      <div className="chart-axis"><span>Inicio</span><span>Actividad</span><span>Ahora</span></div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('Overview');
  const [health, setHealth] = useState<Health>({ status: 'checking' });
  const [projectName, setProjectName] = useState('my-first-project');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch(`${API}/health`)
      .then(async r => {
        const data = await r.json();
        setHealth(r.ok ? data : { status: data.status || 'unavailable' });
      })
      .catch(() => setHealth({ status: 'unreachable' }));
  }, []);

  const nav = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'Table Editor', icon: Table2 },
    { name: 'SQL Editor', icon: Code2 },
    { name: 'Settings', icon: Settings }
  ];

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Database size={19} /></span><span>NubeDB</span><span className="brand-spark"><Sparkles size={13}/></span></div>
      <p className="eyebrow">WORKSPACE</p>
      <button className="workspace">◈ &nbsp; Personal workspace <ChevronDown size={14}/></button>
      <p className="eyebrow project-label">PROJECT</p>
      <div className="project"><FolderKanban size={15}/>{projectName}</div>
      <nav>{nav.map(item => {
        const Icon = item.icon;
        return <button key={item.name} className={`nav-item ${page === item.name ? 'active' : ''}`} onClick={() => {setPage(item.name);setNotice('');}}>
          <Icon size={17}/>{item.name}{page === item.name && <span className="nav-indicator"/>}
        </button>;
      })}</nav>
      <div className="sidebar-bottom"><ShieldCheck size={15}/> Private workspace</div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="breadcrumb">Personal workspace <span>/</span> <b>{projectName}</b></div><span className="demo"><i/> Starter build</span></header>
      <div className="content">
        {page === 'Overview' && <>
          <div className="heading-row"><div><div className="kicker">YOUR DATABASE SPACE</div><h1>Project overview</h1><p className="muted">Everything in your workspace, at a glance.</p></div><button className="primary" onClick={() => {setPage('Table Editor');setNotice('La creación de tablas se habilitará después de implementar autenticación y permisos.');}}><Plus size={16}/> New table</button></div>
          <div className="stats">
            <article className="stat"><div className="stat-top"><span className="stat-title">API status</span><span className="stat-icon"><Activity size={16}/></span></div><div className={`stat-number ${health.status === 'ok' ? 'green' : ''}`}>{health.status === 'ok' ? 'Connected' : health.status === 'checking' ? 'Checking…' : 'Not connected'}</div><p>{health.database ? 'PostgreSQL connection confirmed' : 'Check API and DATABASE_URL'}</p><span className={`status-dot ${health.status === 'ok' ? 'online' : ''}`}/></article>
            <article className="stat"><div className="stat-top"><span className="stat-title">Projects</span><span className="stat-icon"><FolderKanban size={16}/></span></div><div className="stat-number">01</div><p>Demo workspace</p><span className="stat-foot">Personal space</span></article>
            <article className="stat"><div className="stat-top"><span className="stat-title">Environment</span><span className="stat-icon"><ShieldCheck size={16}/></span></div><div className="stat-number">Starter</div><p>Authentication not configured</p><span className="stat-foot">MVP 0.1</span></article>
          </div>
          <div className="dashboard-grid">
            <section className="panel chart-panel"><div className="panel-title"><span>Workspace activity</span><span className="pill">OVERVIEW</span></div><ActivityChart/><p className="chart-disclaimer">Gráfica decorativa de ejemplo; aún no representa métricas reales de Neon.</p></section>
            <section className="panel quick-panel"><div className="panel-title"><span>Quick access</span><span className="panel-glyph"><ArrowUpRight size={15}/></span></div><button onClick={() => setPage('Table Editor')}><Table2 size={17}/> Table Editor <ArrowUpRight size={14}/></button><button onClick={() => setPage('SQL Editor')}><Code2 size={17}/> SQL Editor <ArrowUpRight size={14}/></button><button onClick={() => setPage('Settings')}><Settings size={17}/> Settings <ArrowUpRight size={14}/></button></section>
          </div>
          <section className="panel"><div className="panel-title"><span>Getting started</span><span className="pill">QUICK START</span></div>
            <div className="steps">
              <div className="step"><span className="step-icon done"><Check size={16}/></span><div><b>Frontend scaffold created</b><p>React, TypeScript and responsive navigation are ready.</p></div></div>
              <div className="step"><span className="step-icon">2</span><div><b>Connect PostgreSQL</b><p>Configure DATABASE_URL in the API hosting dashboard and apply the SQL migration.</p></div></div>
              <div className="step"><span className="step-icon">3</span><div><b>Add authentication and permissions</b><p>Protect each workspace before exposing user data.</p></div></div>
            </div>
          </section>
          <div className="notice"><Activity size={17}/><span>This starter does not yet offer live table editing or arbitrary SQL execution. Those features require a secure backend.</span></div>
        </>}
        {page === 'Table Editor' && <><div className="kicker">DATA MANAGEMENT</div><h1>Table Editor</h1><p className="muted">Explore your project data.</p><section className="panel"><div className="panel-title"><span><Database size={16}/> public / tables</span><span className="pill">NEXT MILESTONE</span></div><div className="empty"><Blocks size={30}/><b>Table browsing is coming next</b><p>First apply the metadata migration and add authenticated project-scoped endpoints.</p><button className="secondary" onClick={() => setNotice('Next: implement GET /api/projects and table metadata endpoints with workspace-level authorization.')}>View next step</button></div></section>{notice && <p className="notice">{notice}</p>}</>}
        {page === 'SQL Editor' && <><div className="kicker">QUERY WORKSPACE</div><h1>SQL Editor</h1><p className="muted">Query editor — planned feature.</p><section className="panel"><div className="panel-title"><span>Untitled query.sql</span><span className="pill">DISABLED UNTIL SECURED</span></div><div className="editor"><pre><span>-- NubeDB SQL editor</span>{'\n'}SELECT id, name{'\n'}FROM projects{'\n'}ORDER BY created_at DESC;</pre><button className="primary" onClick={() => setNotice('We will add SQL execution only after authentication, read/write permissions, timeouts and query resource limits are in place.')}>Why is Run disabled?</button></div></section>{notice && <p className="notice">{notice}</p>}</>}
        {page === 'Settings' && <><div className="kicker">CONFIGURATION</div><h1>Project settings</h1><p className="muted">Manage project basics.</p><section className="panel settings"><label>Project name<input value={projectName} onChange={e => setProjectName(e.target.value)} maxLength={80}/></label><label>API URL<input value={API} readOnly/></label><button className="primary" onClick={() => setNotice('Name updated for this browser session only. Add a protected backend endpoint to persist settings.')}>Save project name</button>{notice && <p className="muted">{notice}</p>}</section></>}
        <footer><span>NubeDB · MVP 0.1</span><span>React + Fastify + PostgreSQL</span></footer>
      </div>
    </main>
    <SpeedInsights />
  </div>;
}
