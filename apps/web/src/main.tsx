import React, { Component, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react/ArrowRight';
import { Check } from '@phosphor-icons/react/Check';
import { Clipboard } from '@phosphor-icons/react/Clipboard';
import { Code } from '@phosphor-icons/react/Code';
import { Cpu } from '@phosphor-icons/react/Cpu';
import { List } from '@phosphor-icons/react/List';
import { LockKey } from '@phosphor-icons/react/LockKey';
import { SignOut } from '@phosphor-icons/react/SignOut';
import { TerminalWindow } from '@phosphor-icons/react/TerminalWindow';
import { UserCircle } from '@phosphor-icons/react/UserCircle';
import { X } from '@phosphor-icons/react/X';
import cliScreenshotAvif from './assets/fouad-cli-terminal.avif';
import cliScreenshotPng from './assets/fouad-cli-terminal.png';
import cliScreenshotWebp from './assets/fouad-cli-terminal.webp';
import './styles.css';

type AuthMode = 'login' | 'register';
type ApiState = { loading: boolean; error: string; success: string };
type CurrentUser = { id: string; email?: string; role: string };
type Provider = {
  id: string;
  slug: string;
  name: string;
  adapter: string;
  base_url: string | null;
  secret_reference: string | null;
  enabled: boolean;
  priority: number;
  timeout_ms: number;
  maintenance: boolean;
};

class GlobalErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Fouad CLI web render failed', { name: error.name, message: error.message });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatal-error" role="alert">
        <div className="fatal-error-card">
          <span className="brand-mark">F</span>
          <p className="eyebrow">Interface error</p>
          <h1>The page could not be displayed.</h1>
          <p>Reload the page. If the problem continues, check the platform status.</p>
          <div className="button-row">
            <button className="button" onClick={() => location.reload()}>
              Reload
            </button>
            <a className="button secondary" href="/status">
              Platform status
            </a>
          </div>
        </div>
      </main>
    );
  }
}

const docs = {
  '/docs': ['Documentation', 'Everything needed to install, configure, and extend Fouad CLI.'],
  '/docs/getting-started': [
    'Getting started',
    'Install the CLI, run doctor, then connect your account.',
  ],
  '/docs/commands': [
    'Commands',
    'Use fouad, ask, doctor, providers, plugins, skills, MCP, and sessions.',
  ],
  '/docs/models': [
    'Models and providers',
    'Hosted models use the secure gateway. Local models stay on your device.',
  ],
  '/docs/plugins': [
    'Plugins',
    'Add commands and tools through a permissioned, versioned plugin interface.',
  ],
  '/docs/skills': [
    'Skills',
    'Reusable instruction packages remain subordinate to core security rules.',
  ],
  '/docs/security': [
    'Security and privacy',
    'Secrets stay server-side. Local files require explicit permissions.',
  ],
} as const;

const nav = [
  ['/#features', 'Features'],
  ['/docs', 'Documentation'],
  ['/download', 'Download'],
  ['/docs/plugins', 'Plugins'],
  ['/docs/models', 'Models'],
  ['/changelog', 'Changelog'],
] as const;

