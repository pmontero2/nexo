import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle, ArrowRight, BarChart3, Building2, CalendarDays, CalendarRange,
  Check, CheckCircle2, ChevronRight, ClipboardList, Clock3, Download,
  HelpCircle, Home, Inbox, LifeBuoy, LogOut, Mail, Menu, MessageCircle, Plus,
  Moon, Pin, PinOff, RotateCcw, Send, ShieldCheck, Sun, Truck, Users, Wrench, X,
} from 'lucide-react';

type Role = 'Cliente' | 'Operaciones';
type Status = 'Pendiente' | 'En revisión' | 'Aprobada' | 'En ejecución' | 'Terminada' | 'No atendida';
type EquipmentStatus = 'Disponible' | 'En mantención' | 'Fuera de servicio' | 'Mantención próxima';
type Page = 'Inicio' | 'Solicitar grúa' | 'Mis solicitudes' | 'Mi agenda' | 'Mi empresa' | 'Servicio al cliente' | 'Panel de operaciones' | 'Agenda de operaciones' | 'Gestión de equipos' | 'Resumen de costos' | 'Mensajes de clientes';

type RequestRow = {
  id: string; client: string; model: string; date: string; start: string; end: string;
  site: string; work: string; status: Status; created: string; equipmentId?: string;
  reason?: string; reasonNote?: string; history: string[];
  operations?: { hours: number; consumption: string; supplies: string; maintenance: string; transport: string };
};
type Equipment = { id: string; serial: string; model: string; status: EquipmentStatus; lastMaintenance: string; nextMaintenance: string; notes: string };
type ServiceMessage = { id: string; client: string; type: string; subject: string; body: string; status: 'Nuevo' | 'En revisión' | 'Respondido'; response?: string; date: string };
type Store = { role: Role | null; requests: RequestRow[]; equipment: Equipment[]; messages: ServiceMessage[]; assignments: Record<string, string[]>; profile: { company: string; rut: string; contact: string; phone: string } };
type Action = { kind: 'no-atendida' | 'aprobar' | 'cerrar'; requestId: string } | null;

const STORAGE_KEY = 'planificador-demo-v1';
const SIDEBAR_PIN_KEY = 'planificador-demo-welcome-sidebar-pinned-v1';
const THEME_KEY = 'nexo-demo-theme';
type Theme = 'light' | 'dark';
const models = ['LTM 1060-3.1', 'LTM 1070-4.2', 'LTM 1100-4.2', 'LTM 1130-5.1', 'LRT 1090-2.1', 'RT 770'];
const staff = ['Camila Rojas · Operadora', 'Tomás Vega · Rigger', 'Nicolás Salas · Supervisor', 'Valentina Ortiz · APR', 'Diego Muñoz · Mecánico', 'Javiera Fuentes · Conductora'];
const statusLabels: Record<Status, string> = { Pendiente: 'Pendiente', 'En revisión': 'En revisión', Aprobada: 'Aprobada', 'En ejecución': 'En ejecución', Terminada: 'Terminada', 'No atendida': 'No atendida' };
const equipmentStatuses: EquipmentStatus[] = ['Disponible', 'En mantención', 'Fuera de servicio', 'Mantención próxima'];

function dayOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function makeInitialStore(): Store {
  const today = dayOffset(0);
  return {
    role: null,
    profile: { company: 'Constructora Horizonte Demo', rut: '76.000.000-0', contact: 'Andrea Fuentes', phone: '+56 9 5555 0101' },
    equipment: [
      { id: 'EQ-101', serial: 'DEMO-101', model: 'LTM 1070-4.2', status: 'Disponible', lastMaintenance: dayOffset(-60), nextMaintenance: dayOffset(45), notes: 'Equipo de ejemplo listo para asignación.' },
      { id: 'EQ-102', serial: 'DEMO-102', model: 'LTM 1100-4.2', status: 'En mantención', lastMaintenance: dayOffset(-5), nextMaintenance: dayOffset(120), notes: 'Revisión preventiva de pluma.' },
      { id: 'EQ-103', serial: 'DEMO-103', model: 'LTM 1060-3.1', status: 'Fuera de servicio', lastMaintenance: dayOffset(-90), nextMaintenance: dayOffset(10), notes: 'Diagnóstico pendiente.' },
      { id: 'EQ-104', serial: 'DEMO-104', model: 'LTM 1070-4.2', status: 'Mantención próxima', lastMaintenance: dayOffset(-75), nextMaintenance: dayOffset(7), notes: 'Planificar ingreso a taller.' },
      { id: 'EQ-105', serial: 'DEMO-105', model: 'LTM 1060-3.1', status: 'Disponible', lastMaintenance: dayOffset(-30), nextMaintenance: dayOffset(70), notes: '' },
    ],
    requests: [
      { id: 'DEMO-001', client: 'Constructora Horizonte Demo', model: 'LTM 1070-4.2', date: dayOffset(1), start: '09:00', end: '13:00', site: 'Obra Mirador · Santiago', work: 'Izaje de paneles prefabricados', status: 'Pendiente', created: dayOffset(-1), history: ['Solicitud recibida por el portal.'] },
      { id: 'DEMO-002', client: 'Montajes del Valle Demo', model: 'LTM 1100-4.2', date: dayOffset(2), start: '08:30', end: '12:30', site: 'Centro logístico · Quilicura', work: 'Montaje de estructura metálica', status: 'En revisión', created: dayOffset(-2), history: ['Solicitud recibida.', 'Operaciones está revisando los antecedentes.'] },
      { id: 'DEMO-003', client: 'Constructora Horizonte Demo', model: 'LTM 1070-4.2', date: dayOffset(3), start: '10:00', end: '14:00', site: 'Proyecto Parque · Ñuñoa', work: 'Descarga y posicionamiento de equipos', status: 'Aprobada', created: dayOffset(-3), equipmentId: 'EQ-101', history: ['Solicitud recibida.', 'Servicio aprobado y equipo asignado.'] },
      { id: 'DEMO-004', client: 'Montajes del Valle Demo', model: 'LTM 1060-3.1', date: today, start: '13:00', end: '16:00', site: 'Bodega Norte · Renca', work: 'Instalación de cubierta', status: 'En ejecución', created: dayOffset(-5), equipmentId: 'EQ-105', history: ['Solicitud recibida.', 'Servicio aprobado.', 'Trabajo en ejecución.'] },
      { id: 'DEMO-005', client: 'Constructora Horizonte Demo', model: 'LTM 1060-3.1', date: dayOffset(-2), start: '09:00', end: '12:00', site: 'Obra Central · Santiago', work: 'Izaje de componentes', status: 'Terminada', created: dayOffset(-8), equipmentId: 'EQ-105', history: ['Solicitud recibida.', 'Servicio aprobado.', 'Trabajo iniciado.', 'Servicio cerrado con datos de operación.'], operations: { hours: 2.8, consumption: '38 L diésel', supplies: 'Eslingas certificadas', maintenance: 'Inspección visual de cierre', transport: 'Camión pluma de apoyo' } },
      { id: 'DEMO-006', client: 'Montajes del Valle Demo', model: 'LTM 1100-4.2', date: dayOffset(4), start: '11:00', end: '15:00', site: 'Planta Oriente · Pudahuel', work: 'Movimiento de maquinaria', status: 'No atendida', created: dayOffset(-4), reason: 'equipo_no_disponible', reasonNote: 'El equipo compatible está en mantención.', history: ['Solicitud recibida.', 'No atendida: equipo no disponible.'] },
    ],
    messages: [
      { id: 'MSG-101', client: 'Constructora Horizonte Demo', type: 'Consulta', subject: 'Coordinación de horario', body: '¿Podemos confirmar el acceso a primera hora para el servicio de mañana?', status: 'Nuevo', date: dayOffset(-1) },
      { id: 'MSG-102', client: 'Montajes del Valle Demo', type: 'Observación', subject: 'Acceso a la obra', body: 'La entrada de camiones se habilita por el portón poniente.', status: 'En revisión', date: dayOffset(-2) },
      { id: 'MSG-103', client: 'Constructora Horizonte Demo', type: 'Reclamo', subject: 'Cambio de fecha', body: 'Necesitamos revisar el cambio de fecha que aparece en la solicitud de demostración.', status: 'Respondido', response: 'Estamos revisando el caso y dejaremos la actualización en el seguimiento del servicio. Respuesta ficticia de la demo.', date: dayOffset(-3) },
    ],
    assignments: { 'DEMO-003': [staff[0], staff[1]], 'DEMO-004': [staff[2], staff[3]] },
  };
}

