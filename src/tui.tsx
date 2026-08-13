import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import Gradient from 'ink-gradient';
import Spinner from 'ink-spinner';
import type { Config } from './config.js';
import type { Hardware } from './hardware.js';
import type { ChatMessage, Provider } from './types.js';
import { autocompleteSlash, filterSlash, SLASH_COMMANDS } from './slash.js';
import { executeSlash } from './slash-actions.js';
import { enterTerminal } from './terminal.js';
import { Sessions } from './sessions.js';
import type { CloudSync } from './cloud-sync.js';
const C = {
  bg: '#071018',
  surface: '#0B1722',
  surfaceAlt: '#0E1E2B',
  border: '#7357FF',
  primary: '#35F2D0',
  secondary: '#30A7FF',
  accent: '#D557FF',
  text: '#EAF7FF',
  muted: '#7890A0',
  warning: '#FFB84D',
  error: '#FF5577',
  success: '#39FF9A',
};
const LOGO = [
  '███████╗ ██████╗ ██╗   ██╗ █████╗ ██████╗      █████╗ ██╗',
  '██╔════╝██╔═══██╗██║   ██║██╔══██╗██╔══██╗    ██╔══██╗██║',
  '█████╗  ██║   ██║██║   ██║███████║██║  ██║    ███████║██║',
  '██╔══╝  ██║   ██║██║   ██║██╔══██║██║  ██║    ██╔══██║██║',
  '██║     ╚██████╔╝╚██████╔╝██║  ██║██████╔╝    ██║  ██║██║',
  '╚═╝      ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═════╝     ╚═╝  ╚═╝╚═╝',
].join('\n');
type Entry = { id: string; role: 'user' | 'assistant' | 'system' | 'error'; text: string };
export interface AppProps {
  config: Config;
  hardware: Hardware;
  cwd: string;
  branch?: string;
  provider: Provider;
  counts?: { plugins: number; skills: number; mcp: number; tools: number };
  alternateScreen?: boolean;
  cloud?: CloudSync | null;
  cloudState?: 'local' | 'synced' | 'auth-failed';
}
export function App({
  config,
  hardware,
  cwd,
  branch = '—',
  provider,
  counts,
  alternateScreen = true,
  cloud = null,
  cloudState = 'local',
}: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const terminalSize = () => ({
    width: Math.max(stdout.columns || 80, 40),
    height: Math.max(stdout.rows || 24, 20),
  });
  const [dimensions, setDimensions] = useState(terminalSize);
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(0);
  const [modal, setModal] = useState<'commands' | 'models' | 'sessions' | 'shortcuts' | null>(null);
  const [ctrlC, setCtrlC] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const abort = useRef<AbortController | null>(null);
  const sessions = useRef<Sessions | null>(null);
  const sessionId = useRef<string>('');
  const suggestions = useMemo(() => (input.startsWith('/') ? filterSlash(input) : []), [input]);
  useEffect(() => {
    let cleanup = () => {};
    if (alternateScreen) cleanup = enterTerminal(stdout);
    const resize = () => setDimensions(terminalSize());
    stdout.on('resize', resize);
    const restore = () => cleanup();
    process.once('SIGTERM', restore);
    return () => {
      stdout.off('resize', resize);
      process.off('SIGTERM', restore);
      cleanup();
    };
  }, [stdout, alternateScreen]);
  useEffect(() => {
    const db = new Sessions();
    void db.open().then(() => {
      sessions.current = db;
      sessionId.current = db.create('FOUAD AI chat');
      void cloud
        ?.createSession(sessionId.current, 'FOUAD AI chat', provider.id, config.model)
        .catch(() => undefined);
      setSessionCount(db.list().length);
    });
    return () => db.close();
  }, [cloud, config.model, provider.id]);
  useEffect(() => {
    if (ctrlC) {
      const timer = setTimeout(() => setCtrlC(0), 1000);
      return () => clearTimeout(timer);
    }
  }, [ctrlC]);
  const append = (role: Entry['role'], text: string) =>
    setEntries((old) => [...old, { id: crypto.randomUUID(), role, text }]);
  const clear = () => setEntries([]);
  const newSession = async () => {
    if (!sessions.current) return;
    sessionId.current = sessions.current.create('FOUAD AI chat');
    await cloud
      ?.createSession(sessionId.current, 'FOUAD AI chat', provider.id, config.model)
      .catch(() => undefined);
    setSessionCount(sessions.current.list().length);
    setEntries([]);
  };
  const submit = async (value: string) => {
    const text = value.trim();
    if (!text || busy) return;
    setInput('');
    setSelected(0);
    if (text.startsWith('/')) {
      const result = await executeSlash(text, {
        config,
        cwd,
        hardware,
        providerId: provider.id,
        sessionCount,
        pluginCount: counts?.plugins ?? null,
        skillCount: counts?.skills ?? null,
        mcpCount: counts?.mcp ?? null,
        toolCount: counts?.tools ?? 0,
        clear,
        quit: exit,
        newSession,
      });
      if (result) append('system', result);
      return;
    }
    append('user', text);
    sessions.current?.add(sessionId.current, 'user', text);
    void cloud
      ?.addMessage(sessionId.current, 'user', text, provider.id, config.model)
      .catch(() => undefined);
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    const assistantId = crypto.randomUUID();
    setEntries((old) => [...old, { id: assistantId, role: 'assistant', text: '' }]);
    try {
      const health = await provider.health(controller.signal);
      if (!health.ok) {
        const recovery =
          provider.id === 'gemini'
            ? 'Check GEMINI_API_KEY, internet access, API restrictions, and project quota.'
            : 'Run fouad setup, start llama-server, or select Ollama.';
        throw new Error(`Backend not ready (${provider.id}): ${health.detail}. ${recovery}`);
      }
      const history: ChatMessage[] = [
        ...entries
          .filter((e) => e.role === 'user' || e.role === 'assistant')
          .map((e) => ({ role: e.role as 'user' | 'assistant', content: e.text })),
        { role: 'user', content: text },
      ];
      let answer = '';
      for await (const chunk of provider.stream(history, config.model, controller.signal)) {
        answer += chunk.text;
        setEntries((old) => old.map((e) => (e.id === assistantId ? { ...e, text: answer } : e)));
      }
      if (!answer.trim())
        throw new Error(
          `${provider.id} returned an empty response. Check model access, safety filters, quota, and API response format.`,
        );
      sessions.current?.add(sessionId.current, 'assistant', answer);
      void cloud
        ?.addMessage(sessionId.current, 'assistant', answer, provider.id, config.model)
        .catch(() => undefined);
    } catch (error) {
      setEntries((old) => old.filter((e) => e.id !== assistantId));
      append('error', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };
  useInput((character, key) => {
    const isEnter = key.return || character === '\r' || character === '\n';
    if (key.ctrl && character === 'c') {
      if (busy) {
        abort.current?.abort();
        return;
      }
      if (ctrlC === 1) exit();
      else setCtrlC(1);
      return;
    }
    if (key.ctrl && character === 'l') {
      clear();
      return;
    }
    if (key.ctrl && character === 'k') {
      setModal('commands');
      return;
    }
    if (key.ctrl && character === 'p') {
      setModal('models');
      return;
    }
    if (key.ctrl && character === 'o') {
      setModal('sessions');
      return;
    }
    if (character === '?' && !input) {
      setModal('shortcuts');
      return;
    }
    if (key.escape) {
      setModal(null);
      setSelected(0);
      return;
    }
    if (modal) {
      return;
    }
    if (suggestions.length && key.upArrow) {
      setSelected((i) => (i - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (suggestions.length && key.downArrow) {
      setSelected((i) => (i + 1) % suggestions.length);
      return;
    }
    if (key.tab && suggestions.length) {
      setInput(`${autocompleteSlash(input, selected)} `);
      return;
    }
    if (isEnter) {
      if (suggestions.length && input !== suggestions[selected]?.name) {
        void submit(suggestions[selected]?.name ?? input);
      } else void submit(input);
      return;
    }
    if (key.backspace || key.delete) setInput((v) => v.slice(0, -1));
    else if (
      !key.ctrl &&
      !key.meta &&
      character &&
      [...character].every((value) => value.charCodeAt(0) >= 32 && value.charCodeAt(0) !== 127)
    )
      setInput((v) => v + character);
  });
  const narrow = dimensions.width < 80;
  const noColor = process.env.NO_COLOR !== undefined;
  const visible = entries.slice(-(narrow ? 6 : 10));
  return (
    <Box
      width={dimensions.width}
      height={dimensions.height}
      flexDirection="column"
      backgroundColor={noColor ? undefined : C.bg}
    >
      <Box paddingX={1} flexDirection="column">
        {!narrow && !noColor ? (
          <Gradient colors={[C.primary, C.secondary, C.accent]}>
            <Text>{LOGO}</Text>
          </Gradient>
        ) : (
          <Text color={noColor ? 'white' : C.primary} bold>
            FOUAD AI CLI
          </Text>
        )}
        <Text color={noColor ? 'white' : C.muted}>
          Tips: /help · Ctrl+K palette · Ctrl+P models · ? shortcuts
        </Text>
      </Box>
      <Box
        flexGrow={1}
        marginX={1}
        borderStyle="round"
        borderColor={noColor ? undefined : C.border}
        backgroundColor={noColor ? undefined : C.surface}
        paddingX={1}
        flexDirection="column"
      >
        <Text bold color={noColor ? 'white' : C.secondary}>
          CONVERSATION
        </Text>
        {visible.length === 0 ? (
          <Text color={noColor ? 'white' : C.muted}>
            Ask a coding question or type / to browse commands.
          </Text>
        ) : (
          visible.map((e) => (
            <Text
              key={e.id}
              color={
                noColor
                  ? 'white'
                  : e.role === 'error'
                    ? C.error
                    : e.role === 'user'
                      ? C.primary
                      : e.role === 'system'
                        ? C.warning
                        : C.text
              }
            >
              {e.role === 'user'
                ? '› '
                : e.role === 'assistant'
                  ? 'FOUAD › '
                  : e.role === 'error'
                    ? 'ERROR › '
                    : '• '}
              {e.text || (busy ? <Spinner type="dots" /> : '')}
            </Text>
          ))
        )}
      </Box>
      {suggestions.length > 0 && !modal ? (
        <Box
          marginX={2}
          borderStyle="round"
          borderColor={noColor ? undefined : C.accent}
          backgroundColor={noColor ? undefined : C.surfaceAlt}
          flexDirection="column"
        >
          {suggestions.slice(0, 8).map((s, i) => (
            <Text key={s.name} inverse={i === selected}>
              {' '}
              {s.name.padEnd(15)} {s.description}
            </Text>
          ))}
        </Box>
      ) : null}
      {modal ? (
        <Box
          position="absolute"
          marginX={Math.max(1, Math.floor(dimensions.width / 8))}
          marginY={2}
          width={Math.max(40, Math.floor(dimensions.width * 0.75))}
          borderStyle="double"
          borderColor={noColor ? undefined : C.accent}
          backgroundColor={noColor ? undefined : C.surfaceAlt}
          padding={1}
          flexDirection="column"
        >
          <Text bold>{modal.toUpperCase()}</Text>
          <Text>
            {modal === 'commands'
              ? SLASH_COMMANDS.map((c) => `${c.name} — ${c.description}`).join('\n')
              : modal === 'models'
                ? `Active: ${config.model}\nPress Escape, then use /model status or /model install.`
                : modal === 'sessions'
                  ? `${sessionCount} local session(s)\nPress Escape, then use /sessions.`
                  : 'Ctrl+C cancel; twice exit\nCtrl+L clear view\nTab autocomplete\nEscape close\nEnter submit'}
          </Text>
        </Box>
      ) : null}
      <Box
        marginX={1}
        borderStyle="round"
        borderColor={noColor ? undefined : C.primary}
        backgroundColor={noColor ? undefined : C.surfaceAlt}
        paddingX={1}
      >
        <Text color={noColor ? 'white' : C.primary}>› </Text>
        <Text color={noColor ? 'white' : C.text}>{input}</Text>
        <Text>{busy ? ' ' : '▌'}</Text>
        {busy ? (
          <Text color={noColor ? 'white' : C.warning}>
            {' '}
            <Spinner type="dots" /> generating · Ctrl+C cancels
          </Text>
        ) : null}
      </Box>
      <Box backgroundColor={noColor ? undefined : C.surfaceAlt} paddingX={1}>
        <Text color={noColor ? 'white' : C.muted}>
          {cwd} · {cloudState} · {config.permissionMode} · plugins {counts?.plugins ?? '—'} · skills{' '}
          {counts?.skills ?? '—'} · MCP {counts?.mcp ?? '—'} · {config.model} · {provider.id} · git:
          {branch}
        </Text>
      </Box>
    </Box>
  );
}
