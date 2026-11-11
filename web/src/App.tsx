import { useEffect, useState, type FormEvent } from 'react';
import {
  Activity, Blocks, Check, ChevronDown, Code2, Database, FolderKanban,
  LayoutDashboard, Plus, Settings, ShieldCheck, Table2, Sparkles, ArrowUpRight,
  LogOut, LockKeyhole
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'nubedb_session';
type Health = { status: string; database?: boolean };

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error === 'authentication_not_configured'
          ? 'Falta configurar NUBEDB_PASSWORD y SESSION_SECRET en Render.'
          : data.error === 'too_many_attempts'
            ? 'Demasiados intentos. Espera 15 minutos.'
            : 'Contraseña incorrecta.');
        return;
      }
      onLogin(data.token);
    } catch {
      setError('No se pudo conectar con la API. Revisa Render e inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-screen">
    <form className="login-card" onSubmit={submit}>
      <div className="login-brand"><span className="brand-mark"><Database size={21}/></span><span>NubeDB</span><Sparkles size={15}/></div>
      <div className="login-lock"><LockKeyhole size={22}/></div>
      <div className="kicker">ESPACIO PERSONAL</div>
      <h1>Bienvenida a NubeDB</h1>
      <p className="login-subtitle">Ingresa tu contraseña para acceder a tu base de datos privada.</p>
      <label className="login-label" htmlFor="nubedb-password">Contraseña</label>
      <input id="nubedb-password" type="password" autoComplete="current-password"
        value={password} onChange={event => setPassword(event.target.value)}
        placeholder="Escribe tu contraseña" required autoFocus />
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="primary login-submit" type="submit" disabled={busy || !password}>
        {busy ? 'Verificando…' : 'Entrar a NubeDB'}
      </button>
      <div className="login-foot"><ShieldCheck size={14}/> Acceso protegido · Solo uso personal</div>
    </form>
  </main>;
}

function ActivityChart() {
  const points = [42, 56, 48, 68, 60, 78, 70, 88, 76, 96];
  const coords = points.map((value, i) => `${i * 42},${110 - value}`).join(' ');
  return <div className="chart-wrap">
    <div className="chart-meta"><span>Actividad reciente</span><span className="chart-period">Vista ilustrativa</span></div>
    <svg className="chart" viewBox="0 0 378 126" role="img" aria-label="Gráfica ilustrativa de actividad">
      <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#a78bfa" stopOpacity=".34" />
        <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
      </linearGradient></defs>
      {[25, 55, 85, 115].map(y => <line key={y} x1="0" x2="378" y1={y} y2={y} className="grid-line" />)}
      <polygon points={`0,126 ${coords} 378,126`} fill="url(#chartFill)" />
      <polyline points={coords} className="chart-line" />
      {points.map((value, i) => <circle key={i} cx={i * 42} cy={110 - value} r="2.8" className="chart-dot" />)}
    </svg>
    <div className="chart-axis"><span>Inicio</span><span>Actividad</span><span>Ahora</span></div>
  </div>;
}


function DataBrowser({ token }: { token: string }) {
  const [tables, setTables] = useState<any[]>([]);
  const [selected, setSelected] = useState<{schema:string;name:string}|null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };
  useEffect(() => {
    fetch(`${API}/api/tables`, { headers }).then(r => r.json()).then(d => {
      if (!Array.isArray(d.tables)) throw new Error(d.error || 'No se pudieron cargar las tablas');
      setTables(d.tables);
    }).catch(e => setError(e.message));
  }, [token]);
  async function openTable(t: {schema:string;name:string}) {
    setSelected(t); setLoading(true); setError('');
    try {
      const [metaRes, rowRes] = await Promise.all([
        fetch(`${API}/api/tables/${encodeURIComponent(t.schema)}/${encodeURIComponent(t.name)}`, {headers}),
        fetch(`${API}/api/tables/${encodeURIComponent(t.schema)}/${encodeURIComponent(t.name)}/rows?limit=50`, {headers})
      ]);
      const meta = await metaRes.json(), data = await rowRes.json();
      if (!metaRes.ok || !rowRes.ok) throw new Error(meta.error || data.error || 'Error al leer la tabla');
      setColumns(meta.columns || []); setRows(data.rows || []);
    } catch(e:any) { setError(e.message); } finally { setLoading(false); }
  }
  return <><div className="kicker">DATA MANAGEMENT</div><h1>Table Editor</h1>
    <p className="muted">Explora tus tablas PostgreSQL en modo lectura.</p>
    {error && <div className="notice" role="alert">{error}</div>}
    <div className="browser-layout"><section className="panel table-list"><div className="panel-title">Tablas ({tables.length})</div>
      {tables.map(t=><button key={`${t.schema}.${t.name}`} className={`table-choice ${selected?.schema===t.schema&&selected?.name===t.name?'chosen':''}`} onClick={()=>openTable(t)}>
        <Table2 size={15}/><span><b>{t.name}</b><small>{t.schema} · aprox. {t.estimated_rows} filas</small></span>
      </button>)}
      {!tables.length && <div className="empty">No hay tablas disponibles.</div>}
    </section><section className="panel rows-panel"><div className="panel-title">{selected ? `${selected.schema}.${selected.name}` : 'Selecciona una tabla'} <span className="pill">LECTURA</span></div>
      {loading ? <div className="empty">Cargando datos…</div> : selected ? <>
        <div className="column-meta">{columns.map(c=><span key={c.column_name}>{c.column_name} <small>{c.data_type}</small></span>)}</div>
        <div className="data-scroll"><table className="data-table"><thead><tr>{columns.map(c=><th key={c.column_name}>{c.column_name}</th>)}</tr></thead>
          <tbody>{rows.map((r,i)=><tr key={i}>{columns.map(c=><td key={c.column_name}>{r[c.column_name]===null?'NULL':typeof r[c.column_name]==='object'?JSON.stringify(r[c.column_name]):String(r[c.column_name])}</td>)}</tr>)}</tbody>
        </table></div>{!rows.length && <div className="empty">La tabla no contiene filas.</div>}
      </> : <div className="empty"><Blocks size={30}/><b>Tus tablas aparecerán aquí</b><p>Selecciona una tabla para consultar sus columnas y primeras 50 filas.</p></div>}
    </section></div>
  </>;
}