function loadStore(): Store {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...makeInitialStore(), ...JSON.parse(saved) as Partial<Store> };
  } catch { /* Restablecer a ejemplos si el almacenamiento local está dañado. */ }
  return makeInitialStore();
}

function loadTheme(): Theme {
  try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
}

const clientNav = [
  { page: 'Inicio' as Page, icon: Home }, { page: 'Solicitar grúa' as Page, icon: Truck },
  { page: 'Mis solicitudes' as Page, icon: ClipboardList }, { page: 'Mi agenda' as Page, icon: CalendarDays },
  { page: 'Mi empresa' as Page, icon: Building2 }, { page: 'Servicio al cliente' as Page, icon: LifeBuoy },
];
const operationsNav = [
  { page: 'Panel de operaciones' as Page, icon: BarChart3 }, { page: 'Agenda de operaciones' as Page, icon: CalendarRange },
  { page: 'Gestión de equipos' as Page, icon: Truck }, { page: 'Resumen de costos' as Page, icon: ClipboardList },
  { page: 'Mensajes de clientes' as Page, icon: Inbox },
];

const dateLabel = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });

function App() {
  const [store, setStore] = useState<Store>(loadStore);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [page, setPage] = useState<Page>(() => store.role === 'Operaciones' ? 'Panel de operaciones' : 'Inicio');
  const [mobileNav, setMobileNav] = useState(false);
  const [action, setAction] = useState<Action>(null);
  const [notice, setNotice] = useState('');
  const [faq, setFaq] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* El tema sigue activo durante esta sesión. */ }
  }, [theme]);

  function toggleTheme() {
    setTheme(current => current === 'dark' ? 'light' : 'dark');
  }

  function commit(next: Store | ((previous: Store) => Store)) {
    setStore(previous => {
      const updated = typeof next === 'function' ? next(previous) : next;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  function chooseRole(role: Role) {
    commit(previous => ({ ...previous, role }));
    setPage(role === 'Cliente' ? 'Inicio' : 'Panel de operaciones');
    setNotice('');
  }

  function changePage(next: Page) {
    setPage(next);
    setMobileNav(false);
  }

  function resetDemo() {
    const fresh = makeInitialStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setStore(fresh);
    setPage('Inicio');
    setAction(null);
    setNotice('Datos de demostración restaurados.');
  }

  function addHistory(request: RequestRow, entry: string): string[] {
    return [...request.history, `${new Date().toLocaleString('es-CL')} · ${entry}`];
  }

  function changeStatus(id: string, status: Status, detail?: Partial<RequestRow>) {
    commit(previous => ({ ...previous, requests: previous.requests.map(request => request.id !== id ? request : ({ ...request, ...detail, status, history: addHistory(request, detail?.reason ? `${status}: ${detail.reasonNote || detail.reason}` : status) })) }));
    setNotice('Seguimiento actualizado en el simulador.');
  }

  function handleActionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    const form = new FormData(event.currentTarget);
    const request = store.requests.find(item => item.id === action.requestId);
    if (!request) return;
    if (action.kind === 'no-atendida') {
      const reason = String(form.get('reason') || '');
      const reasonNote = String(form.get('reasonNote') || '').trim();
      changeStatus(request.id, 'No atendida', { reason, reasonNote });
    } else if (action.kind === 'aprobar') {
      const equipmentId = String(form.get('equipmentId') || '');
      const equipment = store.equipment.find(item => item.id === equipmentId);
      if (!equipment || equipment.status !== 'Disponible' || equipment.model !== request.model) {
        setNotice('Elige un equipo compatible que esté disponible.');
        return;
      }
      changeStatus(request.id, 'Aprobada', { equipmentId });
    } else {
      const hours = Number(form.get('hours'));
      if (!Number.isFinite(hours) || hours <= 0) {
        setNotice('Ingresa las horas efectivas para cerrar el servicio.');
        return;
      }
      const operations = {
        hours,
        consumption: String(form.get('consumption') || '').trim(),
        supplies: String(form.get('supplies') || '').trim(),
        maintenance: String(form.get('maintenance') || '').trim(),
        transport: String(form.get('transport') || '').trim(),
      };
      changeStatus(request.id, 'Terminada', { operations });
    }
    setAction(null);
  }

  function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next: RequestRow = {
      id: `DEMO-${String(Date.now()).slice(-5)}`, client: store.profile.company,
      model: String(form.get('model')), date: String(form.get('date')), start: String(form.get('start')),
      end: String(form.get('end')), site: String(form.get('site')).trim(), work: String(form.get('work')).trim(),
      status: 'Pendiente', created: dayOffset(0), history: ['Solicitud enviada desde el simulador.'],
    };
    commit(previous => ({ ...previous, requests: [next, ...previous.requests] }));
    (event.currentTarget as HTMLFormElement).reset();
    setNotice(`Solicitud ${next.id} creada y guardada en este navegador.`);
    setPage('Mis solicitudes');
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message: ServiceMessage = {
      id: `MSG-${String(Date.now()).slice(-5)}`, client: store.profile.company,
      type: String(form.get('type')), subject: String(form.get('subject')).trim(), body: String(form.get('body')).trim(),
      status: 'Nuevo', date: dayOffset(0),
    };
    commit(previous => ({ ...previous, messages: [message, ...previous.messages] }));
    (event.currentTarget as HTMLFormElement).reset();
    setNotice('Mensaje guardado en la bandeja local del simulador.');
  }

  function replyMessage(id: string, response: string) {
    commit(previous => ({ ...previous, messages: previous.messages.map(message => message.id === id ? { ...message, status: 'Respondido', response } : message) }));
    setNotice('Respuesta guardada en el historial local.');
  }

  function addEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next: Equipment = {
      id: `EQ-${String(Date.now()).slice(-4)}`, serial: String(form.get('serial')).trim(), model: String(form.get('model')),
      status: String(form.get('status')) as EquipmentStatus, lastMaintenance: String(form.get('lastMaintenance') || ''),
      nextMaintenance: String(form.get('nextMaintenance') || ''), notes: String(form.get('notes') || '').trim(),
    };
    commit(previous => ({ ...previous, equipment: [...previous.equipment, next] }));
    (event.currentTarget as HTMLFormElement).reset();
    setNotice('Equipo incorporado al inventario de demostración.');
  }

  function updateEquipment(id: string, patch: Partial<Equipment>) {
    commit(previous => ({ ...previous, equipment: previous.equipment.map(item => item.id === id ? { ...item, ...patch } : item) }));
    setNotice('Ficha de equipo actualizada localmente.');
  }

  const activeNav = store.role === 'Operaciones' ? operationsNav : clientNav;
  const clientRequests = useMemo(() => store.requests.filter(request => request.client === store.profile.company), [store.requests, store.profile.company]);
  const availableEquipment = store.equipment.filter(item => item.status === 'Disponible');
  const title = store.role ? page : 'Bienvenido al simulador';

  if (!store.role) return <Welcome theme={theme} onToggleTheme={toggleTheme} onChoose={chooseRole} />;

  return <div className="app-shell">
    {mobileNav && <button className="mobile-scrim" aria-label="Cerrar menú" onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><NexoMark /></div><div><strong>NEXO</strong><span>Servicios de izaje</span></div></div>
      <div className="demo-tag"><span className="pulse-dot" /> SIMULADOR LOCAL</div>
      <nav aria-label="Menú principal">
        <p className="nav-label">{store.role}</p>
        {activeNav.map(({ page: item, icon: Icon }) => <button key={item} className={`nav-item ${page === item ? 'active' : ''}`} onClick={() => changePage(item)}><Icon size={17} /><span>{item}</span>{page === item && <ChevronRight size={15} className="nav-chevron" />}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="role-card"><div className="role-avatar">{store.role === 'Operaciones' ? 'OP' : 'CL'}</div><div><strong>{store.role}</strong><span>{store.role === 'Operaciones' ? 'Planificación y seguimiento' : store.profile.company}</span></div></div>
        <ThemeToggle className="sidebar-theme-toggle" theme={theme} onToggle={toggleTheme} />
        <button className="sidebar-link" onClick={() => { commit(previous => ({ ...previous, role: null })); setPage('Inicio'); }}><LogOut size={16} /> Cambiar rol</button>
      </div>
    </aside>

    <div className="main-column">
      <header className="topbar">
        <button className="icon-button mobile-menu-button" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu size={20} /></button>
        <div><span className="eyebrow">Nexo · Espacio {store.role}</span><h1>{title}</h1></div>
        <div className="topbar-actions"><span className="role-chip"><span />{store.role}</span><button className="button button-quiet reset-button" onClick={resetDemo} title="Restaurar los datos ficticios"><RotateCcw size={15} /><span>Restaurar simulador</span></button></div>
      </header>
      <div className="simulation-banner"><ShieldCheck size={17} /><p><strong>Modo simulador.</strong> Los datos y permisos son ficticios; los cambios se guardan solo en este navegador. No se conecta a servicios externos.</p></div>
      <main className="page-content">
        {notice && <div className="notice" role="status"><CheckCircle2 size={17} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Cerrar aviso"><X size={15} /></button></div>}
        {page === 'Inicio' && (store.role === 'Cliente' ? <ClientHome store={store} requests={clientRequests} onNavigate={changePage} /> : <OperationsHome store={store} onNavigate={changePage} />)}
        {page === 'Solicitar grúa' && store.role === 'Cliente' && <RequestForm onSubmit={createRequest} />}
        {page === 'Mis solicitudes' && store.role === 'Cliente' && <ClientRequests requests={clientRequests} />}
        {page === 'Mi agenda' && store.role === 'Cliente' && <Schedule requests={clientRequests} />}
        {page === 'Mi empresa' && store.role === 'Cliente' && <Profile store={store} commit={commit} />}
        {page === 'Servicio al cliente' && <CustomerService store={store} onSend={sendMessage} faq={faq} setFaq={setFaq} />}
        {page === 'Panel de operaciones' && store.role === 'Operaciones' && <OperationsPanel store={store} onNavigate={changePage} onAction={setAction} onStatus={changeStatus} onAssign={(requestId, person) => commit(previous => ({ ...previous, assignments: { ...previous.assignments, [requestId]: [...new Set([...(previous.assignments[requestId] ?? []), person])] } }))} />}
        {page === 'Agenda de operaciones' && store.role === 'Operaciones' && <Schedule requests={store.requests} operations />}
        {page === 'Gestión de equipos' && store.role === 'Operaciones' && <EquipmentPage equipment={store.equipment} onAdd={addEquipment} onUpdate={updateEquipment} />}
        {page === 'Resumen de costos' && store.role === 'Operaciones' && <CostsPage requests={store.requests} />}
        {page === 'Mensajes de clientes' && store.role === 'Operaciones' && <InboxPage messages={store.messages} onReply={replyMessage} />}
      </main>
      <footer className="app-footer"><span>NEXO · PORTAFOLIO</span><span>Datos de demostración · Sin conexión externa</span></footer>
    </div>
    {action && <ActionDialog action={action} request={store.requests.find(item => item.id === action.requestId)!} equipment={store.equipment} availableEquipment={availableEquipment} onClose={() => setAction(null)} onSubmit={handleActionSubmit} />}
  </div>;
}

type WelcomePage = 'Inicio' | 'Etapas del servicio' | 'Elegir espacio';

function welcomePageFromHash(): WelcomePage {
  if (window.location.hash === '#highlights') return 'Etapas del servicio';
  if (window.location.hash === '#roles') return 'Elegir espacio';
  return 'Inicio';
}

function Welcome({ theme, onToggleTheme, onChoose }: { theme: Theme; onToggleTheme: () => void; onChoose: (role: Role) => void }) {
  const [activePage, setActivePage] = useState<WelcomePage>(welcomePageFromHash);
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_PIN_KEY) === 'true'; } catch { return false; }
  });
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_PIN_KEY) === 'true'; } catch { return false; }
  });
  const navigateWelcome = (page: WelcomePage) => {
    setActivePage(page);
    const hash = page === 'Inicio' ? '' : page === 'Elegir espacio' ? '#roles' : '#highlights';
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const navItems: { page: WelcomePage; icon: typeof Home; label: string }[] = [
    { page: 'Inicio', icon: Home, label: 'Inicio' },
    { page: 'Etapas del servicio', icon: ClipboardList, label: 'Etapas del servicio' },
    { page: 'Elegir espacio', icon: Users, label: 'Elegir espacio' },
  ];
  const toggleSidebarPin = () => {
    const next = !sidebarPinned;
    setSidebarPinned(next);
    setSidebarExpanded(next);
    try { localStorage.setItem(SIDEBAR_PIN_KEY, String(next)); } catch { /* La navegación sigue funcionando sin almacenamiento. */ }
  };

  return <main id="top" className="welcome-shell">
    <aside className={`welcome-sidebar ${sidebarExpanded ? 'is-expanded' : ''} ${sidebarPinned ? 'is-pinned' : ''}`} aria-label="Menú del simulador" onMouseEnter={() => { if (!sidebarPinned) setSidebarExpanded(true); }} onMouseLeave={() => { if (!sidebarPinned) setSidebarExpanded(false); }} onFocus={() => setSidebarExpanded(true)} onBlur={event => { if (!sidebarPinned && !event.currentTarget.contains(event.relatedTarget as Node | null)) setSidebarExpanded(false); }}>
      <div className="welcome-sidebar-head">
        <button className="brand welcome-brand" onClick={() => navigateWelcome('Inicio')} aria-label="Nexo, inicio"><span className="brand-mark"><NexoMark /></span><span className="welcome-brand-copy"><strong>NEXO</strong><small>Servicios de izaje</small></span></button>
      </div>
      <div className="welcome-sidebar-tag"><span className="pulse-dot" /><span>ENTORNO DE PRUEBA</span></div>
      <nav className="welcome-side-nav" aria-label="Secciones del simulador">
        <p className="nav-label">RECORRIDO</p>
        {navItems.map(({ page, icon: Icon, label }) => <button key={page} className={`welcome-side-item ${activePage === page ? 'active' : ''}`} onClick={() => navigateWelcome(page)} aria-label={label} aria-current={activePage === page ? 'page' : undefined}><Icon size={17} /><span>{label}</span></button>)}
      </nav>
      <div className="welcome-role-switch"><p className="nav-label">ENTRAR COMO</p>
        <button onClick={() => onChoose('Cliente')} aria-label="Entrar como Cliente"><Building2 size={17} /><span>Cliente</span><ArrowRight size={14} className="welcome-role-arrow" /></button>
        <button onClick={() => onChoose('Operaciones')} aria-label="Entrar como Operaciones"><CalendarRange size={17} /><span>Operaciones</span><ArrowRight size={14} className="welcome-role-arrow" /></button>
      </div>
      <div className="welcome-sidebar-foot">
        <ThemeToggle className="welcome-sidebar-theme" theme={theme} onToggle={onToggleTheme} />
        <button className="welcome-sidebar-pin" onClick={toggleSidebarPin} aria-label={sidebarPinned ? 'Soltar menú lateral' : 'Fijar menú lateral abierto'} aria-pressed={sidebarPinned} title={sidebarPinned ? 'Soltar fijación' : 'Fijar menú abierto'}>{sidebarPinned ? <PinOff size={15} /> : <Pin size={15} />}<span>{sidebarPinned ? 'Soltar menú' : 'Fijar abierto'}</span></button>
        <div className="welcome-sidebar-foot-status"><span className="pulse-dot" /><span>Datos ficticios</span></div>
      </div>
    </aside>
    <div className="welcome-main">
      <header className="welcome-topbar"><div><span className="eyebrow">NEXO · PORTAFOLIO</span><strong>{activePage}</strong></div><div className="welcome-topbar-actions"><span className="welcome-topbar-badge"><ShieldCheck size={15} /> Simulador local</span></div></header>
      {activePage === 'Inicio' && <>
        <section className="welcome-hero">
          <div className="welcome-copy"><div className="welcome-kicker"><span className="welcome-kicker-line" /> RECORRIDO INTERACTIVO</div><h1>Planifica cada<br /><em>servicio con claridad.</em></h1><p>Explora un portal de servicios de grúa desde dos perspectivas: la coordinación del cliente y el trabajo diario de Operaciones.</p><div className="welcome-actions"><button className="button button-primary" onClick={() => navigateWelcome('Elegir espacio')}>Elegir un espacio <ArrowRight size={16} /></button><span><ShieldCheck size={16} /> Datos ficticios, guardados solo en este navegador</span></div><div className="welcome-trust"><span className="trust-line" /> SIN CUENTAS · SIN SERVICIOS EXTERNOS · SIMULACIÓN LOCAL</div></div>
          <div className="welcome-visual">
            <img className="welcome-photo" src="/images/grua-hero-demo.png" alt="Grúa móvil en una obra urbana al atardecer" />
            <div className="welcome-photo-shade" />
            <div className="visual-note note-top"><span className="note-dot green" /> Flota en coordinación</div>
            <div className="maintenance-card"><img src="/images/mantencion-demo.png" alt="" /><div><span>PLANIFICACIÓN DE FLOTA</span><strong>Equipos listos para el trabajo</strong><small>Disponibilidad y mantenciones en un solo lugar</small></div></div>
            <div className="visual-caption"><span className="caption-line" /> Coordinación en terreno</div>
          </div>
        </section>
        <WelcomeHighlights onOpenStages={() => navigateWelcome('Etapas del servicio')} />
      </>}
      {activePage === 'Etapas del servicio' && <WelcomeJourney onChoose={() => navigateWelcome('Elegir espacio')} />}
      {activePage === 'Elegir espacio' && <WelcomeRoleSelection onChoose={onChoose} />}
      <div className="welcome-bottom"><span>SIMULADOR LOCAL DE PORTAFOLIO</span><span>Los permisos se representan visualmente y no son seguridad real.</span></div>
    </div>
  </main>;
}