function App() {
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => setMenu(false), [location.pathname]);
  return (
    <div className="site-shell">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="nav-shell">
        <Link className="brand" to="/" aria-label="Fouad CLI home">
          <span className="brand-mark">F</span>
          <span>Fouad CLI</span>
        </Link>
        <nav className={menu ? 'nav-links open' : 'nav-links'} aria-label="Primary navigation">
          {nav.map(([path, label]) => (
            <NavLink key={path} to={path}>
              {label}
            </NavLink>
          ))}
          <div className="nav-mobile-auth">
            <Link className="text-link" to="/login">
              Sign in
            </Link>
            <Link className="button button-small" to="/register">
              Create account
            </Link>
          </div>
        </nav>
        <div className="nav-actions">
          <a
            className="text-link desktop-only"
            href="https://www.npmjs.com/package/fouad-ai"
            target="_blank"
            rel="noreferrer"
          >
            npm
          </a>
          <Link className="text-link desktop-only" to="/login">
            Sign in
          </Link>
          <Link className="button button-small desktop-only" to="/register">
            Create account
          </Link>
          <button
            className="icon-button mobile-only"
            onClick={() => setMenu(!menu)}
            aria-label="Open navigation"
          >
            {menu ? <X /> : <List />}
          </button>
        </div>
      </header>
      <main id="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/download" element={<Download />} />
          {Object.entries(docs).map(([path, copy]) => (
            <Route key={path} path={path} element={<Docs title={copy[0]} intro={copy[1]} />} />
          ))}
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route
            path="/cli/authorize"
            element={
              <Protected>
                <Authorize />
              </Protected>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/profile"
            element={
              <Protected>
                <AccountPage
                  title="Profile"
                  copy="Update display name, username, avatar, and locale. Roles and plans cannot be changed here."
                />
              </Protected>
            }
          />
          <Route
            path="/devices"
            element={
              <Protected>
                <AccountPage
                  title="CLI devices"
                  copy="Review linked devices and revoke sessions you no longer use."
                />
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected role="admin">
                <Admin />
              </Protected>
            }
          />
          <Route path="/status" element={<Status />} />
          <Route
            path="/maintenance"
            element={
              <Content
                title="Platform maintenance"
                copy="The hosted backend is temporarily unavailable. Public documentation and downloads remain available."
              />
            }
          />
          <Route
            path="/changelog"
            element={
              <Content
                title="Changelog"
                copy="Release notes are sourced from verified platform releases. Version 0.1.0 is prepared locally and npm publication is pending."
              />
            }
          />
          <Route
            path="/roadmap"
            element={
              <Content
                title="Roadmap"
                copy="Current priorities include secure browser login, provider aliases, stronger release signing, and broader platform testing. No dates are promised."
              />
            }
          />
          <Route
            path="/open-source"
            element={
              <Content
                title="Open source today"
                copy="Fouad CLI is currently open source under Apache-2.0. Optional hosted services may be introduced later without removing the local code."
              />
            }
          />
          <Route
            path="/privacy"
            element={
              <Content
                title="Privacy"
                copy="Telemetry is off by default. Project files are not sent to hosted providers without a configured account and an explicit request."
              />
            }
          />
          <Route
            path="/terms"
            element={
              <Content
                title="Terms"
                copy="Hosted AI usage is subject to provider limits and policies. Free allocations can change. Do not upload content you are not authorized to process."
              />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function Protected({ children, role }: { children: React.ReactNode; role?: 'admin' }) {
  const [state, setState] = useState<{
    loading: boolean;
    user: CurrentUser | null;
    unavailable: boolean;
  }>({ loading: true, user: null, unavailable: false });

  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/me', { signal: AbortSignal.timeout(8_000) })
      .then(async (result) => {
        if (result.status === 401) return null;
        if (!result.ok) throw new Error('auth unavailable');
        const payload = (await result.json()) as { user: CurrentUser };
        return payload.user;
      })
      .then((user) => active && setState({ loading: false, user, unavailable: false }))
      .catch(() => active && setState({ loading: false, user: null, unavailable: true }));
    return () => {
      active = false;
    };
  }, []);

  if (state.loading) return <Page title="Checking access" intro="Verifying your secure session…" />;
  if (state.unavailable)
    return (
      <Page
        title="Account service unavailable"
        intro="The public website remains available while account services recover."
      >
        <Link className="button" to="/status">
          Platform status
        </Link>
      </Page>
    );
  if (!state.user)
    return (
      <Page title="Sign in required" intro="Sign in before opening this protected page.">
        <Link className="button" to="/login">
          Sign in
        </Link>
      </Page>
    );
  if (role === 'admin' && state.user.role !== 'admin')
    return <Page title="403 — Access denied" intro="Administrator access is required." />;
  return children;
}

function Home() {
  return (
    <>
      <section className="hero section-wrap">
        <div className="hero-copy reveal">
          <p className="eyebrow">
            <span className="status-dot" /> Open-source AI workspace
          </p>
          <h1>Your AI workspace, directly in the terminal.</h1>
          <p className="hero-lede">
            Move from question to working code without leaving your shell. Switch models, run
            permissioned tools, and extend the workflow with plugins and skills.
          </p>
          <div className="button-row">
            <Link className="button" to="/download">
              Install Fouad CLI <ArrowRight />
            </Link>
            <Link className="button secondary" to="/docs/getting-started">
              View documentation
            </Link>
          </div>
          <CommandBox command="npm install -g fouad-ai" shell="npm" variant="hero" />
          <div className="trust-row" aria-label="Product capabilities">
            <span>Apache-2.0</span>
            <span>Node.js 22+</span>
            <span>Local and hosted models</span>
          </div>
        </div>
        <HeroPreview />
      </section>
      <section className="section-wrap feature-layout" id="features">
        <div>
          <p className="eyebrow">Built for real repositories</p>
          <h2>One interface. Your tools. Your rules.</h2>
          <p>Use hosted providers or local inference without changing the way you work.</p>
        </div>
        <div className="feature-grid">
          <article className="feature feature-wide">
            <TerminalWindow />
            <h3>Terminal native</h3>
            <p>
              Streaming chat, slash commands, sessions, tools, diffs, and approvals in a responsive
              TUI.
            </p>
          </article>
          <article className="feature tinted">
            <LockKey />
            <h3>Permission first</h3>
            <p>Workspace boundaries and explicit approval protect files and commands.</p>
          </article>
          <article className="feature">
            <Cpu />
            <h3>Provider flexible</h3>
            <p>Aliases let administrators change hosted models without forcing a CLI update.</p>
          </article>
          <article className="feature patterned">
            <Code />
            <h3>Built to extend</h3>
            <p>Plugins, skills, and MCP share validated registries and failure isolation.</p>
          </article>
        </div>
      </section>
      <section className="section-wrap flow">
        <p className="eyebrow">How it works</p>
        <h2>From install to first prompt in minutes.</h2>
        <div className="flow-steps">
          <article>
            <strong>01</strong>
            <h3>Install</h3>
            <p>Add the CLI globally with npm.</p>
          </article>
          <article>
            <strong>02</strong>
            <h3>Connect</h3>
            <p>Link your account through the browser.</p>
          </article>
          <article>
            <strong>03</strong>
            <h3>Build</h3>
            <p>
              Run <code>fouad</code> from any workspace.
            </p>
          </article>
        </div>
        <CommandBox
          command="npm install -g fouad-ai\nfouad doctor\nfouad login\nfouad"
          shell="bash"
          multiline
        />
        <Link className="arrow-link" to="/docs/getting-started">
          Read the quick start <ArrowRight />
        </Link>
      </section>
      <section className="section-wrap privacy-panel">
        <div>
          <LockKey size={34} />
          <h2>Your workspace is not a product.</h2>
        </div>
        <p>
          Local tools stay permissioned. Shared provider keys remain inside Cloudflare. Supabase
          manages passwords and identity.
        </p>
      </section>
      <section className="section-wrap final-cta">
        <p className="eyebrow">Ready when your terminal is</p>
        <h2>Start your next session.</h2>
        <p>Install Fouad CLI globally and open it from any project.</p>
        <CommandBox command="npm install -g fouad-ai" shell="npm" variant="cta" />
      </section>
    </>
  );
}

function HeroPreview() {
  const frame = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  function tilt(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    event.currentTarget.style.setProperty('--tilt-x', `${-y * 5}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${x * 7}deg`);
  }
  function reset() {
    frame.current?.style.setProperty('--tilt-x', '0deg');
    frame.current?.style.setProperty('--tilt-y', '0deg');
  }
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    addEventListener('keydown', close);
    return () => removeEventListener('keydown', close);
  }, [open]);
  const picture = (loading: 'eager' | 'lazy') => (
    <picture>
      <source srcSet={cliScreenshotAvif} type="image/avif" />
      <source srcSet={cliScreenshotWebp} type="image/webp" />
      <img
        src={cliScreenshotPng}
        width="1665"
        height="945"
        loading={loading}
        fetchPriority="high"
        decoding="async"
        alt="Fouad CLI terminal interface"
      />
    </picture>
  );
  return (
    <>
      <figure
        ref={frame}
        className="hero-terminal reveal delay-one"
        onPointerMove={tilt}
        onPointerLeave={reset}
      >
        <div className="terminal-chrome">
          <i />
          <i />
          <i />
          <span>fouad — workspace</span>
        </div>
        <button
          className="terminal-image-button"
          onClick={() => setOpen(true)}
          aria-label="Open Fouad CLI terminal screenshot full size"
        >
          {picture('eager')}
        </button>
        <span className="command-token token-one">/models</span>
        <span className="command-token token-two">/skills</span>
        <span className="command-token token-three">/agents</span>
        <figcaption>Actual Fouad CLI interface · click to expand</figcaption>
      </figure>
      {open ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Fouad CLI terminal screenshot"
          onClick={() => setOpen(false)}
        >
          <button
            className="lightbox-close"
            onClick={() => setOpen(false)}
            aria-label="Close screenshot"
          >
            ×
          </button>
          <div onClick={(event) => event.stopPropagation()}>{picture('lazy')}</div>
        </div>
      ) : null}
    </>
  );
}

