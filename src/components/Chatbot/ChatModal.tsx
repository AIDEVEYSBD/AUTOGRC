'use client';

import { useEffect, useState, useRef, FC, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartSpec {
  chartType: 'LineChart' | 'BarChart' | 'PieChart';
  data: Record<string, number | string>[];
  xKey: string;
  yKeys: string[];
  title?: string;
  colors?: string[];
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  chartSpec?: ChartSpec;
  isSystem?: boolean; // for internal display-only messages
}

export interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Page-specific report prompts ─────────────────────────────────────────────

const REPORT_PROMPTS: Record<string, string> = {
  '/overview': `Generate a comprehensive executive cybersecurity compliance report.

Structure the report exactly as follows — use ## for each section heading:

## Executive Summary
Key metrics: overall compliance score, number of applications assessed, critical apps at risk, total failing controls. 2-3 sentence strategic summary.

## Framework Compliance Status
For each compliance framework: name, total controls, mapping percentage, and compliance posture. Identify which framework has the biggest gaps.

## Application Risk Assessment
List all applications by risk tier (Critical / Warning / Compliant). Include scores and non-compliance counts. Identify the top 3 highest-risk applications.

## Security Domain Analysis
Break down compliance by security domain. Identify the weakest and strongest domains. Note which domains require immediate attention.

## Key Findings
5 bullet points of the most significant compliance risks, each grounded in real numbers from the database.

## Prioritized Recommendations
Immediate (0-30 days): specific actions for critical applications.
Short-term (30-90 days): domain remediation priorities.
Strategic (90+ days): framework alignment improvements.

IMPORTANT: Call queryDatabase with overview_kpis, applications_overview, frameworks_overview, security_domains, and failing_controls before writing each section. Generate a chart for at least one section.`,

  '/applications': `Generate a comprehensive application risk assessment report.

Structure as follows — use ## for section headings:

## Portfolio Overview
Total applications, average compliance score, breakdown by hosting model (Vendor Managed Cloud, Org-Managed Cloud, On-Premise, Hybrid, SaaS).

## Critical Risk Applications
List all Critical-status applications with their scores, non-compliance counts, and recommended immediate actions.

## Warning-Status Applications
List all Warning-status applications with scores and non-compliance counts. Note quick-win opportunities.

## Compliant Applications
List top-performing applications as benchmarks.

## Risk Distribution Analysis
Compare compliance across hosting models and criticality tiers.

## Remediation Roadmap
Prioritized list of applications and specific control areas to address.

IMPORTANT: Call queryDatabase with applications_overview and overview_kpis. Generate a bar chart of application compliance scores.`,

  '/frameworks': `Generate a framework alignment and compliance gap analysis report.

Structure as follows — use ## for section headings:

## Framework Portfolio Overview
List all frameworks, their total control counts, and whether they are the master framework.

## Mapping Status by Framework
For each reference framework: controls mapped vs total, mapping percentage, and gap count.

## Control Coverage Analysis
Which domains have the best/worst cross-framework coverage. Identify controls in reference frameworks not covered by the master.

## Gap Closure Recommendations
Prioritized list of frameworks and domains where mapping should be expanded.

## Strategic Observations
Overall framework harmonization maturity and next steps.

IMPORTANT: Call queryDatabase with frameworks_overview and security_domains. Generate a bar chart of framework mapping percentages.`,
};

const DEFAULT_REPORT_PROMPT = `Generate a comprehensive GRC compliance status report.

Structure as follows — use ## for section headings:

## Executive Summary
Overall compliance posture based on available data.

## Key Metrics
Core KPIs: applications, controls, scores.

## Risk Findings
Top risks identified in the data.

## Security Domain Analysis
Domain-by-domain compliance scores.

## Recommendations
Prioritized action items grounded in real data.

IMPORTANT: Call queryDatabase with overview_kpis, applications_overview, and security_domains before writing. Generate at least one chart.`;

// ─── Inline Chart Renderer ────────────────────────────────────────────────────

const BRAND_COLORS = ['#FFE600', '#2E2E38', '#4CAF50', '#FF5252', '#2196F3', '#FF9800'];

function InlineChart({ spec }: { spec: ChartSpec }) {
  const colors = spec.colors?.length ? spec.colors : BRAND_COLORS;

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
      {spec.title && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {spec.title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={175}>
        {spec.chartType === 'LineChart' ? (
          <LineChart data={spec.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={spec.xKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip />
            {spec.yKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]}
                strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        ) : spec.chartType === 'BarChart' ? (
          <BarChart data={spec.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={spec.xKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {spec.yKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        ) : (
          <PieChart>
            <Pie
              data={spec.data.map(d => ({ name: String(d[spec.xKey]), value: Number(d[spec.yKeys[0]] ?? 0) }))}
              dataKey="value" nameKey="name" outerRadius={70}
            >
              {spec.data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// ─── Default window size ──────────────────────────────────────────────────────

const DEFAULT_W = 450;
const DEFAULT_H = 600;
const MIN_W = 320;
const MIN_H = 400;
const MAX_W = 960;

// ─── Component ────────────────────────────────────────────────────────────────

const WELCOME_MESSAGE: Message = {
  id: 'welcome-1',
  text:
    "Hello! I'm your **AutoGRC AI Assistant** — powered by live compliance data.\n\n" +
    "I can analyze compliance scores, generate charts, rank applications, surface failing controls, and produce full executive reports.\n\n" +
    "Try the quick prompts below, or ask anything about your compliance posture.",
  sender: 'bot',
  timestamp: new Date(),
};

const ChatModal: FC<ChatModalProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();

  // ─── Session ───────────────────────────────────────────────────────────────
  const sessionIdRef = useRef<string | null>(null);
  if (!sessionIdRef.current) {
    sessionIdRef.current = typeof crypto !== 'undefined' ? crypto.randomUUID() : `session-${Date.now()}`;
  }

  // ─── Chat state ────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  // ─── Resize state ──────────────────────────────────────────────────────────
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [isDesktop, setIsDesktop] = useState(false);
  const isResizing = useRef(false);
  const resizeOrigin = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // ─── Refs ──────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Desktop detection ─────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ─── Resize mouse handlers ─────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const dx = e.clientX - resizeOrigin.current.x;
      const dy = e.clientY - resizeOrigin.current.y;
      const maxH = window.innerHeight - 64;
      setSize({
        w: Math.max(MIN_W, Math.min(MAX_W, resizeOrigin.current.w - dx)),
        h: Math.max(MIN_H, Math.min(maxH, resizeOrigin.current.h - dy)),
      });
    };
    const onUp = () => { isResizing.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    resizeOrigin.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
  };

  // ─── Scroll + focus ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // ─── API call helper ───────────────────────────────────────────────────────
  const callChat = useCallback(async (prompt: string): Promise<{ text: string; chartSpec?: ChartSpec }> => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, sessionId: sessionIdRef.current, pageContext: pathname }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<{ text: string; chartSpec?: ChartSpec }>;
  }, [pathname]);

  // ─── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async (overrideText?: string, displayText?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if (!text || isTyping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: displayText ?? text,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    if (!overrideText) setInputValue('');
    setIsTyping(true);

    try {
      const data = await callChat(text);
      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          text: data.text ?? "I'm sorry, I couldn't generate a response.",
          sender: 'bot',
          timestamp: new Date(),
          chartSpec: data.chartSpec ?? undefined,
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          text: "⚠️ Connection error. Please verify your `OPENAI_API_KEY` in `.env.local` (or Vercel env vars) and try again.",
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, isTyping, callChat]);

  // ─── Report button ─────────────────────────────────────────────────────────
  const handleReport = useCallback(async () => {
    if (isReporting || isTyping) return;
    setIsReporting(true);

    // Display a friendly label in chat; send the full structured prompt to GPT
    const displayLabel = `📊 Generate ${pathname === '/overview' ? 'executive compliance' : pathname === '/applications' ? 'application risk' : pathname === '/frameworks' ? 'framework alignment' : 'compliance'} report`;
    const prompt = REPORT_PROMPTS[pathname] ?? DEFAULT_REPORT_PROMPT;

    const userMessage: Message = {
      id: `user-report-${Date.now()}`,
      text: displayLabel,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const data = await callChat(prompt);
      setMessages(prev => [
        ...prev,
        {
          id: `bot-report-${Date.now()}`,
          text: data.text ?? "Report generation failed.",
          sender: 'bot',
          timestamp: new Date(),
          chartSpec: data.chartSpec ?? undefined,
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `bot-report-err-${Date.now()}`,
          text: "⚠️ Report generation failed. Please try again.",
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
      setIsReporting(false);
    }
  }, [isReporting, isTyping, pathname, callChat]);

  // ─── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);

    // Collect all chart specs from bot messages that had charts
    const chartSpecs = messages
      .filter(m => m.sender === 'bot' && m.chartSpec)
      .map(m => m.chartSpec!);

    // Last chart data for the data table
    const lastChartData = (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].chartSpec?.data) return messages[i].chartSpec!.data as Record<string, unknown>[];
      }
      return undefined;
    })();

    const exportMessages = messages
      .filter(m => m.id !== 'welcome-1' && !m.isSystem)
      .map(m => ({ sender: m.sender, text: m.text, timestamp: m.timestamp.toISOString() }));

    try {
      const res = await fetch('/api/ai/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'AutoGRC Compliance Analysis Report',
          messages: exportMessages,
          chartSpecs,
          chartData: lastChartData,
        }),
      });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autogrc-report-${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: `bot-exp-err-${Date.now()}`, text: 'Export failed. Please try again.', sender: 'bot', timestamp: new Date() },
      ]);
    } finally {
      setIsExporting(false);
    }
  }, [messages, isExporting]);

  // ─── Keyboard ─────────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const hasConversation = messages.length > 1;

  if (!isOpen) return null;

  // Modal sizing — inline styles on desktop; Tailwind full-screen classes on mobile
  const modalStyle = isDesktop
    ? { width: `${size.w}px`, height: `${size.h}px` }
    : undefined;

  const modalClass = [
    'fixed bottom-4 right-4 z-[120] flex flex-col rounded-2xl bg-white shadow-2xl',
    !isDesktop ? 'h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]' : '',
  ].join(' ');

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[110] bg-black/30 backdrop-blur-sm" onClick={handleBackdropClick} aria-hidden="true" />

      {/* Modal */}
      <div className={modalClass} style={modalStyle}>

        {/* ── Resize handle (top-left corner, desktop only) ─────────────── */}
        {isDesktop && (
          <div
            onMouseDown={onResizeStart}
            title="Drag to resize"
            className="absolute left-0 top-0 z-20 flex h-8 w-8 cursor-nw-resize items-start justify-start rounded-tl-2xl p-1.5 transition-opacity opacity-40 hover:opacity-90"
            style={{ userSelect: 'none' }}
          >
            {/* Grip dots */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white">
              <circle cx="3" cy="3" r="1.5" fill="currentColor" />
              <circle cx="8" cy="3" r="1.5" fill="currentColor" />
              <circle cx="3" cy="8" r="1.5" fill="currentColor" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            </svg>
          </div>
        )}

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-[#2E2E38] px-4 py-3 rounded-t-2xl md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#FFE600]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#2E2E38" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white md:text-base">AutoGRC Assistant</h3>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                <p className="text-xs text-gray-400">AI · Live Data</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Report button */}
            <button
              onClick={handleReport}
              disabled={isReporting || isTyping}
              title="Generate a full corporate compliance report for this page"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-500 px-2.5 text-xs font-medium text-gray-300 transition-colors hover:border-[#FFE600] hover:text-[#FFE600] disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none"
              type="button"
            >
              {isReporting ? (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              )}
              <span className="hidden sm:inline">{isReporting ? 'Generating…' : 'Report'}</span>
            </button>

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={!hasConversation || isExporting}
              title="Export conversation and charts as Word document"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-500 px-2.5 text-xs font-medium text-gray-300 transition-colors hover:border-[#FFE600] hover:text-[#FFE600] disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none"
              type="button"
            >
              {isExporting ? (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )}
              <span className="hidden sm:inline">{isExporting ? 'Exporting…' : 'Export'}</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="flex-shrink-0 rounded-lg p-1 text-gray-300 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#2E2E38]"
              aria-label="Close chat"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Messages ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 md:p-5">
          {messages.map(message => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                message.sender === 'user' ? 'bg-[#2E2E38] text-white' : 'bg-gray-100 text-[#333333]'
              }`}>
                {message.sender === 'user' ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                ) : (
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:font-semibold">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                  </div>
                )}

                {/* Inline chart */}
                {message.chartSpec && <InlineChart spec={message.chartSpec} />}

                <p className={`mt-1.5 text-xs ${message.sender === 'user' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-gray-100 px-4 py-3">
                <div className="flex items-center gap-1">
                  {[0, 150, 300].map(delay => (
                    <div key={delay} className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input area ───────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-gray-200 p-3 md:p-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about compliance, charts, controls…"
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-[#FFE600] focus:outline-none focus:ring-2 focus:ring-[#FFE600] focus:ring-opacity-50"
              disabled={isTyping}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isTyping}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#FFE600] transition-all hover:bg-[#FFD700] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#FFE600] focus:ring-offset-2"
              aria-label="Send message"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#2E2E38" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>

          {/* Quick-start prompts */}
          {!hasConversation && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                ['Show compliance overview', 'Show compliance overview'],
                ['Which apps are critical?', 'Which apps are critical?'],
                ['Chart compliance by domain', 'Chart compliance by domain'],
                ['Top 10 failing controls', 'Top 10 failing controls'],
              ].map(([display, send]) => (
                <button
                  key={display}
                  onClick={() => handleSend(send, display)}
                  className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-500 transition-colors hover:border-[#FFE600] hover:text-[#333] focus:outline-none"
                  type="button"
                >
                  {display}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatModal;