function NexoMark() {
  return <img className="brand-glyph" src="/images/nexo-mark.png" alt="" aria-hidden="true" />;
}

function ThemeToggle({ theme, onToggle, className = '' }: { theme: Theme; onToggle: () => void; className?: string }) {
  const isDark = theme === 'dark';
  const Icon = isDark ? Sun : Moon;
  const target = isDark ? 'claro' : 'oscuro';
  return <button type="button" role="switch" className={`theme-toggle ${className}`} onClick={onToggle} aria-label="Tema oscuro" aria-checked={isDark} title={`Cambiar a tema ${target}`}><Icon size={16} /><span className="theme-toggle-label">{isDark ? 'Oscuro' : 'Claro'}</span><span className="theme-switch-track" aria-hidden="true"><span className="theme-switch-knob" /></span></button>;
}

function WelcomeHighlights({ onOpenStages }: { onOpenStages: () => void }) {
  return <section className="welcome-highlights" aria-labelledby="highlights-title">
    <div className="highlight-heading"><div><span className="eyebrow">UN RECORRIDO COMPLETO</span><h2 id="highlights-title">Del primer contacto al cierre</h2></div><button className="text-button" onClick={onOpenStages}>Ver etapas <ArrowRight size={14} /></button></div>
    <div className="highlight-grid"><article><span className="highlight-number">01</span><div><strong>Solicitudes claras</strong><p>Fechas, ubicación y necesidades de cada servicio.</p></div><ClipboardList size={19} /></article><article><span className="highlight-number">02</span><div><strong>Flota coordinada</strong><p>Agenda, disponibilidad y mantenimiento de equipos.</p></div><Truck size={19} /></article><article><span className="highlight-number">03</span><div><strong>Seguimiento y cierre</strong><p>Avances, mensajes y datos operacionales.</p></div><CheckCircle2 size={19} /></article></div>
  </section>;
}