function ReadOnlySql({token}:{token:string}) {
  const [sql,setSql]=useState('SELECT *\nFROM public.projects\nLIMIT 50;');
  const [result,setResult]=useState<any>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function run() {
    setBusy(true); setError(''); setResult(null);
    try {
      const r=await fetch(`${API}/api/query`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({sql})});
      const d=await r.json(); if(!r.ok) throw new Error(d.message || d.error || 'Consulta rechazada'); setResult(d);
    } catch(e:any){setError(e.message)} finally{setBusy(false)}
  }
  return <><div className="kicker">QUERY WORKSPACE</div><h1>SQL Editor</h1><p className="muted">Ejecuta consultas SELECT de solo lectura.</p>
    <section className="panel editor"><textarea aria-label="Consulta SQL" spellCheck={false} value={sql} onChange={e=>setSql(e.target.value)}/>
      <div className="editor-actions"><span className="pill">SOLO SELECT · MÁX. 5 SEGUNDOS</span><button className="primary" onClick={run} disabled={busy}>{busy?'Ejecutando…':'Ejecutar consulta'}</button></div>
      {error && <div className="notice" role="alert">{error}</div>}
      {result && <><p className="muted">{result.rowCount} filas devueltas (máximo 200).</p><div className="data-scroll"><table className="data-table"><thead><tr>{result.columns.map((c:string)=><th key={c}>{c}</th>)}</tr></thead><tbody>{result.rows.map((row:any,i:number)=><tr key={i}>{result.columns.map((c:string)=><td key={c}>{row[c]===null?'NULL':typeof row[c]==='object'?JSON.stringify(row[c]):String(row[c])}</td>)}</tr>)}</tbody></table></div></>}
    </section></>;
}

