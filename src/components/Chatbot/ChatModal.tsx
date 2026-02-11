'use client';

import { useEffect, useState, useRef, FC, useMemo } from 'react';
import { usePathname } from 'next/navigation';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Page-specific knowledge bases ───────────────────────────────────────────

interface PageKnowledge {
  welcomeMessage: string;
  responses: { keywords: string[]; response: string }[];
  fallback: string;
}

const PAGE_KNOWLEDGE: Record<string, PageKnowledge> = {
  '/overview': {
    welcomeMessage:
      'Hello! I\'m your AutoGRC assistant. You\'re on the Cybersecurity Compliance Dashboard. I can help you understand your compliance scores, control failures, framework status, and application risks. What would you like to know?',
    responses: [
      {
        keywords: ['snapshot', 'executive', 'summary', 'overall', 'overview', 'health', 'status'],
        response:
          'Here\'s your executive snapshot: You have 10 out of 10 applications tested with an average compliance score of 64%. There are currently 144 total failing controls and 3 critical applications at risk. This gives leadership a quick health check on overall control effectiveness and risk exposure.',
      },
      {
        keywords: ['framework', 'frameworks', 'iso', 'nist', 'pci', 'cis'],
        response:
          'Your Internal Controls Framework status shows: ISO 27001 is at approximately 80% compliance, NIST CSF is at approximately 61% compliance, and PCI DSS SAQ D is at approximately 28% compliance. The active internal framework selected is CIS. PCI DSS has the most significant control gaps and should be prioritized for remediation.',
      },
      {
        keywords: ['application', 'applications', 'app', 'apps', 'score', 'scores', 'performing'],
        response:
          'Application compliance scores vary significantly. High performers include Slack, Zoom, GitHub Enterprise, and ServiceNow in the 75\u201381% range. Microsoft Active Directory sits at around 75%. Lower performing applications include AWS Management Console at approximately 76%, while Atlassian Jira, Azure Portal, and Google Cloud Console are in the 38% range. These lower-performing apps should be prioritized for remediation.',
      },
      {
        keywords: ['domain', 'domains', 'respond', 'identify', 'detect', 'protect', 'govern', 'recover'],
        response:
          'Controls are grouped by CIS security domains: Respond, Identify, Detect, Protect, Govern, and Recover. Each domain shows compliant vs non-compliant controls and an average score. Domain scores range between approximately 53% and 75%, indicating uneven maturity across the control lifecycle. This helps identify which security functions need the most attention.',
      },
      {
        keywords: ['failing', 'fail', 'failures', 'non-compliant', 'gaps', 'gap', 'risk', 'critical'],
        response:
          'There are 144 total failing controls across the organization and 3 critical applications at risk. The most significant gaps are in PCI DSS SAQ D compliance (approximately 28%) and in applications like Atlassian Jira, Azure Portal, and Google Cloud Console which are in the 38% compliance range. Immediate remediation planning is recommended for these areas.',
      },
      {
        keywords: ['remediation', 'fix', 'improve', 'action', 'recommend', 'priority', 'prioritize'],
        response:
          'Based on the dashboard data, I recommend prioritizing: 1) The 3 critical applications at risk which need immediate attention. 2) PCI DSS SAQ D compliance which is only at 28%. 3) Lower-scoring security domains (those around 53%). The dashboard supports executive risk monitoring, framework comparison, application-level prioritization, and domain-level remediation planning.',
      },
      {
        keywords: ['compliance', 'percentage', 'percent', 'average'],
        response:
          'The organization\'s average compliance score is 64%. ISO 27001 leads at approximately 80%, followed by NIST CSF at 61%, and PCI DSS SAQ D trailing at 28%. The organization has moderate compliance maturity with strong ISO alignment but significant gaps in PCI DSS and selected applications.',
      },
    ],
    fallback:
      'This dashboard provides a consolidated view of your cybersecurity compliance posture. I can help you with: your executive snapshot and key metrics, framework compliance status (ISO 27001, NIST CSF, PCI DSS), application-level compliance scores, security domain analysis, or remediation priorities. What area would you like to explore?',
  },

  '/frameworks': {
    welcomeMessage:
      'Hello! I\'m your AutoGRC assistant. You\'re on the Compliance Frameworks page. I can help you understand your framework portfolio, control mappings, and cross-framework alignment. What would you like to know?',
    responses: [
      {
        keywords: ['snapshot', 'portfolio', 'summary', 'overview', 'total', 'how many'],
        response:
          'Your framework portfolio currently includes 4 frameworks with a total of 590 controls across all frameworks. CIS serves as the master framework and internal baseline against which all other frameworks are mapped and measured.',
      },
      {
        keywords: ['mapping', 'mapped', 'alignment', 'align', 'status', 'progress'],
        response:
          'Here\'s the current framework mapping status: CIS (Master) has 148 controls. ISO 27001 is approximately 52% mapped with 45 of 86 controls aligned. NIST CSF is approximately 47% mapped with 50 of 106 controls aligned. PCI DSS SAQ D is approximately 33% mapped with 80 of 250 controls aligned. PCI DSS has the most work remaining for cross-framework normalization.',
      },
      {
        keywords: ['master', 'cis', 'baseline', 'internal'],
        response:
          'CIS serves as the master framework with 148 controls. It functions as the internal baseline against which all other frameworks (ISO 27001, NIST CSF, PCI DSS SAQ D) are mapped. This approach allows the organization to maintain a single internal control baseline while mapping external regulatory frameworks to it for centralized measurement and tracking.',
      },
      {
        keywords: ['iso', '27001'],
        response:
          'ISO 27001 has 86 total controls, of which 45 (approximately 52%) are currently mapped to the CIS master framework. This framework shows the highest mapping alignment among the reference frameworks, but still has room for improvement in cross-framework normalization.',
      },
      {
        keywords: ['nist', 'csf'],
        response:
          'NIST CSF has 106 total controls, of which 50 (approximately 47%) are currently mapped to the CIS master framework. The mapping covers key domains including Identify, Protect, Detect, Respond, Govern, and Recover, enabling domain-level comparison across frameworks.',
      },
      {
        keywords: ['pci', 'dss', 'saq'],
        response:
          'PCI DSS SAQ D has 250 total controls \u2014 the largest framework in the portfolio \u2014 but only 80 controls (approximately 33%) are currently mapped to the CIS master framework. This represents the biggest mapping gap and should be prioritized if PCI compliance is a regulatory requirement.',
      },
      {
        keywords: ['domain', 'domains', 'identify', 'protect', 'detect', 'respond', 'govern', 'recover'],
        response:
          'Controls baselined to the CIS master framework are organized across domains: Identify, Protect, Detect, Respond, Govern, and Recover. Each domain shows how specific CIS controls map across ISO 27001, NIST CSF, and PCI DSS with status indicators for partial or full coverage. For example, a CIS asset inventory control may map to ISO 27001 control 5.9 and corresponding NIST and PCI controls.',
      },
      {
        keywords: ['gap', 'gaps', 'additional', 'missing', 'not covered', 'not in master', 'expand'],
        response:
          'There are controls in reference frameworks not yet covered in the CIS master baseline. These include: asset return procedures, information labeling, information transfer policies, authentication handling, ICT supply chain security, cloud service security, and incident evidence collection. This provides gap visibility to help decide whether to expand the master framework.',
      },
      {
        keywords: ['harmonization', 'unification', 'centralized', 'duplication', 'equivalency'],
        response:
          'This page functions as the control harmonization engine of AutoGRC. It enables you to maintain a single internal control baseline (CIS), map external regulatory frameworks to that baseline, identify mapping gaps, track cross-framework coverage, and export structured data for reporting. This operationalizes compliance unification by transforming multiple frameworks into a centralized, measurable control architecture.',
      },
    ],
    fallback:
      'This page provides a structured view of your compliance frameworks and how they align to your CIS master control baseline. I can help you with: your framework portfolio overview, mapping status for ISO 27001, NIST CSF, or PCI DSS, domain-level control comparisons, gaps not yet covered in the master framework, or the overall harmonization strategy. What would you like to explore?',
  },

  '/applications': {
    welcomeMessage:
      'Hello! I\'m your AutoGRC assistant. You\'re on the Applications page. I can help you understand your application compliance posture, risk distribution, and deployment breakdown. What would you like to know?',
    responses: [
      {
        keywords: ['snapshot', 'portfolio', 'summary', 'overview', 'total', 'how many'],
        response:
          'Your application portfolio includes 10 total applications with an average compliance of 64%. Deployment breakdown: Vendor Managed Cloud has 4 apps at 66% average compliance, Org-Managed Cloud has 3 apps at 80%, Hybrid has 1 app at 35%, and On-Premise has 2 apps at 52%. No SaaS-classified applications are currently in the portfolio.',
      },
      {
        keywords: ['deployment', 'hosting', 'cloud', 'hybrid', 'on-prem', 'on-premise', 'saas', 'vendor'],
        response:
          'Risk distribution by hosting model: Org-Managed Cloud performs best at 80% average compliance (3 apps). Vendor Managed Cloud follows at 66% (4 apps). On-Premise environments are at 52% (2 apps). Hybrid shows the weakest compliance at 35% (1 app). This highlights that Hybrid and On-Prem environments need the most compliance improvement attention.',
      },
      {
        keywords: ['critical', 'risk', 'worst', 'failing', 'lowest', 'danger', 'alert', 'urgent'],
        response:
          'Three applications are in critical status: Atlassian Jira Cloud at 35% compliance with 134 non-compliances, Azure Portal at 35% with 134 non-compliances, and Google Cloud Console at 35% with 134 non-compliances. These represent significant exposure and require immediate remediation planning.',
      },
      {
        keywords: ['warning', 'moderate', 'medium'],
        response:
          'Applications with warning (moderate risk) status: AWS Management Console at 77% (26 gaps), GitHub Enterprise at 77% (24 gaps), Microsoft Active Directory at 68% (3 gaps), ServiceNow at 76% (30 gaps), and Google Workspace at 79% (22 gaps). These are not critical but should be monitored and improved to strengthen the overall compliance posture.',
      },
      {
        keywords: ['best', 'strong', 'top', 'highest', 'performing', 'compliant', 'slack', 'zoom'],
        response:
          'Your strongest compliance performers are Slack at 81% with 18 gaps and Zoom at 80% with 16 gaps. These applications demonstrate the most mature compliance posture in the portfolio and can serve as reference benchmarks for improving other applications.',
      },
      {
        keywords: ['jira', 'atlassian'],
        response:
          'Atlassian Jira Cloud is in critical status with only 35% compliance and 134 non-compliant controls. This is one of the three most at-risk applications in your portfolio and requires immediate remediation planning to address systemic control failures.',
      },
      {
        keywords: ['azure'],
        response:
          'Azure Portal is in critical status with only 35% compliance and 134 non-compliant controls. As a core cloud management platform, this represents significant exposure. Immediate remediation planning is recommended.',
      },
      {
        keywords: ['google cloud', 'gcp', 'google console'],
        response:
          'Google Cloud Console is in critical status with only 35% compliance and 134 non-compliant controls. Along with Azure Portal and Atlassian Jira, it\'s one of the three critical applications driving disproportionate control failures in the portfolio.',
      },
      {
        keywords: ['aws', 'amazon'],
        response:
          'AWS Management Console has a warning status with 77% compliance and 26 control gaps. While not critical, it should be monitored. It\'s classified as a core cloud infrastructure platform with associated SOX and internal regulatory categories.',
      },
      {
        keywords: ['active directory', 'microsoft ad', 'ad'],
        response:
          'Microsoft Active Directory has a warning status with 68% compliance and only 3 control gaps. Despite the lower compliance percentage, it has relatively few non-compliant controls, making it a good candidate for quick remediation wins.',
      },
      {
        keywords: ['owner', 'owners', 'criticality', 'disaster', 'recovery', 'lifecycle', 'regulatory', 'sox', 'gdpr', 'attribute'],
        response:
          'Each application is evaluated across multiple dimensions including: Owners, Business Criticality (C1\u2013C3), Disaster Recovery Level (DR2\u2013DR4), Lifecycle status, Hosting type, Regulatory categories (SOX, GDPR, Internal Utility, Production, etc.), Compliance status, Overall compliance score, Number of non-compliant controls, and Last assessed date. This enables comprehensive governance tracking.',
      },
      {
        keywords: ['remediation', 'fix', 'improve', 'action', 'recommend', 'priority', 'prioritize', 'plan'],
        response:
          'Recommended remediation priorities: First, address the 3 critical applications (Atlassian Jira, Azure Portal, Google Cloud Console) which are all at 35% with 134 non-compliances each. Second, focus on the On-Premise and Hybrid deployments which show weaker compliance. Third, address warnings in AWS, GitHub Enterprise, ServiceNow, and Google Workspace. The application-centric view transforms compliance from a framework perspective into a risk management lens for targeted operational triage.',
      },
      {
        keywords: ['compliance', 'score', 'average', 'percentage', 'percent'],
        response:
          'The average portfolio compliance is 64%. Scores range from a low of 35% (Atlassian Jira, Azure Portal, Google Cloud Console) to a high of 81% (Slack). The portfolio demonstrates uneven compliance maturity, with certain cloud platforms driving disproportionate control failures across the organization.',
      },
    ],
    fallback:
      'This page provides a centralized view of your application compliance posture. I can help you with: your application portfolio overview and deployment breakdown, critical/warning/compliant application status, specific application details (Slack, Jira, Azure, AWS, etc.), risk distribution by hosting model, regulatory exposure information, or remediation priorities. What would you like to explore?',
  },
};