function WelcomeJourney({ onChoose }: { onChoose: () => void }) {
  return <section className="welcome-journey">
    <div className="journey-heading"><span className="eyebrow">ETAPAS DEL SERVICIO</span><h1>Todo conectado,<br /><em>desde la solicitud al cierre.</em></h1><p>El simulador muestra cómo se ordena la información y el trabajo entre quien solicita un servicio y el equipo que lo coordina.</p></div>
    <div className="journey-steps"><article><span>01 · SOLICITUD</span><h2>Antecedentes completos</h2><p>Define el equipo, la fecha, el horario, la ubicación y el tipo de maniobra desde el espacio Cliente.</p></article><article><span>02 · PLANIFICACIÓN</span><h2>Recursos disponibles</h2><p>Operaciones revisa solicitudes, cruza horarios, asigna personal y confirma la disponibilidad de la flota.</p></article><article><span>03 · EJECUCIÓN</span><h2>Seguimiento y cierre</h2><p>Registra avances, incidencias y datos internos de operación para consultar después el resumen de costos.</p></article></div>
    <div className="journey-photo-band"><img src="/images/mantencion-demo.png" alt="Revisión de un equipo de grúa antes de una operación" /><div><span>CONTROL DE FLOTA</span><h2>La planificación también cuida los equipos.</h2><p>Las fechas de mantenimiento y los estados de disponibilidad forman parte del recorrido operativo.</p><button className="button button-primary" onClick={onChoose}>Elegir un espacio <ArrowRight size={15} /></button></div></div>
  </section>;
}

function WelcomeRoleSelection({ onChoose }: { onChoose: (role: Role) => void }) {
  return <section className="welcome-role-page"><div className="role-page-heading"><span className="eyebrow">ELIGE TU EXPERIENCIA</span><h1>¿Desde qué espacio quieres entrar?</h1><p>Cada rol muestra su propio menú, información y acciones. Puedes cambiar de rol al volver a esta bienvenida.</p></div><div className="role-options">
    <button className="role-option" onClick={() => onChoose('Cliente')}><span className="role-option-icon client-icon"><Building2 size={22} /></span><span className="role-option-copy"><strong>Cliente</strong><small>Crea solicitudes, revisa tu agenda y comunícate con el equipo.</small></span><ArrowRight size={20} className="role-option-arrow" /></button>
    <button className="role-option" onClick={() => onChoose('Operaciones')}><span className="role-option-icon ops-icon"><CalendarRange size={22} /></span><span className="role-option-copy"><strong>Operaciones</strong><small>Planifica servicios, gestiona equipos y registra cierres.</small></span><ArrowRight size={20} className="role-option-arrow" /></button>
  </div><div className="role-page-note"><ShieldCheck size={16} /><span>La selección solo demuestra la interfaz: los permisos son ficticios y los datos quedan en este navegador.</span></div></section>;
}