export default function App() {
  const [page, setPage] = useState('Overview');
  const [health, setHealth] = useState<Health>({ status: 'checking' });
  const [projectName, setProjectName] = useState('my-first-project');
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!token) { setAuthLoading(false); return; }
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => { if (!response.ok) throw new Error('Session expired'); })
      .catch(() => { sessionStorage.removeItem(TOKEN_KEY); setToken(''); })
      .finally(() => setAuthLoading(false));
  }, [token]);

  useEffect(() => {
    fetch(`${API}/health`)
      .then(async response => {
        const data = await response.json();
        setHealth(response.ok ? data : { status: data.status || 'unavailable' });
      })
      .catch(() => setHealth({ status: 'unreachable' }));
  }, []);

  function handleLogin(value: string) {
    sessionStorage.setItem(TOKEN_KEY, value);
    setToken(value);
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setPage('Overview');
  }

  if (authLoading) return <main className="login-screen">
    <div className="login-card login-loading"><span className="brand-mark"><Database size={21}/></span><b>Comprobando acceso…</b></div>
  </main>;
  if (!token) return <Login onLogin={handleLogin}/>;

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
      <div className="workspace">◈ &nbsp; Personal workspace <ChevronDown size={14}/></div>
      <p className="eyebrow project-label">PROJECT</p>
      <div className="project"><FolderKanban size={15}/>{projectName}</div>
      <nav>{nav.map(item => {
        const Icon = item.icon;
        return <button key={item.name} className={`nav-item ${page === item.name ? 'active' : ''}`}
          onClick={() => setPage(item.name)}>
          <Icon size={17}/>{item.name}{page === item.name && <span className="nav-indicator"/>}
        </button>;
      })}</nav>
      <div className="sidebar-bottom"><ShieldCheck size={15}/> Private workspace</div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div className="breadcrumb">Personal workspace <span>/</span> <b>{projectName}</b></div>
        <div className="topbar-actions">
          <span className="demo"><i/> Connected</span>
          <button className="logout-button" onClick={handleLogout}><LogOut size={14}/> Salir</button>
        </div>
      </header>
      <div className="content">
        {page === 'Overview' && <>
          <div className="heading-row"><div><div className="kicker">YOUR DATABASE SPACE</div><h1>Project overview</h1>
            <p className="muted">Tu espacio personal, protegido con contraseña.</p></div>
            <button className="primary" onClick={() => setPage('Table Editor')}><Plus size={16}/> New table</button>
          </div>
          <div className="stats">
            <article className="stat"><div className="stat-top"><span className="stat-title">API status</span><span className="stat-icon"><Activity size={16}/></span></div>
              <div className={`stat-number ${health.status === 'ok' ? 'green' : ''}`}>{health.status === 'ok' ? 'Connected' : health.status === 'checking' ? 'Checking…' : 'Not connected'}</div>
              <p>{health.database ? 'PostgreSQL connection confirmed' : 'Check API and DATABASE_URL'}</p><span className={`status-dot ${health.status === 'ok' ? 'online' : ''}`}/></article>
            <article className="stat"><div className="stat-top"><span className="stat-title">Projects</span><span className="stat-icon"><FolderKanban size={16}/></span></div>
              <div className="stat-number">01</div><p>Personal workspace</p><span className="stat-foot">Private space</span></article>
            <article className="stat"><div className="stat-top"><span className="stat-title">Security</span><span className="stat-icon"><ShieldCheck size={16}/></span></div>
              <div className="stat-number">Protected</div><p>Inicio de sesión requerido</p><span className="stat-foot">Sesión de 12 horas</span></article>
          </div>
          <div className="dashboard-grid">
            <section className="panel chart-panel"><div className="panel-title"><span>Workspace activity</span><span className="pill">OVERVIEW</span></div>
              <ActivityChart/><p className="chart-disclaimer">Gráfica ilustrativa; todavía no representa métricas reales de Neon.</p></section>
            <section className="panel quick-panel"><div className="panel-title"><span>Quick access</span><span className="panel-glyph"><ArrowUpRight size={15}/></span></div>
              <button onClick={() => setPage('Table Editor')}><Table2 size={17}/> Table Editor <ArrowUpRight size={14}/></button>
              <button onClick={() => setPage('SQL Editor')}><Code2 size={17}/> SQL Editor <ArrowUpRight size={14}/></button>
              <button onClick={() => setPage('Settings')}><Settings size={17}/> Settings <ArrowUpRight size={14}/></button>
            </section>
          </div>
          <section className="panel"><div className="panel-title"><span>Getting started</span><span className="pill">QUICK START</span></div>
            <div className="steps">
              <div className="step"><span className="step-icon done"><Check size={16}/></span><div><b>Frontend y API conectados</b><p>Vercel, Render y PostgreSQL Neon responden correctamente.</p></div></div>
              <div className="step"><span className="step-icon done"><Check size={16}/></span><div><b>Acceso privado</b><p>El panel requiere una sesión autenticada antes de mostrar el espacio de trabajo.</p></div></div>
              <div className="step"><span className="step-icon">3</span><div><b>Editor de datos</b><p>Siguiente: listar tablas y crear operaciones protegidas por permisos.</p></div></div>
            </div>
          </section>
          <div className="notice"><ShieldCheck size={17}/><span>La edición de tablas y ejecución SQL se habilitarán después de implementar permisos y validaciones del servidor.</span></div>
        </>}
        {page === 'Table Editor' && <DataBrowser token={token}/>}
        {page === 'SQL Editor' && <ReadOnlySql token={token}/>}
        {page === 'Settings' && <><div className="kicker">CONFIGURATION</div><h1>Project settings</h1><p className="muted">Configuración del proyecto.</p>
          <section className="panel settings"><label>Project name<input value={projectName} onChange={event => setProjectName(event.target.value)} maxLength={80}/></label>
            <label>API URL<input value={API} readOnly/></label><p className="muted">La sesión se cierra al salir o después de 12 horas.</p>
          </section></>}
        <footer><span>NubeDB · Personal workspace</span><span>React + Fastify + PostgreSQL</span></footer>
      </div>
    </main>
  </div>;
}