const GENERIC_KNOWLEDGE: PageKnowledge = {
  welcomeMessage:
    'Hello! I\'m your AutoGRC assistant. How can I help you today with compliance, controls, or security assessments?',
  responses: [
    {
      keywords: ['overview', 'dashboard', 'summary'],
      response:
        'The Overview dashboard provides a consolidated view of your cybersecurity compliance posture. You have 10 applications tested with an average compliance score of 64%, 144 failing controls, and 3 critical applications at risk. Navigate to the Overview page for full details, or ask me about specific metrics.',
    },
    {
      keywords: ['framework', 'frameworks', 'iso', 'nist', 'pci', 'cis'],
      response:
        'AutoGRC tracks 4 compliance frameworks with 590 total controls. CIS is the master framework with ISO 27001 at 52% mapped, NIST CSF at 47% mapped, and PCI DSS SAQ D at 33% mapped. Navigate to the Frameworks page for detailed mapping status and gap analysis.',
    },
    {
      keywords: ['application', 'applications', 'app', 'apps'],
      response:
        'The application portfolio includes 10 applications with an average compliance of 64%. Three applications are in critical status (Atlassian Jira, Azure Portal, Google Cloud Console at 35% each). Navigate to the Applications page for the full compliance table and risk details.',
    },
    {
      keywords: ['help', 'what can you do', 'capabilities'],
      response:
        'I can help you with compliance questions, control assessments, framework status, application risk analysis, and security domain queries. For the most detailed answers, navigate to the relevant page (Overview, Frameworks, or Applications) and ask me there!',
    },
  ],
  fallback:
    'I can help you with compliance, controls, and security assessments across the AutoGRC platform. For the most detailed responses, try asking me from the Overview, Frameworks, or Applications pages. What would you like to know?',
};