function PageIntro({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-intro"><div><span className="eyebrow">{kicker}</span><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}
function Metric({ label, value, hint, icon: Icon }: { label: string; value: ReactNode; hint: string; icon: typeof Truck }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><Icon size={17} /></div><strong>{value}</strong><small>{hint}</small></div>;
}
function StatusPill({ status }: { status: string }) {
  const className = status.toLowerCase().replace(/ /g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return <span className={`status-pill ${className}`}>{status}</span>;
}
function ClientHome({ store, requests, onNavigate }: { store: Store; requests: RequestRow[]; onNavigate: (page: Page) => void }) {
  return <><section className="client-hero"><div><span className="hero-kicker">ESPACIO CLIENTE · SIMULACIÓN</span><h2>Hola, {store.profile.contact.split(' ')[0]}.</h2><p>Coordina un nuevo servicio y mantén el seguimiento de tus solicitudes desde un solo lugar.</p><button className="button button-primary" onClick={() => onNavigate('Solicitar grúa')}><Plus size={17} /> Nueva solicitud</button></div><div className="hero-illustration"><img src="/images/grua-hero-demo.png" alt="" /><span className="hero-photo-badge"><Truck size={15} /> Flota para tu operación</span></div></section>
    <div className="metrics-grid three"><Metric label="Solicitudes activas" value={requests.filter(item => !['Terminada', 'No atendida'].includes(item.status)).length} hint="En coordinación" icon={ClipboardList} /><Metric label="Próximo servicio" value={dateLabel(requests.filter(item => item.date >= dayOffset(0) && !['Terminada', 'No atendida'].includes(item.status)).sort((a, b) => a.date.localeCompare(b.date))[0]?.date ?? dayOffset(0))} hint="Consulta tu agenda" icon={CalendarDays} /><Metric label="Mensajes" value={store.messages.filter(item => item.client === store.profile.company).length} hint="Historial de atención" icon={MessageCircle} /></div>
    <div className="content-grid two"><section className="panel"><PanelTitle title="Seguimiento reciente" action={<button className="text-button" onClick={() => onNavigate('Mis solicitudes')}>Ver todas <ArrowRight size={14} /></button>} /><div className="list-rows">{requests.slice(0, 3).map(item => <div className="compact-row" key={item.id}><div className="row-icon"><Truck size={17} /></div><div className="row-main"><strong>{item.model}</strong><span>{item.site} · {dateLabel(item.date)}</span></div><StatusPill status={item.status} /></div>)}</div></section><section className="panel client-help-card"><div className="soft-icon"><LifeBuoy size={20} /></div><span className="eyebrow">¿NECESITAS AYUDA?</span><h3>Estamos para orientarte</h3><p>Encuentra respuestas o envía una consulta, observación o reclamo.</p><button className="button button-outline" onClick={() => onNavigate('Servicio al cliente')}>Ir a servicio al cliente <ArrowRight size={15} /></button></section></div>
  </>;
}
function OperationsHome({ store, onNavigate }: { store: Store; onNavigate: (page: Page) => void }) {
  const pending = store.requests.filter(item => ['Pendiente', 'En revisión'].includes(item.status)).length;
  const available = store.equipment.filter(item => item.status === 'Disponible').length;
  return <><section className="operations-hero"><div><span className="hero-kicker">ESPACIO OPERACIONES · SIMULACIÓN</span><h2>Planificación y control</h2><p>Revisa solicitudes, coordina la flota y registra el resultado de cada servicio.</p><button className="button button-primary" onClick={() => onNavigate('Agenda de operaciones')}><CalendarRange size={17} /> Abrir agenda</button></div><div className="ops-hero-art"><img src="/images/mantencion-demo.png" alt="" /><span className="hero-photo-badge"><Wrench size={14} /> Mantención y disponibilidad</span></div></section>
    <div className="metrics-grid four"><Metric label="Solicitudes" value={store.requests.length} hint="En el simulador" icon={ClipboardList} /><Metric label="Por revisar" value={pending} hint="Pendientes de gestión" icon={Clock3} /><Metric label="Equipos disponibles" value={available} hint={`De ${store.equipment.length} unidades DEMO`} icon={Truck} /><Metric label="Mensajes nuevos" value={store.messages.filter(item => item.status === 'Nuevo').length} hint="Bandeja de atención" icon={Inbox} /></div>
    <div className="content-grid two"><section className="panel"><PanelTitle title="Solicitudes para revisar" action={<button className="text-button" onClick={() => onNavigate('Agenda de operaciones')}>Abrir agenda <ArrowRight size={14} /></button>} /><div className="list-rows">{store.requests.filter(item => ['Pendiente', 'En revisión'].includes(item.status)).slice(0, 4).map(item => <div className="compact-row" key={item.id}><div className="row-icon amber-row"><ClipboardList size={17} /></div><div className="row-main"><strong>{item.client}</strong><span>{item.model} · {dateLabel(item.date)} · {item.start}</span></div><StatusPill status={item.status} /></div>)}</div></section><section className="panel shortcuts-panel"><PanelTitle title="Accesos de operación" /><div className="shortcut-grid"><button onClick={() => onNavigate('Gestión de equipos')}><Truck size={18} /><span>Gestionar equipos</span><ChevronRight size={16} /></button><button onClick={() => onNavigate('Resumen de costos')}><BarChart3 size={18} /><span>Ver cierres y costos</span><ChevronRight size={16} /></button><button onClick={() => onNavigate('Mensajes de clientes')}><Inbox size={18} /><span>Atender mensajes</span><ChevronRight size={16} /></button></div></section></div>
  </>;
}
function PanelTitle({ title, action }: { title: string; action?: ReactNode }) { return <div className="panel-title"><h3>{title}</h3>{action}</div>; }

function RequestForm({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [selectedModel, setSelectedModel] = useState(models[0]);
  return <><PageIntro kicker="NUEVO SERVICIO" title="Solicitar una grúa" description="Elige un modelo y cuéntanos qué trabajo necesitas coordinar. Operaciones revisará la disponibilidad antes de confirmar." />
    <form className="panel form-panel request-form" onSubmit={onSubmit}>
      <div className="form-section-title"><span>01</span><div><strong>Elige tu equipo</strong><small>Selecciona el modelo que mejor se ajusta al trabajo</small></div></div>
      <section className="model-picker-section" aria-labelledby="model-picker-title">
        <div className="model-picker-heading"><div><h3 id="model-picker-title">Modelos de grúa</h3><p>Toca una tarjeta para ver tu selección.</p></div><span className="model-picker-current"><Check size={14} /> {selectedModel}</span></div>
        <div className="model-picker" role="group" aria-label="Selecciona el modelo de grúa">
          {models.map(model => <button key={model} type="button" className={`model-card ${selectedModel === model ? 'selected' : ''}`} aria-pressed={selectedModel === model} onClick={() => setSelectedModel(model)}>
            <span className="model-card-photo"><img src={equipmentPhoto(model)} alt="" loading="lazy" /><span>Foto referencial</span></span>
            <span className="model-card-copy"><strong>{model}</strong><small>{equipmentCategory(model)}</small></span>
            <span className="model-card-state">{selectedModel === model ? <><CheckCircle2 size={14} /> Seleccionada</> : 'Elegir'}</span>
          </button>)}
        </div>
      </section>
      <input type="hidden" name="model" value={selectedModel} />
      <div className="form-section-title request-details-heading"><span>02</span><div><strong>Detalles del servicio</strong><small>Fecha, horario, ubicación y trabajo solicitado</small></div></div>
      <div className="field-grid two"><label className="field"><span>Fecha solicitada</span><input type="date" name="date" min={dayOffset(0)} defaultValue={dayOffset(2)} required /></label><label className="field"><span>Hora de inicio</span><input type="time" name="start" defaultValue="09:00" required /></label><label className="field"><span>Hora de término estimada</span><input type="time" name="end" defaultValue="13:00" required /></label><label className="field field-full"><span>Ubicación del servicio</span><input name="site" placeholder="Obra, comuna o dirección" required /></label><label className="field field-full"><span>Trabajo a realizar</span><textarea name="work" rows={3} placeholder="Describe brevemente la maniobra o el equipo que se debe mover" required /></label></div>
      <div className="form-footer"><p><ShieldCheck size={16} /> La selección es referencial; Operaciones confirma el equipo y su disponibilidad.</p><button className="button button-primary" type="submit"><Send size={16} /> Enviar solicitud</button></div>
    </form>
  </>;
}

function ClientRequests({ requests }: { requests: RequestRow[] }) {
  return <><PageIntro kicker="CLIENTE" title="Mis solicitudes" description="Revisa el estado, la grúa referencial y los antecedentes de tus servicios." />{requests.length === 0 ? <EmptyState icon={ClipboardList} title="Aún no tienes solicitudes" body="Cuando envíes una solicitud aparecerá aquí." /> : <div className="request-list">{requests.map(item => <article className="request-card" key={item.id}><div className="request-head"><div className="request-model"><img src={equipmentPhoto(item.model)} alt={`Imagen referencial de ${item.model}`} loading="lazy" /><div><span className="request-id">{item.id}</span><h3>{item.model}</h3><small>Imagen referencial</small></div></div><StatusPill status={item.status} /></div><div className="request-meta"><span><CalendarDays size={15} />{dateLabel(item.date)} · {item.start}–{item.end}</span><span><Building2 size={15} />{item.site}</span></div><p className="request-work">{item.work}</p>{item.status === 'No atendida' && <div className="reason-note"><AlertTriangle size={15} /><span><strong>Motivo:</strong> {reasonLabel(item.reason)}{item.reasonNote ? ` — ${item.reasonNote}` : ''}</span></div>}<div className="request-history"><strong>Último movimiento</strong><span>{item.history[item.history.length - 1]}</span></div></article>)}</div>}</>;
}

function Schedule({ requests, operations = false }: { requests: RequestRow[]; operations?: boolean }) {
  const sorted = [...requests].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  return <><PageIntro kicker={operations ? 'PLANIFICACIÓN' : 'CLIENTE'} title={operations ? 'Agenda de operaciones' : 'Mi agenda'} description={operations ? 'Solicitudes y servicios por fecha, con sus estados actuales.' : 'Consulta las fechas y horarios de tus solicitudes de servicio.'} />
    <div className="schedule-layout"><aside className="schedule-summary"><div className="schedule-summary-date"><CalendarDays size={18} /><span>{new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</span></div><strong>{sorted.filter(item => item.date >= dayOffset(0)).length}</strong><span>servicios próximos</span><div className="schedule-legend"><span><i className="legend-dot pending-dot" /> Por revisar</span><span><i className="legend-dot approved-dot" /> Confirmados</span><span><i className="legend-dot closed-dot" /> Cerrados</span></div></aside>
      <div className="schedule-list">{sorted.map(item => <div className="schedule-item" key={item.id}><div className="schedule-date"><b>{new Date(`${item.date}T12:00:00`).toLocaleDateString('es-CL', { day: '2-digit' })}</b><span>{new Date(`${item.date}T12:00:00`).toLocaleDateString('es-CL', { month: 'short' })}</span></div><div className="schedule-line" /><div className="schedule-detail"><div className="schedule-detail-head"><div><strong>{item.model}</strong><span>{item.start}–{item.end} · {item.client}</span></div><StatusPill status={item.status} /></div><p>{item.work} · {item.site}</p>{operations && item.status === 'No atendida' && <small className="inline-reason">Motivo: {reasonLabel(item.reason)}{item.reasonNote ? ` — ${item.reasonNote}` : ''}</small>}</div></div>)}</div>
    </div></>;
}

function Profile({ store, commit }: { store: Store; commit: (next: Store | ((previous: Store) => Store)) => void }) {
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const oldCompany = store.profile.company;
    const profile = { company: String(form.get('company')).trim(), rut: String(form.get('rut')).trim(), contact: String(form.get('contact')).trim(), phone: String(form.get('phone')).trim() };
    commit(previous => ({ ...previous, profile, requests: previous.requests.map(item => item.client === oldCompany ? { ...item, client: profile.company } : item), messages: previous.messages.map(item => item.client === oldCompany ? { ...item, client: profile.company } : item) }));
  }
  return <><PageIntro kicker="DATOS DE CUENTA" title="Mi empresa" description="Actualiza los datos que aparecen en tus solicitudes de demostración." /><form className="panel form-panel profile-form" onSubmit={save}><div className="profile-banner"><div className="profile-avatar"><Building2 size={21} /></div><div><strong>{store.profile.company}</strong><span>Perfil de cliente · datos ficticios</span></div></div><div className="field-grid two"><label className="field"><span>Empresa</span><input name="company" defaultValue={store.profile.company} required /></label><label className="field"><span>RUT de empresa</span><input name="rut" defaultValue={store.profile.rut} required /></label><label className="field"><span>Persona de contacto</span><input name="contact" defaultValue={store.profile.contact} required /></label><label className="field"><span>Teléfono</span><input name="phone" defaultValue={store.profile.phone} required /></label></div><div className="form-footer"><p>Los cambios se reflejan en las nuevas solicitudes.</p><button className="button button-primary" type="submit"><Check size={16} /> Guardar cambios</button></div></form></>;
}

const faqGroups = [
  { category: 'Solicitudes', icon: ClipboardList, title: '¿Cómo envío una solicitud?', answer: 'Completa el modelo de grúa, fecha, horario, ubicación y tipo de trabajo. La solicitud aparecerá como Pendiente mientras Operaciones revisa los antecedentes.' },
  { category: 'Agenda y estados', icon: CalendarDays, title: '¿Qué significan los estados?', answer: 'Pendiente y En revisión indican que el equipo está analizando los datos. Aprobada confirma la coordinación; En ejecución señala un trabajo iniciado. También puede quedar No atendida con su motivo.' },
  { category: 'Equipos', icon: Truck, title: '¿La solicitud confirma una grúa?', answer: 'No por sí sola. Operaciones revisa el modelo y asigna una unidad que esté disponible antes de aprobar el servicio.' },
  { category: 'Cambios y contacto', icon: MessageCircle, title: '¿Cómo consulto o informo un cambio?', answer: 'Envía una consulta, observación o reclamo desde este espacio. En la demo, el mensaje se guarda en la bandeja local para que Operaciones pueda responder.' },
];

function CustomerService({ store, onSend, faq, setFaq }: { store: Store; onSend: (event: FormEvent<HTMLFormElement>) => void; faq: number; setFaq: (index: number) => void }) {
  const ownMessages = store.messages.filter(item => item.client === store.profile.company);
  return <><PageIntro kicker="AYUDA Y CONTACTO" title="Servicio al cliente" description="Explora una categoría o envía una consulta, observación o reclamo." />
    <div className="customer-grid"><section className="panel faq-panel"><PanelTitle title="Preguntas frecuentes" /><div className="faq-tabs">{faqGroups.map((group, index) => { const Icon = group.icon; return <button key={group.category} className={faq === index ? 'faq-tab selected' : 'faq-tab'} onClick={() => setFaq(index)}><Icon size={16} />{group.category}<ChevronRight size={15} /></button>; })}</div><div className="faq-preview"><span className="eyebrow">{faqGroups[faq].category.toUpperCase()}</span><div className="faq-preview-icon"><HelpCircle size={20} /></div><h3>{faqGroups[faq].title}</h3><p>{faqGroups[faq].answer}</p><div className="faq-pagination">{faqGroups.map((item, index) => <button aria-label={`Ver ${item.category}`} key={item.category} className={faq === index ? 'current' : ''} onClick={() => setFaq(index)} />)}</div></div><div className="faq-secondary">{faqGroups.filter((_, index) => index !== faq).slice(0, 2).map(group => <button key={group.category} onClick={() => setFaq(faqGroups.indexOf(group))}><span>{group.category}</span><strong>{group.title}</strong><ChevronRight size={16} /></button>)}</div></section>
      <div className="customer-side"><form className="panel message-form" onSubmit={onSend}><PanelTitle title="Escríbenos" /><p className="panel-subtitle">Elige el tipo de mensaje y cuéntanos los detalles. Podrás consultar la respuesta en “Mis mensajes”.</p><label className="field"><span>Tipo de mensaje</span><select name="type"><option>Consulta</option><option>Observación</option><option>Reclamo</option></select></label><label className="field"><span>Asunto</span><input name="subject" maxLength={120} placeholder="Ej. Coordinación del servicio" required /></label><label className="field"><span>Mensaje</span><textarea name="body" rows={4} maxLength={1000} placeholder="Describe qué necesitas o qué ocurrió…" required /></label><button className="button button-primary full-button" type="submit"><Send size={15} /> Enviar mensaje</button><p className="local-note"><ShieldCheck size={14} /> En esta demo el mensaje se guarda localmente.</p></form>
      <section className="panel own-messages"><PanelTitle title="Mis mensajes" /><div className="list-rows">{ownMessages.length === 0 ? <div className="muted-empty">Aún no has enviado mensajes.</div> : ownMessages.map(item => <div className="message-mini" key={item.id}><div className="message-mini-top"><strong>{item.subject}</strong><StatusPill status={item.status} /></div><span>{item.type} · {dateLabel(item.date)}</span>{item.response && <p><b>Respuesta:</b> {item.response}</p>}</div>)}</div></section></div></div>
  </>;
}

function OperationsPanel({ store, onNavigate, onAction, onStatus, onAssign }: { store: Store; onNavigate: (page: Page) => void; onAction: (action: Action) => void; onStatus: (id: string, status: Status) => void; onAssign: (requestId: string, person: string) => void }) {
  const [filter, setFilter] = useState('Todas');
  const rows = store.requests.filter(item => filter === 'Todas' || item.status === filter);
  return <><PageIntro kicker="GESTIÓN DE SERVICIOS" title="Solicitudes y seguimiento" description="Revisa solicitudes, asigna recursos y registra cada avance del servicio." action={<button className="button button-outline" onClick={() => onNavigate('Agenda de operaciones')}><CalendarRange size={16} /> Ver agenda</button>} />
    <div className="filter-bar"><label>Filtrar por estado <select value={filter} onChange={event => setFilter(event.target.value)}>{['Todas', ...Object.values(statusLabels)].map(status => <option key={status}>{status}</option>)}</select></label><span>{rows.length} servicios</span></div>
    <div className="ops-request-list">{rows.map(request => { const availableForModel = store.equipment.filter(item => item.model === request.model && item.status === 'Disponible'); const assigned = store.assignments[request.id] ?? []; return <article className="ops-request-card" key={request.id}><div className="ops-request-top"><div><span className="request-id">{request.id}</span><h3>{request.client}</h3></div><StatusPill status={request.status} /></div><div className="ops-facts"><span><Truck size={15} />{request.model}</span><span><CalendarDays size={15} />{dateLabel(request.date)} · {request.start}–{request.end}</span><span><Building2 size={15} />{request.site}</span></div><p className="request-work">{request.work}</p>{request.status === 'No atendida' && <div className="reason-note"><AlertTriangle size={15} /><span><strong>No atendida:</strong> {reasonLabel(request.reason)}{request.reasonNote ? ` — ${request.reasonNote}` : ''}</span></div>}
        <div className="assignment-strip"><div><Users size={16} /><span>Personal asignado</span></div><div className="assignment-controls"><span>{assigned.length ? assigned.join(' · ') : 'Sin asignar'}</span><select aria-label={`Personal para ${request.id}`} defaultValue=""><option value="" disabled>Selecciona personal…</option>{staff.filter(person => !assigned.includes(person)).map(person => <option key={person}>{person}</option>)}</select><button className="small-button" onClick={event => { const select = event.currentTarget.previousElementSibling as HTMLSelectElement; if (select.value) { onAssign(request.id, select.value); select.value = ''; } }}><Plus size={14} /> Asignar</button></div></div>
        <div className="ops-actions">{request.status === 'Pendiente' && <><button className="small-button" onClick={() => onStatus(request.id, 'En revisión')}><Check size={14} /> Iniciar revisión</button><button className="small-button danger-outline" onClick={() => onAction({ kind: 'no-atendida', requestId: request.id })}>No atendida</button></>}{request.status === 'En revisión' && <><button className="small-button primary-small" disabled={availableForModel.length === 0} onClick={() => onAction({ kind: 'aprobar', requestId: request.id })}><Check size={14} /> Aprobar y asignar equipo</button><button className="small-button danger-outline" onClick={() => onAction({ kind: 'no-atendida', requestId: request.id })}>No atendida</button>{availableForModel.length === 0 && <span className="inline-warning"><AlertTriangle size={14} /> Sin equipo compatible disponible</span>}</>}{request.status === 'Aprobada' && <button className="small-button primary-small" onClick={() => onStatus(request.id, 'En ejecución')}><Truck size={14} /> Iniciar servicio</button>}{request.status === 'En ejecución' && <button className="small-button primary-small" onClick={() => onAction({ kind: 'cerrar', requestId: request.id })}><CheckCircle2 size={14} /> Cerrar y registrar operación</button>}{request.status === 'Terminada' && <span className="closed-note"><CheckCircle2 size={15} /> Servicio cerrado · datos internos en Resumen de costos</span>}</div>
      </article>; })}</div>
  </>;
}

function ActionDialog({ action, request, equipment, availableEquipment, onClose, onSubmit }: { action: NonNullable<Action>; request: RequestRow; equipment: Equipment[]; availableEquipment: Equipment[]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const availableForRequest = availableEquipment.filter(item => item.model === request.model);
  const title = action.kind === 'no-atendida' ? 'Marcar como no atendida' : action.kind === 'aprobar' ? 'Aprobar servicio' : 'Cerrar servicio';
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><span className="eyebrow">{request.id} · {request.model}</span><h2 id="modal-title">{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
    <form onSubmit={onSubmit}>{action.kind === 'no-atendida' && <><p className="modal-copy">Selecciona un motivo para conservarlo en el historial de la solicitud.</p><label className="field"><span>Motivo</span><select name="reason" required><option value="falta_capacidad">Falta de capacidad de flota</option><option value="equipo_no_disponible">Equipo no disponible</option><option value="otro">Otro motivo</option></select></label><label className="field"><span>Detalle (opcional)</span><textarea name="reasonNote" rows={3} placeholder="Agrega un contexto breve" /></label></>}
    {action.kind === 'aprobar' && <><p className="modal-copy">Solo aparecen unidades compatibles que actualmente están disponibles.</p>{availableForRequest.length ? <label className="field"><span>Equipo a asignar</span><select name="equipmentId" required>{availableForRequest.map(item => <option key={item.id} value={item.id}>{item.serial} · {item.model}</option>)}</select></label> : <div className="reason-note"><AlertTriangle size={16} /><span>No hay unidades disponibles para este modelo. Actualiza el estado de un equipo antes de aprobar.</span></div>}<div className="available-list">{equipment.filter(item => item.model === request.model).map(item => <span key={item.id}><i className={`availability-dot ${item.status === 'Disponible' ? 'available' : ''}`} />{item.serial} · {item.status}</span>)}</div></>}
    {action.kind === 'cerrar' && <><p className="modal-copy">Completa los datos internos de operación. Solo están disponibles para el rol de Operaciones en este simulador.</p><div className="field-grid two"><label className="field"><span>Horas efectivas de uso</span><input name="hours" type="number" min="0.1" step="0.1" defaultValue="3" required /></label><label className="field"><span>Consumo</span><input name="consumption" placeholder="Ej. 42 L diésel" /></label><label className="field field-full"><span>Repuestos o insumos</span><input name="supplies" placeholder="Materiales utilizados" /></label><label className="field field-full"><span>Mantención asociada</span><input name="maintenance" placeholder="Inspección, mantención o incidencia" /></label><label className="field field-full"><span>Recursos de traslado</span><input name="transport" placeholder="Vehículos o apoyo logístico" /></label></div></>}
      <div className="modal-footer"><button type="button" className="button button-outline" onClick={onClose}>Cancelar</button><button type="submit" className="button button-primary" disabled={action.kind === 'aprobar' && availableForRequest.length === 0}>{action.kind === 'cerrar' ? 'Guardar cierre' : action.kind === 'aprobar' ? 'Aprobar servicio' : 'Guardar motivo'}</button></div>
    </form></section></div>;
}

function equipmentPhoto(model: string) {
  if (model.startsWith('LRT') || model.startsWith('RT')) return '/images/nexo-crane-rough-terrain.png';
  if (model.includes('1060') || model.includes('1070')) return '/images/nexo-crane-allterrain-compact.png';
  return '/images/nexo-crane-allterrain-heavy.png';
}

function equipmentCategory(model: string) {
  if (model.startsWith('LRT')) return 'Terreno irregular · Serie LRT';
  if (model.startsWith('RT')) return 'Terreno irregular · Serie RT';
  return 'Todo terreno · Serie LTM';
}

function maintenanceCycle(item: Equipment) {
  if (!item.nextMaintenance) return { label: 'Fecha pendiente', percent: null as number | null, tone: 'unset' };
  const next = new Date(`${item.nextMaintenance}T12:00:00`);
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const days = Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
  const last = item.lastMaintenance ? new Date(`${item.lastMaintenance}T12:00:00`) : null;
  const span = last ? next.getTime() - last.getTime() : 0;
  const percent = last && span > 0 ? Math.max(0, Math.min(100, Math.round(((today.getTime() - last.getTime()) / span) * 100))) : null;
  return {
    label: days < 0 ? `Vencida hace ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}` : days === 0 ? 'Programada para hoy' : `En ${days} ${days === 1 ? 'día' : 'días'}`,
    percent,
    tone: days < 0 ? 'overdue' : days <= 30 ? 'soon' : 'normal',
  };
}

function EquipmentPage({ equipment, onAdd, onUpdate }: { equipment: Equipment[]; onAdd: (event: FormEvent<HTMLFormElement>) => void; onUpdate: (id: string, patch: Partial<Equipment>) => void }) {
  const [showForm, setShowForm] = useState(false);
  return <><PageIntro kicker="PLANIFICACIÓN DE FLOTA" title="Gestión de equipos" description="Administra el estado de cada unidad y registra sus fechas de mantención." action={<button className="button button-primary" onClick={() => setShowForm(previous => !previous)}><Plus size={16} />{showForm ? 'Cerrar formulario' : 'Agregar equipo'}</button>} />
    <div className="metrics-grid four"><Metric label="Total" value={equipment.length} hint="Unidades de demostración" icon={Truck} /><Metric label="Disponibles" value={equipment.filter(item => item.status === 'Disponible').length} hint="Aptas para asignación" icon={CheckCircle2} /><Metric label="En mantención" value={equipment.filter(item => item.status === 'En mantención').length} hint="Actualmente en taller" icon={Wrench} /><Metric label="Fuera de servicio" value={equipment.filter(item => item.status === 'Fuera de servicio').length} hint={`${equipment.filter(item => item.status === 'Mantención próxima').length} con mantención próxima`} icon={AlertTriangle} /></div>
    {showForm && <form className="panel add-equipment-form" onSubmit={event => { onAdd(event); setShowForm(false); }}><PanelTitle title="Agregar unidad de prueba" /><div className="field-grid four"><label className="field"><span>Número de serie</span><input name="serial" placeholder="DEMO-106" required /></label><label className="field"><span>Modelo</span><select name="model">{models.map(model => <option key={model}>{model}</option>)}</select></label><label className="field"><span>Estado inicial</span><select name="status">{equipmentStatuses.map(status => <option key={status}>{status}</option>)}</select></label><label className="field"><span>Próxima mantención</span><input name="nextMaintenance" type="date" /></label><label className="field field-full"><span>Notas</span><input name="notes" placeholder="Nota de demostración" /></label></div><div className="form-footer"><span className="local-note"><ShieldCheck size={14} /> Cambios solo locales</span><button className="button button-primary" type="submit"><Plus size={15} /> Agregar unidad</button></div></form>}
    <div className="panel equipment-panel"><PanelTitle title="Unidades de flota" action={<span className="table-caption">Imágenes referenciales · estados y fechas editables</span>} /><div className="equipment-list">{equipment.map(item => { const cycle = maintenanceCycle(item); return <article className="equipment-card" key={item.id}>
      <div className="equipment-photo"><img src={equipmentPhoto(item.model)} alt={`Imagen referencial de grúa ${item.model}`} loading="lazy" /><div className="equipment-photo-top"><span>{equipmentCategory(item.model)}</span><StatusPill status={item.status} /></div><span className="equipment-photo-note">FOTO REFERENCIAL</span></div>
      <div className="equipment-card-body"><div className="equipment-card-title"><div><span className="equipment-serial">{item.serial}</span><h3>{item.model}</h3></div><span className="equipment-category">{equipmentCategory(item.model)}</span></div><p className="equipment-notes">{item.notes || 'Sin notas registradas.'}</p>
        <div className={`maintenance-cycle ${cycle.tone}`}><div className="maintenance-cycle-head"><span><Wrench size={15} /> Ciclo de mantención</span><strong>{cycle.label}</strong></div>{cycle.percent === null ? <div className="maintenance-track" aria-hidden="true" /> : <div className="maintenance-track" role="progressbar" aria-label={`Ciclo de mantención de ${item.model}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={cycle.percent}><i style={{ width: `${cycle.percent}%` }} /></div>}<small>{cycle.percent === null ? 'Registra la última mantención para estimar el avance del ciclo.' : `${cycle.percent}% del intervalo desde la última mantención`}</small></div>
        <div className="equipment-dates"><span><Clock3 size={15} /> Última mantención <b>{item.lastMaintenance ? dateLabel(item.lastMaintenance) : 'Sin registro'}</b></span><span><CalendarDays size={15} /> Próxima mantención <b>{item.nextMaintenance ? dateLabel(item.nextMaintenance) : 'Por programar'}</b></span></div>
        <div className="equipment-edit"><label><span>Estado del equipo</span><select value={item.status} onChange={event => onUpdate(item.id, { status: event.target.value as EquipmentStatus })}>{equipmentStatuses.map(status => <option key={status}>{status}</option>)}</select></label><label><span>Próxima fecha</span><input type="date" value={item.nextMaintenance} onChange={event => onUpdate(item.id, { nextMaintenance: event.target.value })} /></label></div>
      </div></article>; })}</div><div className="equipment-footnote"><AlertTriangle size={16} /> Solo los equipos con estado Disponible se pueden asignar a una solicitud.</div></div>
  </>;
}

function CostsPage({ requests }: { requests: RequestRow[] }) {
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const completed = requests.filter(item => item.status === 'Terminada' && item.operations).filter(item => (!from || item.date >= from) && (!to || item.date <= to));
  const totalHours = completed.reduce((sum, item) => sum + (item.operations?.hours ?? 0), 0);
  function exportCsv() {
    const rows = [['Solicitud', 'Cliente', 'Fecha', 'Modelo', 'Horas efectivas', 'Consumo', 'Repuestos e insumos', 'Mantención asociada', 'Recursos de traslado'], ...completed.map(item => [item.id, item.client, item.date, item.model, String(item.operations?.hours ?? ''), item.operations?.consumption ?? '', item.operations?.supplies ?? '', item.operations?.maintenance ?? '', item.operations?.transport ?? ''])];
    const csv = rows.map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })); link.download = 'resumen-operacional-demo.csv'; link.click(); URL.revokeObjectURL(link.href);
  }
  return <><PageIntro kicker="CIERRES DE SERVICIO" title="Resumen operacional" description="Consulta y exporta la información interna registrada al cerrar cada trabajo." action={<button className="button button-primary" onClick={exportCsv} disabled={!completed.length}><Download size={16} /> Exportar CSV</button>} /><div className="metrics-grid three"><Metric label="Servicios cerrados" value={completed.length} hint="Con registro operacional" icon={CheckCircle2} /><Metric label="Horas efectivas" value={totalHours.toFixed(1)} hint="Horas de uso registradas" icon={Clock3} /><Metric label="Registros exportables" value={completed.length} hint="Aplicando los filtros" icon={BarChart3} /></div><section className="panel costs-panel"><div className="costs-toolbar"><PanelTitle title="Detalle de operación" /><div className="date-filters"><label>Desde<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>Hasta<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label></div></div>{completed.length ? <div className="cost-cards">{completed.map(item => <article className="cost-card" key={item.id}><div className="cost-card-head"><div><span className="request-id">{item.id}</span><h3>{item.client}</h3></div><span className="hours-tag">{item.operations?.hours.toFixed(1)} h</span></div><div className="cost-grid"><CostItem label="Servicio" value={`${item.model} · ${dateLabel(item.date)}`} /><CostItem label="Consumo" value={item.operations?.consumption || 'Sin dato'} /><CostItem label="Repuestos e insumos" value={item.operations?.supplies || 'Sin dato'} /><CostItem label="Mantención asociada" value={item.operations?.maintenance || 'Sin dato'} /><CostItem label="Traslado" value={item.operations?.transport || 'Sin dato'} /></div></article>)}</div> : <EmptyState icon={BarChart3} title="No hay cierres en este periodo" body="Cierra un servicio desde el panel de Operaciones para ver sus datos internos aquí." />}<p className="internal-note"><ShieldCheck size={15} /> Información interna de Operaciones · no aparece en el espacio Cliente.</p></section></>;
}
function CostItem({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }

function InboxPage({ messages, onReply }: { messages: ServiceMessage[]; onReply: (id: string, response: string) => void }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  return <><PageIntro kicker="ATENCIÓN A CLIENTES" title="Mensajes de clientes" description="Revisa consultas, observaciones y reclamos enviados desde el simulador." /><div className="message-inbox">{messages.map(message => <article className="panel inbox-card" key={message.id}><div className="inbox-top"><div className="message-type-icon"><Mail size={18} /></div><div className="inbox-title"><div><span className="request-id">{message.type} · {dateLabel(message.date)}</span><h3>{message.subject}</h3></div><StatusPill status={message.status} /></div></div><div className="inbox-client"><Building2 size={14} />{message.client}</div><p className="inbox-body">{message.body}</p>{message.response && <div className="reply-existing"><strong>Respuesta enviada</strong><p>{message.response}</p></div>}{message.status !== 'Respondido' && <div className="reply-box"><textarea rows={2} value={drafts[message.id] ?? ''} onChange={event => setDrafts(previous => ({ ...previous, [message.id]: event.target.value }))} placeholder="Escribe una respuesta para el historial" /><button className="small-button primary-small" disabled={!(drafts[message.id] ?? '').trim()} onClick={() => { const response = drafts[message.id]?.trim(); if (response) { onReply(message.id, response); setDrafts(previous => ({ ...previous, [message.id]: '' })); } }}><Send size={14} /> Responder</button></div>}</article>)}</div>{!messages.length && <EmptyState icon={Inbox} title="Bandeja vacía" body="Los mensajes nuevos aparecerán aquí." />}</>;
}

function EmptyState({ icon: Icon, title, body }: { icon: typeof Truck; title: string; body: string }) { return <div className="empty-state"><div><Icon size={22} /></div><strong>{title}</strong><p>{body}</p></div>; }
function reasonLabel(reason?: string) { return reason === 'falta_capacidad' ? 'Falta de capacidad de flota' : reason === 'equipo_no_disponible' ? 'Equipo no disponible' : reason === 'otro' ? 'Otro motivo' : reason || 'Sin motivo indicado'; }

export default App;