function CommandBox({
  command,
  shell,
  multiline = false,
  variant = '',
}: {
  command: string;
  shell: string;
  multiline?: boolean;
  variant?: string;
}) {
  return (
    <div className={`command-box ${variant}`}>
      <div className="command-meta">
        <TerminalWindow size={16} />
        <span>{shell}</span>
      </div>
      <code className={multiline ? 'multiline' : ''}>{command}</code>
      <Copy text={command} />
    </div>
  );
}

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copy-button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const area = document.createElement('textarea');
          area.value = text;
          area.setAttribute('readonly', '');
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.append(area);
          area.select();
          document.execCommand('copy');
          area.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      aria-label="Copy command"
    >
      {done ? <Check /> : <Clipboard />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

function Download() {
  const detected = /Win/i.test(navigator.userAgent)
    ? 'windows'
    : /Mac/i.test(navigator.userAgent)
      ? 'macos'
      : 'linux';
  const [os, setOs] = useState(detected);
  const [tab, setTab] = useState('npm');
  const command = 'npm install -g fouad-ai';
  return (
    <Page
      title="Install Fouad CLI"
      intro="Choose your platform and verify every step before opening your first session."
    >
      <div className="selector" role="tablist" aria-label="Operating system">
        {['linux', 'macos', 'windows'].map((item) => (
          <button role="tab" aria-selected={os === item} key={item} onClick={() => setOs(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="download-grid">
        <section className="install-panel">
          <div className="selector compact">
            {['npm'].map((item) => (
              <button key={item} aria-pressed={tab === item} onClick={() => setTab(item)}>
                {item}
              </button>
            ))}
          </div>
          <CommandBox command={command} shell={os === 'windows' ? 'PowerShell' : tab} />
        </section>
        <aside className="requirements">
          <h2>Requirements</h2>
          <p>Node.js 22 or newer</p>
          <p>Linux, macOS, or Windows</p>
          <p>Internet for hosted providers</p>
        </aside>
      </div>
      <section className="verify">
        <h2>Verify installation</h2>
        {['fouad --version', 'fouad doctor', 'fouad login', 'fouad'].map((c) => (
          <CommandBox command={c} shell="bash" key={c} />
        ))}
        <h2>Update</h2>
        <CommandBox command="npm install -g fouad-ai@latest" shell="npm" />
        <h2>Uninstall</h2>
        <CommandBox command="npm uninstall -g fouad-ai" shell="npm" />
        <p>
          <strong>Update:</strong> install the reviewed latest release. <strong>Uninstall:</strong>{' '}
          run <code>npm uninstall -g fouad-ai</code>. User data is retained until you remove it
          explicitly.
        </p>
      </section>
    </Page>
  );
}

function Auth({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<ApiState>({ loading: false, error: '', success: '' });
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ loading: true, error: '', success: '' });
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (mode === 'register' && data.password !== data.confirmPassword)
      return setState({ loading: false, error: 'Passwords do not match.', success: '' });
    try {
      const response = await fetch(`/api/v1/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(12_000),
      });
      const body = (await response.json()) as { error?: string; requestId?: string };
      if (!response.ok)
        throw new Error(
          `${body.error || 'Request failed'}${body.requestId ? ` (request ${body.requestId})` : ''}`,
        );
      setState({
        loading: false,
        error: '',
        success:
          mode === 'login'
            ? 'Signed in. Open your dashboard.'
            : 'Account created. You can sign in now.',
      });
      window.setTimeout(() => navigate(mode === 'login' ? '/dashboard' : '/login'), 250);
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Request failed',
        success: '',
      });
    }
  }
  return (
    <Page
      title={mode === 'login' ? 'Sign in' : 'Create your account'}
      intro="Email and password only. Supabase Auth securely manages your password."
    >
      <form className="auth-form" onSubmit={submit}>
        {mode === 'register' ? (
          <>
            <label>
              Username
              <input name="username" minLength={3} required autoComplete="username" />
            </label>
            <label>
              Display name
              <input name="displayName" required autoComplete="name" />
            </label>
          </>
        ) : null}
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            minLength={12}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>
        {mode === 'register' ? (
          <label>
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
            />
          </label>
        ) : null}
        {state.error ? (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="form-success" role="status">
            {state.success}
          </p>
        ) : null}
        <button className="button" disabled={state.loading}>
          {state.loading ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <p className="form-note">
          There is no automated password recovery. If access is lost, contact an administrator.
        </p>
      </form>
    </Page>
  );
}

function Authorize() {
  const code = new URLSearchParams(location.search).get('user_code');
  const [state, setState] = useState<ApiState>({ loading: false, error: '', success: '' });
  async function decide(decision: 'approve' | 'deny') {
    if (!code) return;
    setState({ loading: true, error: '', success: '' });
    try {
      const result = await fetch(`/api/v1/auth/device/${decision}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userCode: code }),
        signal: AbortSignal.timeout(8_000),
      });
      const payload = (await result.json()) as { error?: string; requestId?: string };
      if (!result.ok)
        throw new Error(
          `${payload.error ?? 'Authorization failed'}${payload.requestId ? ` (request ${payload.requestId})` : ''}`,
        );
      setState({
        loading: false,
        error: '',
        success:
          decision === 'approve'
            ? 'Device approved. Return to your terminal.'
            : 'Device request denied.',
      });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Authorization failed',
        success: '',
      });
    }
  }
  return (
    <Page
      title="Authorize Fouad CLI"
      intro="Review the device before allowing it to access your account."
    >
      <div className="authorize-card">
        <TerminalWindow size={34} />
        <h2>{code ? `Code ${code}` : 'No authorization code supplied'}</h2>
        <p>
          Start with <code>fouad login</code>. The CLI will open this page with a short-lived code.
        </p>
        <div className="button-row">
          <button
            className="button"
            disabled={!code || state.loading}
            onClick={() => decide('approve')}
          >
            Allow device
          </button>
          <button
            className="button secondary"
            disabled={!code || state.loading}
            onClick={() => decide('deny')}
          >
            Deny
          </button>
        </div>
        {state.error ? (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="form-success" role="status">
            {state.success}
          </p>
        ) : null}
      </div>
    </Page>
  );
}
function Dashboard() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/v1/auth/me', { signal: AbortSignal.timeout(8_000) })
      .then(async (result) => {
        if (!result.ok) throw new Error('Unable to load account');
        return (await result.json()) as { user: CurrentUser };
      })
      .then((payload) => setUser(payload.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  return (
    <Page title="Dashboard" intro="Your account, usage, models, and linked CLI devices.">
      <section className="account-summary">
        <div>
          <p className="eyebrow">Signed-in account</p>
          <h2>{loading ? 'Loading account…' : (user?.email ?? 'Account session')}</h2>
          <p>{user ? `User ID ${user.id}` : 'Your session could not be loaded.'}</p>
        </div>
        <div className="account-summary-meta">
          <span className="badge">{user?.role ?? 'user'}</span>
          {user?.role === 'admin' ? (
            <Link className="button" to="/admin">
              Open admin dashboard <ArrowRight />
            </Link>
          ) : null}
        </div>
      </section>
      <div className="dashboard-grid">
        <AccountPage
          title="Free plan"
          copy="The open-source CLI is available now. Hosted quotas depend on current provider limits."
        />
        <AccountPage
          title="No linked devices"
          copy="Run fouad login to securely connect this computer."
        />
        <AccountPage
          title="Provider status"
          copy="Provider configuration becomes available after server secrets and database migrations are applied."
        />
      </div>
    </Page>
  );
}
function AccountPage({ title, copy }: { title: string; copy: string }) {
  return (
    <section className="account-card">
      <UserCircle size={30} />
      <h2>{title}</h2>
      <p>{copy}</p>
    </section>
  );
}
function Admin() {
  const [tab, setTab] = useState('Providers');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [state, setState] = useState<ApiState>({ loading: true, error: '', success: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    slug: '',
    name: '',
    adapter: 'google-gemini',
    baseUrl: '',
    secretReference: 'GOOGLE_AI_API_KEY',
    enabled: false,
    priority: 100,
    timeoutMs: 30000,
    maintenance: false,
  });

  const loadProviders = () => {
    setState({ loading: true, error: '', success: '' });
    fetch('/api/v1/admin/providers', { signal: AbortSignal.timeout(10_000) })
      .then(async (result) => {
        const payload = (await result.json()) as { providers?: Provider[]; error?: string };
        if (!result.ok) throw new Error(payload.error ?? 'Provider storage is not ready.');
        return payload.providers ?? [];
      })
      .then((items) => {
        setProviders(items);
        setState({ loading: false, error: '', success: '' });
      })
      .catch((error: unknown) =>
        setState({
          loading: false,
          error: error instanceof Error ? error.message : 'Unable to load providers.',
          success: '',
        }),
      );
  };
  useEffect(loadProviders, []);

  const selectProvider = (provider: Provider) => {
    setEditing(provider.id);
    setShowForm(true);
    setForm({
      slug: provider.slug,
      name: provider.name,
      adapter: provider.adapter,
      baseUrl: provider.base_url ?? '',
      secretReference: provider.secret_reference ?? '',
      enabled: provider.enabled,
      priority: provider.priority,
      timeoutMs: provider.timeout_ms,
      maintenance: provider.maintenance,
    });
  };
  const saveProvider = async (event: React.FormEvent) => {
    event.preventDefault();
    setState({ loading: true, error: '', success: '' });
    try {
      const result = await fetch(
        editing ? `/api/v1/admin/providers/${editing}` : '/api/v1/admin/providers',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(form),
          signal: AbortSignal.timeout(10_000),
        },
      );
      const payload = (await result.json()) as {
        provider?: Provider;
        error?: string;
        requestId?: string;
      };
      if (!result.ok)
        throw new Error(
          `${payload.error ?? 'Unable to save provider.'}${payload.requestId ? ` (request ${payload.requestId})` : ''}`,
        );
      setEditing(null);
      setShowForm(false);
      setState({ loading: false, error: '', success: 'Provider settings saved.' });
      loadProviders();
    } catch (error: unknown) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Unable to save provider.',
        success: '',
      });
    }
  };

  return (
    <Page
      title="Admin control"
      intro="Server authorization is required. This interface never exposes provider keys or user passwords."
    >
      <div className="admin-nav">
        {[
          'Overview',
          'Users',
          'Devices',
          'Providers',
          'Models',
          'Content',
          'Security',
          'Settings',
        ].map((x) => (
          <button key={x} aria-pressed={tab === x} onClick={() => setTab(x)}>
            {x}
          </button>
        ))}
      </div>
      {tab === 'Providers' ? (
        <section className="provider-admin">
          <div className="provider-admin-header">
            <div>
              <p className="eyebrow">API gateway</p>
              <h2>Provider configuration</h2>
              <p className="notice">
                Change the active adapter without shipping a new CLI. API keys stay in Cloudflare
                Worker secrets; this page stores only the secret name reference.
              </p>
            </div>
            <button
              className="button"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
                setForm({ ...form, slug: '', name: '', enabled: false });
              }}
            >
              Add provider <ArrowRight />
            </button>
          </div>
          {state.error ? <p className="form-error">{state.error}</p> : null}
          {state.success ? <p className="form-success">{state.success}</p> : null}
          {state.loading && !providers.length ? (
            <p className="notice">Loading provider registry…</p>
          ) : null}
          <div className="provider-grid">
            {providers.map((provider) => (
              <button
                className={`provider-card${editing === provider.id ? ' selected' : ''}`}
                key={provider.id}
                onClick={() => selectProvider(provider)}
              >
                <span className="provider-card-top">
                  <strong>{provider.name}</strong>
                  <span
                    className={
                      provider.enabled && !provider.maintenance ? 'status-dot' : 'status-muted'
                    }
                  >
                    {provider.enabled && !provider.maintenance ? 'Live' : 'Paused'}
                  </span>
                </span>
                <span>{provider.adapter}</span>
                <span className="provider-meta">
                  {provider.secret_reference || 'No secret reference'} · priority{' '}
                  {provider.priority}
                </span>
              </button>
            ))}
          </div>
          {!state.loading && !providers.length && !state.error ? (
            <div className="empty-state provider-empty">
              <LockKey size={32} />
              <h3>No providers configured</h3>
              <p>
                Apply the provider registry migration, then add your first server-side API adapter.
              </p>
            </div>
          ) : null}
          {(showForm || !providers.length) && !state.error ? (
            <form className="provider-form" onSubmit={saveProvider}>
              <div className="provider-form-heading">
                <div>
                  <p className="eyebrow">{editing ? 'Edit provider' : 'New provider'}</p>
                  <h3>{editing ? 'Update routing settings' : 'Add an API adapter'}</h3>
                </div>
                {showForm ? (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setEditing(null);
                      setShowForm(false);
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
              <div className="provider-form-grid">
                <label>
                  Display name
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  Slug
                  <input
                    required
                    pattern="[a-z0-9][a-z0-9_-]*"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  />
                </label>
                <label>
                  Adapter
                  <select
                    value={form.adapter}
                    onChange={(e) => setForm({ ...form, adapter: e.target.value })}
                  >
                    <option value="google-gemini">Google Gemini</option>
                    <option value="openai-compatible">OpenAI-compatible</option>
                    <option value="ollama">Ollama</option>
                    <option value="llama-local">Local llama.cpp</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                <label>
                  Base URL (HTTPS)
                  <input
                    value={form.baseUrl}
                    placeholder="https://api.example.com"
                    onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  />
                </label>
                <label>
                  Worker secret name
                  <input
                    value={form.secretReference}
                    placeholder="GOOGLE_AI_API_KEY"
                    onChange={(e) =>
                      setForm({ ...form, secretReference: e.target.value.toUpperCase() })
                    }
                  />
                  <small>Enter the name only. Add the value privately with Wrangler.</small>
                </label>
                <label>
                  Priority
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Timeout (ms)
                  <input
                    type="number"
                    min="1000"
                    max="120000"
                    value={form.timeoutMs}
                    onChange={(e) => setForm({ ...form, timeoutMs: Number(e.target.value) })}
                  />
                </label>
              </div>
              <div className="provider-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  />{' '}
                  Enabled for hosted requests
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={form.maintenance}
                    onChange={(e) => setForm({ ...form, maintenance: e.target.checked })}
                  />{' '}
                  Maintenance mode
                </label>
              </div>
              <p className="form-note">
                Never paste an API key here. Use{' '}
                <code>wrangler secret put {form.secretReference || 'SECRET_NAME'}</code> from the
                Worker directory.
              </p>
              <button className="button" type="submit" disabled={state.loading}>
                {state.loading ? 'Saving…' : 'Save provider'}
              </button>
            </form>
          ) : null}
        </section>
      ) : (
        <div className="empty-state">
          <LockKey size={36} />
          <h2>{tab} is protected</h2>
          <p>This admin module is ready for the same server-authorized registry pattern.</p>
        </div>
      )}
    </Page>
  );
}
function Status() {
  return (
    <Page
      title="Platform status"
      intro="Live service checks without sensitive implementation details."
    >
      <div className="status-list">
        <p>
          <span className="status-dot" /> Website operational
        </p>
        <p>
          <span className="status-dot" /> Worker responding
        </p>
        <p>
          <span className="status-muted" /> Auth setup pending secrets
        </p>
      </div>
    </Page>
  );
}
function Docs({ title, intro }: { title: string; intro: string }) {
  return (
    <Page title={title} intro={intro}>
      <div className="docs-layout">
        <aside>
          {Object.entries(docs).map(([path, c]) => (
            <NavLink key={path} to={path}>
              {c[0]}
            </NavLink>
          ))}
        </aside>
        <article>
          <h2>Fouad CLI workflow</h2>
          <p>
            Run commands from any workspace. Review permission prompts before tools access files or
            processes.
          </p>
          <CommandBox command={`fouad doctor\nfouad login\nfouad`} shell="bash" multiline />
          <h2>Security defaults</h2>
          <p>
            Secrets are never included in browser bundles. Hosted requests require an authenticated
            device session.
          </p>
        </article>
      </div>
    </Page>
  );
}
function Content({ title, copy }: { title: string; copy: string }) {
  return (
    <Page title={title} intro={copy}>
      <Link className="arrow-link" to="/docs">
        Continue to documentation <ArrowRight />
      </Link>
    </Page>
  );
}
function Page({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page section-wrap">
      <header className="page-header">
        <h1>{title}</h1>
        <p>{intro}</p>
      </header>
      {children}
    </div>
  );
}
function NotFound() {
  return (
    <Page title="Page not found" intro="The requested route does not exist.">
      <Link className="button" to="/">
        Return home
      </Link>
    </Page>
  );
}
function Footer() {
  return (
    <footer className="footer section-wrap">
      <div>
        <span className="brand-mark">F</span>
        <p>Fouad CLI is currently free and open source.</p>
      </div>
      <div>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/status">Status</Link>
        <Link to="/roadmap">Roadmap</Link>
      </div>
      <div>
        <Link to="/docs/security">Security</Link>
        <Link to="/download">Download</Link>
        <Link to="/login">Sign in</Link>
        <button className="footer-button">
          <SignOut /> Log out
        </button>
      </div>
    </footer>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GlobalErrorBoundary>
  </React.StrictMode>,
);