// ─── Keyword matching engine ─────────────────────────────────────────────────

function findBestResponse(input: string, knowledge: PageKnowledge): string {
  const normalizedInput = input.toLowerCase().trim();

  let bestMatch: { response: string; matchCount: number } | null = null;

  for (const entry of knowledge.responses) {
    const matchCount = entry.keywords.filter((keyword) =>
      normalizedInput.includes(keyword.toLowerCase())
    ).length;

    if (matchCount > 0 && (!bestMatch || matchCount > bestMatch.matchCount)) {
      bestMatch = { response: entry.response, matchCount };
    }
  }

  return bestMatch ? bestMatch.response : knowledge.fallback;
}

// ─── Component ───────────────────────────────────────────────────────────────

const ChatModal: FC<ChatModalProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();

  const knowledge = useMemo(() => {
    return PAGE_KNOWLEDGE[pathname] ?? GENERIC_KNOWLEDGE;
  }, [pathname]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset messages with correct welcome message when page changes or modal opens
  useEffect(() => {
    setMessages([
      {
        id: 'welcome-1',
        text: knowledge.welcomeMessage,
        sender: 'bot',
        timestamp: new Date(),
      },
    ]);
  }, [knowledge]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: trimmedInput,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    setIsTyping(true);

    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      const responseText = findBestResponse(trimmedInput, knowledge);
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: responseText,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, delay);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[110] bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed bottom-4 right-4 z-[120] flex h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] flex-col rounded-2xl bg-white shadow-2xl md:bottom-6 md:right-6 md:h-[600px] md:w-[420px] lg:w-[450px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-[#2E2E38] px-4 py-4 rounded-t-2xl md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#FFE600]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="#2E2E38"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white md:text-lg">AutoGRC Assistant</h3>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-400"></div>
                <p className="text-xs text-gray-300">Online</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-300 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#2E2E38] rounded-lg p-1"
            aria-label="Close chat"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 md:p-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 md:max-w-[80%] ${
                  message.sender === 'user'
                    ? 'bg-[#2E2E38] text-white'
                    : 'bg-gray-100 text-[#333333]'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
                <p
                  className={`mt-1.5 text-xs ${
                    message.sender === 'user' ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl bg-gray-100 px-4 py-3 md:max-w-[80%]">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }}></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4 md:p-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about compliance, controls, or assessments..."
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-[#FFE600] focus:outline-none focus:ring-2 focus:ring-[#FFE600] focus:ring-opacity-50"
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#FFE600] transition-all hover:bg-[#FFD700] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#FFE600] focus:ring-offset-2"
              aria-label="Send message"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="#2E2E38"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatModal;