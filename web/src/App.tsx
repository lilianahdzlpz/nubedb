import { useEffect, useState } from 'react';
import { Activity, Blocks, Check, ChevronDown, Code2, Database, FolderKanban, LayoutDashboard, Plus, Settings, ShieldCheck, Table2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
type Health = { status: string; database?: boolean };

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
      <div className="brand"><span className="brand-mark">N</span><span>NubeDB</span></div>
      <p className="eyebrow">WORKSPACE</p>
      <button className="workspace">◈ &nbsp; Personal workspace <ChevronDown size={14}/></button>
      <p className="eyebrow project-label">PROJECT</p>
      <div className="project"><FolderKanban size={15}/>{projectName}</div>
      <nav>{nav.map(item => {
        const Icon = item.icon;
        return <button key={item.name} className={`nav-item ${page === item.name ? 'active' : ''}`} onClick={() => {setPage(item.name);setNotice('');}}>
          <Icon size={17}/>{item.name}
        </button>;
      })}</nav>
      <div className="sidebar-bottom"><ShieldCheck size={15}/> Secure by design</div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="breadcrumb">Personal workspace <span>/</span> <b>{projectName}</b></div><span className="demo"><i/> Starter build</span></header>
      <div className="content">
        {page === 'Overview' && <>
          <div className="heading-row"><div><h1>Project overview</h1><p className="muted">Your database workspace at a glance.</p></div><button className="primary" onClick={() => {setPage('Table Editor');setNotice('La creación de tablas se habilitará después de implementar autenticación y permisos.');}}><Plus size={16}/> New table</button></div>
          <div className="stats">
            <article className="stat"><div className="stat-title">API status</div><div className={`stat-number ${health.status === 'ok' ? 'green' : ''}`}>{health.status === 'ok' ? '● Connected' : health.status === 'checking' ? 'Checking…' : '● Not connected'}</div><p>{health.database ? 'PostgreSQL connection confirmed' : 'Check API and DATABASE_URL'}</p></article>
            <article className="stat"><div className="stat-title">Projects</div><div className="stat-number">1</div><p>Demo workspace</p></article>
            <article className="stat"><div className="stat-title">Environment</div><div className="stat-number">Starter</div><p>Authentication not configured</p></article>
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
        {page === 'Table Editor' && <><h1>Table Editor</h1><p className="muted">Explore your project data.</p><section className="panel"><div className="panel-title"><span><Database size={16}/> public / tables</span><span className="pill">NEXT MILESTONE</span></div><div className="empty"><Blocks size={30}/><b>Table browsing is coming next</b><p>First apply the metadata migration and add authenticated project-scoped endpoints.</p><button className="secondary" onClick={() => setNotice('Next: implement GET /api/projects and table metadata endpoints with workspace-level authorization.')}>View next step</button></div></section>{notice && <p className="notice">{notice}</p>}</>}
        {page === 'SQL Editor' && <><h1>SQL Editor</h1><p className="muted">Query editor — planned feature.</p><section className="panel"><div className="panel-title"><span>Untitled query.sql</span><span className="pill">DISABLED UNTIL SECURED</span></div><div className="editor"><pre><span>-- NubeDB SQL editor</span>{'\n'}SELECT id, name{'\n'}FROM projects{'\n'}ORDER BY created_at DESC;</pre><button className="primary" onClick={() => setNotice('We will add SQL execution only after authentication, read/write permissions, timeouts and query resource limits are in place.')}>Why is Run disabled?</button></div></section>{notice && <p className="notice">{notice}</p>}</>}
        {page === 'Settings' && <><h1>Project settings</h1><p className="muted">Manage project basics.</p><section className="panel settings"><label>Project name<input value={projectName} onChange={e => setProjectName(e.target.value)} maxLength={80}/></label><label>API URL<input value={API} readOnly/></label><button className="primary" onClick={() => setNotice('Name updated for this browser session only. Add a protected backend endpoint to persist settings.')}>Save project name</button>{notice && <p className="muted">{notice}</p>}</section></>}
        <footer><span>NubeDB · MVP 0.1</span><span>React + Fastify + PostgreSQL</span></footer>
      </div>
    </main>
  </div>;
}
