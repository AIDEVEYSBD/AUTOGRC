"use client"

import { useState, useMemo } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Enforceability = "Guidance" | "Enforceable without penalty" | "Enforceable with penalty"

type SuggestedControl = {
  code: string
  domain: string
  statement: string
}

type Article = {
  id: string
  name: string
  enforceability: Enforceability
  enforcementDate: string
  enforcementYear: number
  highlights: string[]
  suggestedControls: SuggestedControl[]
}

type RegulationEntry = {
  id: string
  name: string
  shortName: string
  sectors: string[]
  geographies: string[]
  articles: Article[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const REGULATIONS: RegulationEntry[] = [
  // ── EU AI Act ──────────────────────────────────────────────────────────────
  {
    id: "eu-ai-act",
    name: "EU Artificial Intelligence Act",
    shortName: "EU AI Act",
    sectors: ["IT Services", "Healthcare", "Financial Services", "Manufacturing", "All Sectors"],
    geographies: ["Europe"],
    articles: [
      {
        id: "eu-ai-art5",
        name: "Article 5 – Prohibited AI Practices",
        enforceability: "Enforceable with penalty",
        enforcementDate: "2 Aug 2024",
        enforcementYear: 2024,
        highlights: [
          "Prohibits AI systems that deploy subliminal manipulation or exploitative techniques targeting vulnerable groups.",
          "Bans social scoring systems operated by or on behalf of public authorities.",
          "Prohibits real-time remote biometric identification in publicly accessible spaces except under narrow law-enforcement exceptions.",
          "Non-compliance may result in fines up to €35 million or 7% of global annual turnover.",
        ],
        suggestedControls: [
          { code: "AI-P1", domain: "AI Governance", statement: "Maintain an inventory of AI systems and classify each against the prohibited practice definitions in Article 5 of the EU AI Act." },
          { code: "AI-P2", domain: "AI Governance", statement: "Establish a review process to assess new AI deployments against prohibited use-case criteria prior to go-live approval." },
          { code: "AI-P3", domain: "Privacy", statement: "Implement controls to prevent deployment of real-time biometric identification systems in public spaces without lawful authority." },
        ],
      },
      {
        id: "eu-ai-art6",
        name: "Article 6 – High-Risk AI Classification",
        enforceability: "Enforceable with penalty",
        enforcementDate: "2 Aug 2026",
        enforcementYear: 2026,
        highlights: [
          "AI systems used in critical infrastructure, education, employment, or essential services are classified as high-risk.",
          "High-risk classification triggers mandatory conformity assessment obligations before market placement.",
          "Providers must register high-risk AI systems in the EU AI database before deployment.",
          "ISO 27001:2023-certified organisations may leverage existing controls to reduce additional compliance overhead.",
        ],
        suggestedControls: [
          { code: "AI-H1", domain: "AI Governance", statement: "Establish and maintain a classification register for all AI systems documenting whether each meets the high-risk criteria defined in Annex III of the EU AI Act." },
          { code: "AI-H2", domain: "AI Governance", statement: "Define and implement a conformity assessment process for high-risk AI systems prior to deployment, reviewed by a designated risk owner." },
          { code: "AI-H3", domain: "Compliance", statement: "Register all high-risk AI systems in the EU AI database maintained by the European Commission prior to market placement." },
        ],
      },
      {
        id: "eu-ai-art9",
        name: "Article 9 – Risk Management System",
        enforceability: "Enforceable with penalty",
        enforcementDate: "2 Aug 2026",
        enforcementYear: 2026,
        highlights: [
          "Providers of high-risk AI systems must establish a documented, iterative risk management system.",
          "Risk management must cover the entire AI system lifecycle, from design to decommissioning.",
          "Residual risks must be evaluated, accepted, and communicated to deployers.",
          "Foreseeable misuse scenarios must be explicitly considered in the risk assessment.",
        ],
        suggestedControls: [
          { code: "AI-R1", domain: "Risk Management", statement: "Implement a documented AI risk management framework covering identification, analysis, evaluation, and treatment of risks throughout the AI system lifecycle." },
          { code: "AI-R2", domain: "Risk Management", statement: "Conduct and document foreseeable misuse analysis for each high-risk AI system, with findings reviewed by a risk committee at least annually." },
          { code: "AI-R3", domain: "Change Management", statement: "Ensure AI risk assessment is re-triggered for material changes to model architecture, training data, or intended use." },
        ],
      },
      {
        id: "eu-ai-art10",
        name: "Article 10 – Data & Data Governance",
        enforceability: "Enforceable with penalty",
        enforcementDate: "2 Aug 2026",
        enforcementYear: 2026,
        highlights: [
          "Training, validation, and testing datasets must be subject to formal data governance practices.",
          "Datasets must be relevant, sufficiently representative, and free from errors to the extent possible.",
          "Special category personal data used in AI training requires additional technical and organisational safeguards.",
          "Bias monitoring and correction measures must be implemented and documented.",
        ],
        suggestedControls: [
          { code: "AI-D1", domain: "Data Governance", statement: "Implement data governance procedures for AI training, validation, and testing datasets, including documentation of data provenance, lineage, and quality assessments." },
          { code: "AI-D2", domain: "Data Quality", statement: "Perform statistical representativeness analysis on training datasets and document findings, including identification and mitigation of known biases." },
          { code: "AI-D3", domain: "Privacy", statement: "Establish controls for the use of special category personal data in AI training, including legal basis documentation and additional technical safeguards." },
        ],
      },
      {
        id: "eu-ai-art13",
        name: "Article 13 – Transparency & Information",
        enforceability: "Enforceable without penalty",
        enforcementDate: "2 Aug 2025",
        enforcementYear: 2025,
        highlights: [
          "High-risk AI systems must be designed to enable deployers to interpret outputs appropriately.",
          "Providers must supply instructions for use covering technical specifications and known limitations.",
          "Capabilities, limitations, and foreseeable error rates must be disclosed to deployers.",
        ],
        suggestedControls: [
          { code: "AI-T1", domain: "AI Governance", statement: "Develop and maintain technical documentation and instructions-for-use for each high-risk AI system, covering intended purpose, performance metrics, and known limitations." },
          { code: "AI-T2", domain: "AI Governance", statement: "Implement explainability mechanisms for AI model outputs that enable deployers and oversight personnel to interpret and challenge automated decisions." },
        ],
      },
      {
        id: "eu-ai-art14",
        name: "Article 14 – Human Oversight",
        enforceability: "Enforceable with penalty",
        enforcementDate: "2 Aug 2026",
        enforcementYear: 2026,
        highlights: [
          "High-risk AI systems must include built-in human oversight measures as part of their design.",
          "Designated natural persons must be able to monitor, understand, and intervene in AI operation.",
          "Deployers must assign qualified individuals with defined oversight responsibilities.",
          "Technical override and halt capabilities must be implemented and tested.",
        ],
        suggestedControls: [
          { code: "AI-O1", domain: "AI Governance", statement: "Define and assign human oversight roles for each high-risk AI system, with documented responsibilities, competency requirements, and escalation paths." },
          { code: "AI-O2", domain: "Access Control", statement: "Implement technical controls enabling authorised personnel to override, suspend, or halt high-risk AI system outputs in real time without vendor intervention." },
          { code: "AI-O3", domain: "Training & Awareness", statement: "Provide role-specific AI literacy training to personnel assigned oversight responsibilities, with completion records maintained annually." },
        ],
      },
      {
        id: "eu-ai-art15",
        name: "Article 15 – Accuracy, Robustness & Cybersecurity",
        enforceability: "Enforceable with penalty",
        enforcementDate: "2 Aug 2026",
        enforcementYear: 2026,
        highlights: [
          "High-risk AI systems must achieve and maintain appropriate levels of accuracy as declared in technical documentation.",
          "Systems must be resilient to errors, faults, inconsistencies, and adversarial inputs.",
          "Cybersecurity measures must protect against attempts to alter system use, behaviour, or performance.",
          "Accuracy metrics and robustness measures must be validated continuously through post-market monitoring.",
        ],
        suggestedControls: [
          { code: "AI-C1", domain: "AI Governance", statement: "Define accuracy benchmarks for each high-risk AI system and validate performance against these benchmarks at deployment and during post-market monitoring." },
          { code: "AI-C2", domain: "Cybersecurity", statement: "Conduct adversarial robustness testing — including data poisoning and evasion attack simulations — for high-risk AI systems prior to deployment and after major updates." },
          { code: "AI-C3", domain: "Cybersecurity", statement: "Apply cybersecurity controls to protect AI model weights, training pipelines, and inference endpoints against unauthorised access, modification, or exfiltration." },
          { code: "AI-C4", domain: "Monitoring", statement: "Implement continuous post-market monitoring for AI system accuracy drift, with automated alerting when performance degrades below defined thresholds." },
        ],
      },
    ],
  },

  // ── GDPR ───────────────────────────────────────────────────────────────────
  {
    id: "gdpr",
    name: "General Data Protection Regulation",
    shortName: "GDPR",
    sectors: ["All Sectors"],
    geographies: ["Europe"],
    articles: [
      {
        id: "gdpr-art5",
        name: "Article 5 – Principles of Data Processing",
        enforceability: "Enforceable with penalty",
        enforcementDate: "25 May 2018",
        enforcementYear: 2018,
        highlights: [
          "Personal data must be processed lawfully, fairly, and transparently.",
          "Data must be collected for specified, explicit, and legitimate purposes and not further processed incompatibly.",
          "Data minimisation: only data adequate, relevant, and limited to what is necessary may be collected.",
          "Fines up to €20 million or 4% of global annual turnover for non-compliance.",
        ],
        suggestedControls: [
          { code: "GDP-PP1", domain: "Privacy", statement: "Maintain a Record of Processing Activities (RoPA) documenting legal bases, purposes, data categories, and retention periods for all personal data processing activities." },
          { code: "GDP-PP2", domain: "Data Governance", statement: "Implement data minimisation reviews at project inception to ensure only necessary personal data fields are collected and stored." },
        ],
      },
      {
        id: "gdpr-art25",
        name: "Article 25 – Data Protection by Design and by Default",
        enforceability: "Enforceable with penalty",
        enforcementDate: "25 May 2018",
        enforcementYear: 2018,
        highlights: [
          "Privacy controls must be integrated into systems and processes during design, not added afterwards.",
          "By default, only personal data necessary for each purpose should be processed.",
          "Technical and organisational measures must be implemented to embed data protection principles.",
        ],
        suggestedControls: [
          { code: "GDP-PBD1", domain: "Privacy", statement: "Integrate privacy-by-design reviews into the software development lifecycle (SDLC) as a mandatory gate prior to deployment of any system processing personal data." },
          { code: "GDP-PBD2", domain: "Data Governance", statement: "Establish default privacy settings for all customer-facing systems such that the most privacy-protective options are enabled out-of-the-box." },
        ],
      },
      {
        id: "gdpr-art32",
        name: "Article 32 – Security of Processing",
        enforceability: "Enforceable with penalty",
        enforcementDate: "25 May 2018",
        enforcementYear: 2018,
        highlights: [
          "Controllers and processors must implement appropriate technical and organisational security measures.",
          "Measures must include pseudonymisation and encryption of personal data.",
          "Ongoing confidentiality, integrity, availability, and resilience of processing systems must be ensured.",
          "Regular testing and evaluation of effectiveness of security measures is required.",
        ],
        suggestedControls: [
          { code: "GDP-SEC1", domain: "Cryptography", statement: "Enforce encryption at rest and in transit for all personal data using industry-standard algorithms, with key management procedures documented and tested annually." },
          { code: "GDP-SEC2", domain: "Cybersecurity", statement: "Implement pseudonymisation techniques for personal data used in non-production environments, analytics, and AI training pipelines." },
          { code: "GDP-SEC3", domain: "Cybersecurity", statement: "Conduct annual penetration testing and security assessments of systems processing personal data, with remediation tracked to closure." },
        ],
      },
      {
        id: "gdpr-art35",
        name: "Article 35 – Data Protection Impact Assessment",
        enforceability: "Enforceable without penalty",
        enforcementDate: "25 May 2018",
        enforcementYear: 2018,
        highlights: [
          "A DPIA is mandatory when processing is likely to result in high risk to individuals' rights and freedoms.",
          "Processing that involves systematic profiling, sensitive data at scale, or public area monitoring requires a DPIA.",
          "DPIAs must assess necessity, proportionality, and mitigation measures for identified risks.",
        ],
        suggestedControls: [
          { code: "GDP-DPIA1", domain: "Privacy", statement: "Establish a DPIA screening process triggered for all new or significantly changed processing activities involving personal data, with documented outcomes." },
          { code: "GDP-DPIA2", domain: "Risk Management", statement: "Maintain a register of completed DPIAs and schedule periodic reviews (at least every three years) to ensure ongoing relevance and effectiveness." },
        ],
      },
    ],
  },

  // ── HIPAA ──────────────────────────────────────────────────────────────────
  {
    id: "hipaa",
    name: "Health Insurance Portability and Accountability Act",
    shortName: "HIPAA",
    sectors: ["Healthcare"],
    geographies: ["Americas"],
    articles: [
      {
        id: "hipaa-privacy",
        name: "Privacy Rule – Permitted Uses and Disclosures",
        enforceability: "Enforceable with penalty",
        enforcementDate: "14 Apr 2003",
        enforcementYear: 2003,
        highlights: [
          "Covered entities may only use or disclose PHI for treatment, payment, healthcare operations, or with patient authorisation.",
          "Patients have rights to access, amend, and obtain an accounting of disclosures of their PHI.",
          "Minimum necessary standard: only the minimum amount of PHI needed to accomplish the intended purpose may be used.",
          "Civil penalties range from $100 to $50,000 per violation, with annual caps up to $1.9 million.",
        ],
        suggestedControls: [
          { code: "HIP-PR1", domain: "Privacy", statement: "Implement and enforce a minimum necessary policy defining permitted access scopes for PHI by role, purpose, and system, reviewed at least annually." },
          { code: "HIP-PR2", domain: "Privacy", statement: "Establish and maintain patient rights procedures covering access requests, amendment requests, and accounting of disclosures, with response timelines tracked." },
        ],
      },
      {
        id: "hipaa-security",
        name: "Security Rule – Administrative & Technical Safeguards",
        enforceability: "Enforceable with penalty",
        enforcementDate: "20 Apr 2005",
        enforcementYear: 2005,
        highlights: [
          "Covered entities must implement administrative, physical, and technical safeguards to protect electronic PHI (ePHI).",
          "A Security Risk Analysis must be conducted and documented on a regular basis.",
          "Workforce training on PHI security policies is mandatory.",
          "Access controls, audit controls, and transmission security must be implemented for all ePHI systems.",
        ],
        suggestedControls: [
          { code: "HIP-SEC1", domain: "Risk Management", statement: "Conduct and document a HIPAA Security Risk Analysis at least annually and after any significant change to systems processing ePHI, with remediation plans tracked." },
          { code: "HIP-SEC2", domain: "Access Control", statement: "Implement role-based access controls for all ePHI systems, with access reviews performed semi-annually and access removal completed within 24 hours of role change." },
          { code: "HIP-SEC3", domain: "Training & Awareness", statement: "Deliver mandatory annual HIPAA security training to all workforce members with access to ePHI, with completion records maintained for six years." },
        ],
      },
      {
        id: "hipaa-breach",
        name: "Breach Notification Rule – Notification Requirements",
        enforceability: "Enforceable with penalty",
        enforcementDate: "23 Sep 2009",
        enforcementYear: 2009,
        highlights: [
          "Covered entities must notify affected individuals within 60 days of discovering a breach of unsecured PHI.",
          "Breaches affecting 500 or more individuals must be reported to HHS and prominent media in the affected state.",
          "Business associates must notify covered entities of breaches without unreasonable delay.",
          "A breach is presumed to have occurred unless a risk assessment demonstrates low probability of PHI compromise.",
        ],
        suggestedControls: [
          { code: "HIP-BNR1", domain: "Incident Management", statement: "Establish a HIPAA breach notification procedure including internal escalation timelines, HHS reporting workflows, and template notifications for affected individuals." },
          { code: "HIP-BNR2", domain: "Incident Management", statement: "Maintain a breach log and conduct a risk assessment for every potential PHI exposure event to determine whether breach notification obligations are triggered." },
        ],
      },
    ],
  },

  // ── NIS2 ───────────────────────────────────────────────────────────────────
  {
    id: "nis2",
    name: "Network and Information Security Directive 2",
    shortName: "NIS2",
    sectors: ["IT Services", "Financial Services", "Healthcare", "Manufacturing"],
    geographies: ["Europe"],
    articles: [
      {
        id: "nis2-art21",
        name: "Article 21 – Cybersecurity Risk Management",
        enforceability: "Enforceable with penalty",
        enforcementDate: "17 Oct 2024",
        enforcementYear: 2024,
        highlights: [
          "Essential and important entities must adopt appropriate and proportionate technical and organisational measures to manage cybersecurity risks.",
          "Required measures include policies on risk analysis, incident handling, business continuity, supply chain security, and cryptography.",
          "Multi-factor authentication (MFA) or continuous authentication solutions must be used where appropriate.",
          "Fines up to €10 million or 2% of global annual turnover for essential entities.",
        ],
        suggestedControls: [
          { code: "NIS-RM1", domain: "Risk Management", statement: "Implement a cybersecurity risk management programme aligned with NIS2 Article 21 requirements, covering risk identification, treatment, and regular review cycles." },
          { code: "NIS-RM2", domain: "Access Control", statement: "Deploy multi-factor authentication for all remote access, privileged accounts, and administrative interfaces across essential and important entity systems." },
          { code: "NIS-RM3", domain: "Supply Chain", statement: "Assess and document cybersecurity risks in the supply chain, with contractual security requirements included in all ICT supplier agreements." },
        ],
      },
      {
        id: "nis2-art23",
        name: "Article 23 – Incident Reporting Obligations",
        enforceability: "Enforceable with penalty",
        enforcementDate: "17 Oct 2024",
        enforcementYear: 2024,
        highlights: [
          "Significant incidents must be reported to the national CSIRT or competent authority without undue delay.",
          "An early warning must be submitted within 24 hours, a full incident notification within 72 hours.",
          "A final report must follow within one month detailing root cause, impact, and remediation actions.",
          "Cross-border incidents may require simultaneous notification to multiple national authorities.",
        ],
        suggestedControls: [
          { code: "NIS-REP1", domain: "Incident Management", statement: "Establish a NIS2-compliant incident reporting procedure with 24-hour early warning and 72-hour notification timelines, including templates for competent authority submissions." },
          { code: "NIS-REP2", domain: "Incident Management", statement: "Implement automated detection and triage capabilities to identify significant incidents within the NIS2-defined reporting window and initiate notification workflows." },
        ],
      },
      {
        id: "nis2-art24",
        name: "Article 24 – Use of European Cybersecurity Certification",
        enforceability: "Guidance",
        enforcementDate: "17 Oct 2024",
        enforcementYear: 2024,
        highlights: [
          "Member States shall encourage the use of European cybersecurity certification schemes for ICT products and services.",
          "Competent authorities may require entities to certify specific ICT products, services, or processes.",
          "Certification schemes should align with ENISA and the EU Cybersecurity Act framework.",
        ],
        suggestedControls: [
          { code: "NIS-CERT1", domain: "Supply Chain", statement: "Evaluate ICT products and cloud services against available European cybersecurity certification schemes (EUCS, EUCC) as part of procurement and vendor assessment processes." },
        ],
      },
    ],
  },

  // ── DORA ───────────────────────────────────────────────────────────────────
  {
    id: "dora",
    name: "Digital Operational Resilience Act",
    shortName: "DORA",
    sectors: ["Financial Services"],
    geographies: ["Europe"],
    articles: [
      {
        id: "dora-art5",
        name: "Article 5 – ICT Risk Management Framework",
        enforceability: "Enforceable with penalty",
        enforcementDate: "17 Jan 2025",
        enforcementYear: 2025,
        highlights: [
          "Financial entities must have an internal governance and control framework for ICT risk management.",
          "Management body bears ultimate responsibility for the ICT risk management framework.",
          "Entities must identify, classify, and document all ICT assets and their interdependencies.",
          "ICT risk strategy must be integrated with the entity's overall business strategy.",
        ],
        suggestedControls: [
          { code: "DOR-ICT1", domain: "Risk Management", statement: "Establish an ICT risk management framework governing identification, classification, and treatment of ICT risks, with management body sign-off at least annually." },
          { code: "DOR-ICT2", domain: "Asset Management", statement: "Maintain a comprehensive ICT asset register documenting all hardware, software, and service components, including their interdependencies and criticality ratings." },
          { code: "DOR-ICT3", domain: "Governance", statement: "Assign and document accountabilities for ICT risk management at management body level, with clear escalation paths and reporting lines to the board." },
        ],
      },
      {
        id: "dora-art11",
        name: "Article 11 – ICT Business Continuity",
        enforceability: "Enforceable with penalty",
        enforcementDate: "17 Jan 2025",
        enforcementYear: 2025,
        highlights: [
          "Financial entities must have ICT business continuity policies as part of their operational resilience framework.",
          "Business continuity plans must be tested at least annually, with lessons learned incorporated.",
          "Recovery time and point objectives (RTO/RPO) must be defined for all critical ICT systems.",
          "Crisis communication plans for ICT disruptions must address regulators, staff, clients, and media.",
        ],
        suggestedControls: [
          { code: "DOR-BC1", domain: "Business Continuity", statement: "Define and document RTO/RPO targets for all critical ICT systems based on business impact analysis, with annual testing validating achievability." },
          { code: "DOR-BC2", domain: "Business Continuity", statement: "Develop and test ICT crisis communication plans covering notification procedures for regulators, counterparties, and clients in the event of a significant ICT disruption." },
        ],
      },
      {
        id: "dora-art17",
        name: "Article 17 – ICT Incident Classification",
        enforceability: "Enforceable with penalty",
        enforcementDate: "17 Jan 2025",
        enforcementYear: 2025,
        highlights: [
          "Financial entities must classify ICT incidents as major or non-major based on defined criteria.",
          "Classification criteria include number of clients affected, duration, geographic spread, and data losses.",
          "Major ICT incidents must be reported to competent authorities with initial notification within 4 hours of classification.",
          "A final incident report must be submitted within one month of incident closure.",
        ],
        suggestedControls: [
          { code: "DOR-INC1", domain: "Incident Management", statement: "Implement an ICT incident classification procedure aligned with DORA criteria, enabling consistent determination of major vs. non-major incidents within defined timeframes." },
          { code: "DOR-INC2", domain: "Incident Management", statement: "Establish DORA-compliant major incident reporting workflows with 4-hour initial notification and one-month final report capabilities, including templates for competent authority submissions." },
        ],
      },
      {
        id: "dora-art26",
        name: "Article 26 – Third-Party ICT Risk",
        enforceability: "Enforceable with penalty",
        enforcementDate: "17 Jan 2025",
        enforcementYear: 2025,
        highlights: [
          "Financial entities must maintain a register of all contractual arrangements with third-party ICT service providers.",
          "Critical ICT third-party providers are subject to an EU oversight framework by supervisory authorities.",
          "Exit strategies must be in place for all critical or important ICT third-party arrangements.",
          "Contractual agreements must include provisions on accessibility, availability, integrity, security, and service levels.",
        ],
        suggestedControls: [
          { code: "DOR-TPM1", domain: "Supply Chain", statement: "Maintain a DORA-compliant register of all ICT third-party service arrangements, updated upon each new contract or material change, with criticality classifications documented." },
          { code: "DOR-TPM2", domain: "Supply Chain", statement: "Develop and test exit strategies for all critical or important ICT third-party arrangements, ensuring continuity of service in the event of provider failure or termination." },
        ],
      },
    ],
  },
]

// ─── Derived constants ────────────────────────────────────────────────────────

const ALL_SECTORS = Array.from(
  new Set(REGULATIONS.flatMap((r) => r.sectors))
).sort((a, b) => (a === "All Sectors" ? -1 : b === "All Sectors" ? 1 : a.localeCompare(b)))

const ALL_GEOS = Array.from(new Set(REGULATIONS.flatMap((r) => r.geographies))).sort()

// Flat list of all articles across all regulations (for baseline modal)
type FlatArticle = Article & { regulationId: string; regulationShortName: string }

const ALL_ARTICLES: FlatArticle[] = REGULATIONS.flatMap((reg) =>
  reg.articles.map((art) => ({
    ...art,
    regulationId: reg.id,
    regulationShortName: reg.shortName,
  }))
)

// ─── Helper components ────────────────────────────────────────────────────────

function enforceabilityStyle(level: Enforceability) {
  if (level === "Enforceable with penalty") return { bg: "bg-[#e41f13]/10", text: "text-[#e41f13]" }
  if (level === "Enforceable without penalty") return { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]" }
  return { bg: "bg-[#eef2ff]", text: "text-[#4f46e5]" }
}

function EnforceabilityBadge({ level }: { level: Enforceability }) {
  const { bg, text } = enforceabilityStyle(level)
  return (
    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${bg} ${text}`}>
      {level}
    </span>
  )
}

function TrendChart({ data }: { data: { year: number; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const barWidth = 32
  const gap = 14
  const chartHeight = 72
  const currentYear = new Date().getFullYear()
  const totalWidth = data.length * (barWidth + gap) - gap

  return (
    <svg width={totalWidth} height={chartHeight + 26} className="overflow-visible">
      {data.map((d, i) => {
        const barH = Math.max(Math.round((d.count / maxCount) * chartHeight), 4)
        const x = i * (barWidth + gap)
        const y = chartHeight - barH
        const isCurrentYear = d.year === currentYear
        return (
          <g key={d.year}>
            <rect x={x} y={y} width={barWidth} height={barH} rx={3}
              fill={isCurrentYear ? "var(--md-primary)" : "var(--md-primary-container)"} />
            <text x={x + barWidth / 2} y={y - 3} textAnchor="middle" fontSize={10} fontWeight={700}
              fill="var(--md-on-surface)">{d.count}</text>
            <text x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle" fontSize={10}
              fill="var(--md-on-surface-variant)" fontWeight={isCurrentYear ? 700 : 400}>{d.year}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Baseline Modal ───────────────────────────────────────────────────────────

function BaselineModal({
  initialArticleId,
  onClose,
}: {
  initialArticleId: string | null
  onClose: () => void
}) {
  // Build initial checked state — all controls checked
  const allControls = ALL_ARTICLES.flatMap((a) => a.suggestedControls.map((c) => c.code))
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(allControls.map((code) => [code, true]))
  )
  const [expandedRegIds, setExpandedRegIds] = useState<Set<string>>(
    // Expand the regulation that owns the initially selected article
    () => {
      if (!initialArticleId) return new Set(REGULATIONS.map((r) => r.id))
      const ownerReg = REGULATIONS.find((r) => r.articles.some((a) => a.id === initialArticleId))
      return new Set(ownerReg ? [ownerReg.id] : REGULATIONS.map((r) => r.id))
    }
  )
  const [done, setDone] = useState(false)

  const toggleExpandReg = (regId: string) =>
    setExpandedRegIds((prev) => {
      const next = new Set(prev)
      next.has(regId) ? next.delete(regId) : next.add(regId)
      return next
    })

  const toggleRegAll = (reg: RegulationEntry, val: boolean) => {
    const codes = reg.articles.flatMap((a) => a.suggestedControls.map((c) => c.code))
    setChecked((prev) => ({ ...prev, ...Object.fromEntries(codes.map((c) => [c, val])) }))
  }

  const toggleArticleAll = (article: Article, val: boolean) => {
    const codes = article.suggestedControls.map((c) => c.code)
    setChecked((prev) => ({ ...prev, ...Object.fromEntries(codes.map((c) => [c, val])) }))
  }

  const isRegAllChecked = (reg: RegulationEntry) =>
    reg.articles.flatMap((a) => a.suggestedControls).every((c) => checked[c.code])
  const isRegIndeterminate = (reg: RegulationEntry) => {
    const controls = reg.articles.flatMap((a) => a.suggestedControls)
    const someChecked = controls.some((c) => checked[c.code])
    const allChecked = controls.every((c) => checked[c.code])
    return someChecked && !allChecked
  }

  const selectedCount = Object.values(checked).filter(Boolean).length
  const totalCount = allControls.length

  const handleSelectAll = (val: boolean) =>
    setChecked(Object.fromEntries(allControls.map((code) => [code, val])))

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-md-surface-container w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-md-outline-variant flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "var(--md-primary-container)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--md-on-primary-container)" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-md-on-surface">Baseline Master Framework</h3>
              <p className="text-xs text-md-on-surface-variant mt-0.5">
                Framework Mapper detected regulatory controls missing from your master framework
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-md-on-surface-variant hover:text-md-on-surface transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {done ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e8f5e9" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke="#00a758" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-md-on-surface">Controls queued for addition</p>
                <p className="text-sm text-md-on-surface-variant mt-1">
                  {selectedCount} control{selectedCount !== 1 ? "s" : ""} have been queued for addition to your master framework.
                </p>
              </div>
              <button onClick={onClose}
                className="mt-2 px-6 py-2 font-bold bg-md-primary-container text-md-on-primary-container rounded-lg hover:bg-md-primary hover:text-md-on-primary transition-colors">
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-md-on-surface-variant leading-relaxed">
                The following suggested control activities were identified as potentially missing from your master framework.
                Select the controls you would like to add across all regulations and acts.
              </p>

              {/* Global select all / none */}
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-md-on-surface-variant">
                  {selectedCount} of {totalCount} controls selected
                </span>
                <div className="flex gap-3">
                  <button onClick={() => handleSelectAll(true)}
                    className="text-xs font-bold text-md-on-surface-variant hover:text-md-on-surface underline underline-offset-2 transition-colors">
                    Select all
                  </button>
                  <button onClick={() => handleSelectAll(false)}
                    className="text-xs font-bold text-md-on-surface-variant hover:text-md-on-surface underline underline-offset-2 transition-colors">
                    Deselect all
                  </button>
                </div>
              </div>

              {/* Regulations accordion */}
              <div className="space-y-2">
                {REGULATIONS.map((reg) => {
                  const isExpanded = expandedRegIds.has(reg.id)
                  const allChecked = isRegAllChecked(reg)
                  const indeterminate = isRegIndeterminate(reg)
                  const regControlCount = reg.articles.flatMap((a) => a.suggestedControls).length
                  const regCheckedCount = reg.articles
                    .flatMap((a) => a.suggestedControls)
                    .filter((c) => checked[c.code]).length

                  return (
                    <div key={reg.id} className="rounded-lg border border-md-outline-variant overflow-hidden">
                      {/* Regulation header */}
                      <div className="flex items-center gap-3 px-4 py-3 bg-md-surface-container-high">
                        <input
                          type="checkbox"
                          className="w-4 h-4 flex-shrink-0 accent-[var(--md-primary)]"
                          checked={allChecked}
                          ref={(el) => { if (el) el.indeterminate = indeterminate }}
                          onChange={(e) => toggleRegAll(reg, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={() => toggleExpandReg(reg.id)}
                          className="flex-1 flex items-center justify-between gap-2 text-left"
                        >
                          <div>
                            <span className="text-sm font-bold text-md-on-surface">{reg.shortName}</span>
                            <span className="ml-2 text-xs text-md-on-surface-variant">{reg.name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-md-on-surface-variant">
                              {regCheckedCount}/{regControlCount}
                            </span>
                            <svg
                              width="14" height="14" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                              className={`text-md-on-surface-variant transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </button>
                      </div>

                      {/* Articles */}
                      {isExpanded && (
                        <div className="divide-y divide-md-outline-variant">
                          {reg.articles.map((article) => {
                            const artCheckedCount = article.suggestedControls.filter((c) => checked[c.code]).length
                            const artAllChecked = artCheckedCount === article.suggestedControls.length
                            const artIndeterminate = artCheckedCount > 0 && !artAllChecked

                            return (
                              <div key={article.id} className="bg-md-surface">
                                {/* Article sub-header */}
                                <div className="flex items-center gap-3 px-4 py-2.5 pl-8">
                                  <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 flex-shrink-0 accent-[var(--md-primary)]"
                                    checked={artAllChecked}
                                    ref={(el) => { if (el) el.indeterminate = artIndeterminate }}
                                    onChange={(e) => toggleArticleAll(article, e.target.checked)}
                                  />
                                  <span className="text-xs font-bold text-md-on-surface flex-1">{article.name}</span>
                                  <span className="text-xs text-md-on-surface-variant flex-shrink-0">
                                    {artCheckedCount}/{article.suggestedControls.length}
                                  </span>
                                </div>

                                {/* Controls */}
                                <div className="pb-2">
                                  {article.suggestedControls.map((ctrl) => (
                                    <label
                                      key={ctrl.code}
                                      className={`flex items-start gap-3 px-4 py-2 pl-12 cursor-pointer transition-colors ${
                                        checked[ctrl.code]
                                          ? "bg-md-primary-container/15"
                                          : "hover:bg-md-surface-container"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 accent-[var(--md-primary)]"
                                        checked={!!checked[ctrl.code]}
                                        onChange={(e) =>
                                          setChecked((prev) => ({ ...prev, [ctrl.code]: e.target.checked }))
                                        }
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs font-bold text-md-on-surface font-mono">{ctrl.code}</span>
                                          <span className="text-xs px-1.5 py-0.5 rounded text-md-on-surface-variant"
                                            style={{ backgroundColor: "var(--md-surface-container-high)" }}>
                                            {ctrl.domain}
                                          </span>
                                        </div>
                                        <p className="text-xs text-md-on-surface-variant mt-0.5 leading-relaxed">{ctrl.statement}</p>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-md-outline-variant flex-shrink-0">
            <span className="text-sm text-md-on-surface-variant">
              {selectedCount} control{selectedCount !== 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-3">
              <button onClick={onClose}
                className="px-4 py-2 text-sm font-bold border border-md-outline-variant text-md-on-surface rounded-lg hover:bg-md-surface-container-high transition-colors">
                Cancel
              </button>
              <button
                onClick={() => setDone(true)}
                disabled={selectedCount === 0}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                  selectedCount === 0
                    ? "bg-md-outline-variant text-md-on-surface-variant cursor-not-allowed"
                    : "bg-md-primary-container text-md-on-primary-container hover:bg-md-primary hover:text-md-on-primary"
                }`}
              >
                Add to Master Framework
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FrameworkWorkbenchPage() {
  const [selectedSector, setSelectedSector] = useState("All")
  const [selectedGeo, setSelectedGeo] = useState("All")
  const [expandedRegIds, setExpandedRegIds] = useState<Set<string>>(new Set([REGULATIONS[0].id]))
  const [selectedArticleId, setSelectedArticleId] = useState<string>(REGULATIONS[0].articles[0].id)
  const [showBaselineModal, setShowBaselineModal] = useState(false)

  // Filter regulations
  const filteredRegs = useMemo(() => {
    return REGULATIONS.filter((r) => {
      const sectorMatch =
        selectedSector === "All" ||
        r.sectors.includes(selectedSector) ||
        r.sectors.includes("All Sectors")
      const geoMatch = selectedGeo === "All" || r.geographies.includes(selectedGeo)
      return sectorMatch && geoMatch
    })
  }, [selectedSector, selectedGeo])

  // Find selected article across all regulations
  const selectedArticle = useMemo(() => {
    for (const reg of REGULATIONS) {
      const art = reg.articles.find((a) => a.id === selectedArticleId)
      if (art) return { article: art, regulation: reg }
    }
    return null
  }, [selectedArticleId])

  const toggleRegExpand = (regId: string) =>
    setExpandedRegIds((prev) => {
      const next = new Set(prev)
      next.has(regId) ? next.delete(regId) : next.add(regId)
      return next
    })

  // KPI calculations
  const totalRegulations = REGULATIONS.length
  const totalArticles = useMemo(() => REGULATIONS.reduce((s, r) => s + r.articles.length, 0), [])
  const uniqueSectors = useMemo(
    () => new Set(REGULATIONS.flatMap((r) => r.sectors.filter((s) => s !== "All Sectors"))).size,
    []
  )
  const uniqueGeos = useMemo(
    () => new Set(REGULATIONS.flatMap((r) => r.geographies)).size,
    []
  )

  const now = new Date()
  const oneYearFromNow = new Date(now)
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

  const enforceableNextYear = useMemo(() => {
    const MONTHS: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    }
    return ALL_ARTICLES.filter((a) => {
      const parts = a.enforcementDate.split(" ")
      const d = new Date(parseInt(parts[2]), MONTHS[parts[1]] ?? 0, parseInt(parts[0]))
      return d >= now && d <= oneYearFromNow
    }).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const upcomingYears = ALL_ARTICLES.filter((a) => a.enforcementYear >= now.getFullYear()).map((a) => a.enforcementYear)
  const nextEnforcementYear = upcomingYears.length > 0 ? Math.min(...upcomingYears) : now.getFullYear()

  const trendData = useMemo(() => {
    const byYear: Record<number, number> = {}
    ALL_ARTICLES.forEach((a) => { byYear[a.enforcementYear] = (byYear[a.enforcementYear] ?? 0) + 1 })
    return Object.entries(byYear)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year)
  }, [])

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-md-on-surface">Framework Workbench</h1>
          <p className="mt-1 text-base text-md-on-surface-variant max-w-3xl">
            Explore active and upcoming regulations by industry sector and geography, assess enforceability
            timelines, and baseline your master framework against regulatory control requirements.
          </p>
        </div>
        <button
          onClick={() => setShowBaselineModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-md-primary-container text-md-on-primary-container hover:bg-md-primary hover:text-md-on-primary transition-colors flex-shrink-0"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Baseline Master Framework
        </button>
      </div>

      {/* ── Filters + KPI Row ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-md-outline-variant bg-md-surface-container p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 flex-shrink-0">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-md-on-surface-variant">
                Industry Sector
              </label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="border border-md-outline-variant rounded-lg px-3 py-2 text-sm bg-md-surface text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary-container min-w-[180px]"
              >
                <option value="All">All Sectors</option>
                {ALL_SECTORS.filter((s) => s !== "All Sectors").map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-md-on-surface-variant">
                Geography
              </label>
              <select
                value={selectedGeo}
                onChange={(e) => setSelectedGeo(e.target.value)}
                className="border border-md-outline-variant rounded-lg px-3 py-2 text-sm bg-md-surface text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary-container min-w-[180px]"
              >
                <option value="All">All Geographies</option>
                {ALL_GEOS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="hidden lg:block w-px self-stretch bg-md-outline-variant mx-2" />

          {/* KPI cards */}
          <div className="flex flex-wrap gap-4 flex-1">
            <div className="flex flex-col justify-between rounded-lg border border-md-outline-variant bg-md-surface p-4 min-w-[120px]">
              <span className="text-xs font-medium text-md-on-surface-variant leading-snug">Regulations in DB</span>
              <span className="text-3xl font-bold text-md-on-surface mt-2">{totalRegulations}</span>
            </div>
            <div className="flex flex-col justify-between rounded-lg border border-md-outline-variant bg-md-surface p-4 min-w-[120px]">
              <span className="text-xs font-medium text-md-on-surface-variant leading-snug">Total Acts / Articles</span>
              <span className="text-3xl font-bold text-md-on-surface mt-2">{totalArticles}</span>
            </div>
            <div className="flex flex-col justify-between rounded-lg border border-md-outline-variant bg-md-surface p-4 min-w-[130px]">
              <span className="text-xs font-medium text-md-on-surface-variant leading-snug">Industry Sectors Covered</span>
              <span className="text-3xl font-bold text-md-on-surface mt-2">{uniqueSectors}</span>
            </div>
            <div className="flex flex-col justify-between rounded-lg border border-md-outline-variant bg-md-surface p-4 min-w-[130px]">
              <span className="text-xs font-medium text-md-on-surface-variant leading-snug">Geographic Locations</span>
              <span className="text-3xl font-bold text-md-on-surface mt-2">{uniqueGeos}</span>
            </div>

            {/* Summary box */}
            <div className="flex flex-col gap-3 rounded-lg border border-md-outline-variant bg-md-surface p-4 flex-1 min-w-[280px]">
              <span className="text-xs font-bold uppercase tracking-wide text-md-on-surface-variant">Summary</span>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex flex-col">
                  <span className="text-xs text-md-on-surface-variant leading-snug max-w-[110px]">
                    Acts enforceable in next 1 year
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold text-md-on-surface">{enforceableNextYear}</span>
                    <span className="text-sm font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "var(--md-primary-container)", color: "var(--md-on-primary-container)" }}>
                      {nextEnforcementYear}
                    </span>
                  </div>
                </div>
                <div className="w-px self-stretch bg-md-outline-variant" />
                <div className="flex flex-col flex-1 min-w-[160px]">
                  <span className="text-xs text-md-on-surface-variant mb-2">Enforcement date trend</span>
                  <TrendChart data={trendData} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-panel layout ───────────────────────────────────────────────── */}
      <div className="flex gap-4 min-h-[540px]">
        {/* Left panel — regulations accordion */}
        <div className="w-68 flex-shrink-0 rounded-xl border border-md-outline-variant bg-md-surface-container overflow-hidden shadow-sm flex flex-col" style={{ width: "17rem" }}>
          <div className="px-4 py-3 border-b border-md-outline-variant flex-shrink-0">
            <h2 className="text-sm font-bold text-md-on-surface">Regulations</h2>
            {filteredRegs.length !== REGULATIONS.length && (
              <p className="text-xs text-md-on-surface-variant mt-0.5">
                {filteredRegs.length} of {REGULATIONS.length} shown
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredRegs.length === 0 ? (
              <p className="text-xs text-md-on-surface-variant p-4 text-center">
                No regulations match the selected filters.
              </p>
            ) : (
              filteredRegs.map((reg) => {
                const isExpanded = expandedRegIds.has(reg.id)
                return (
                  <div key={reg.id} className="border-b border-md-outline-variant last:border-b-0">
                    {/* Regulation header */}
                    <button
                      onClick={() => toggleRegExpand(reg.id)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-md-surface-container-high transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-md-on-surface truncate">{reg.shortName}</p>
                        <p className="text-xs text-md-on-surface-variant truncate mt-0.5">{reg.articles.length} articles</p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round"
                        className={`text-md-on-surface-variant flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {/* Articles list */}
                    {isExpanded && (
                      <div className="bg-md-surface pb-1">
                        {reg.articles.map((article) => {
                          const isActive = selectedArticleId === article.id
                          return (
                            <button
                              key={article.id}
                              onClick={() => setSelectedArticleId(article.id)}
                              className={`w-full text-left px-4 py-2.5 pl-7 text-xs transition-all flex items-start gap-2 ${
                                isActive
                                  ? "text-md-on-primary-container font-semibold"
                                  : "text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-container"
                              }`}
                              style={isActive ? { backgroundColor: "var(--md-primary-container)" } : {}}
                            >
                              <span
                                className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: isActive
                                    ? "var(--md-on-primary-container)"
                                    : "var(--md-outline-variant)",
                                }}
                              />
                              <span className="leading-snug">{article.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right panel — article detail */}
        <div className="flex-1 rounded-xl border border-md-outline-variant bg-md-surface-container shadow-sm overflow-hidden flex flex-col">
          {selectedArticle ? (
            <>
              {/* Detail header */}
              <div className="px-6 py-4 border-b border-md-outline-variant flex-shrink-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-md-on-surface-variant mb-1">
                      {selectedArticle.regulation.shortName} · {selectedArticle.regulation.name}
                    </p>
                    <h2 className="text-xl font-bold text-md-on-surface">{selectedArticle.article.name}</h2>
                  </div>
                  <EnforceabilityBadge level={selectedArticle.article.enforceability} />
                </div>
              </div>

              {/* Detail body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Applicability + Enforceability */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-md-outline-variant bg-md-surface p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-md-on-surface-variant">Applicability</p>
                    <div>
                      <p className="text-xs text-md-on-surface-variant mb-1.5">Industry Sector</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedArticle.regulation.sectors.map((s) => (
                          <span key={s} className="text-xs font-medium px-2 py-0.5 rounded-full border border-md-outline-variant text-md-on-surface">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-md-on-surface-variant mb-1.5">Geography</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedArticle.regulation.geographies.map((g) => (
                          <span key={g} className="text-xs font-medium px-2 py-0.5 rounded-full border border-md-outline-variant text-md-on-surface">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-md-outline-variant bg-md-surface p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-md-on-surface-variant">Enforceability</p>
                    <EnforceabilityBadge level={selectedArticle.article.enforceability} />
                    <div>
                      <p className="text-xs text-md-on-surface-variant">Enforcement date</p>
                      <p className="text-sm font-bold text-md-on-surface mt-0.5">{selectedArticle.article.enforcementDate}</p>
                    </div>
                  </div>
                </div>

                {/* Key highlights */}
                <div>
                  <h3 className="text-sm font-bold text-md-on-surface mb-3">Key Highlights</h3>
                  <ul className="space-y-2">
                    {selectedArticle.article.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: "var(--md-primary)" }} />
                        <span className="text-sm text-md-on-surface-variant leading-relaxed">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Suggested control activities */}
                <div>
                  <h3 className="text-sm font-bold text-md-on-surface mb-3">Suggested Control Activities</h3>
                  <div className="rounded-lg border border-md-outline-variant overflow-hidden">
                    <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                      <table className="w-full min-w-[480px] text-sm">
                        <thead className="sticky top-0 z-10 border-b border-md-outline-variant"
                          style={{ backgroundColor: "var(--md-surface-container-high)" }}>
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-md-on-surface w-[90px]">Code</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-md-on-surface w-[150px]">Domain</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-md-on-surface">Control Statement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedArticle.article.suggestedControls.map((ctrl, i) => (
                            <tr key={ctrl.code}
                              className={`border-t border-md-outline-variant align-top ${i % 2 === 0 ? "bg-md-surface" : "bg-md-surface-container"}`}>
                              <td className="px-4 py-3 font-mono text-xs font-bold text-md-on-surface whitespace-nowrap">{ctrl.code}</td>
                              <td className="px-4 py-3 text-xs text-md-on-surface-variant whitespace-nowrap">{ctrl.domain}</td>
                              <td className="px-4 py-3 text-xs text-md-on-surface leading-relaxed">{ctrl.statement}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Baseline CTA */}
                <div className="rounded-lg border border-md-outline-variant bg-md-surface p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-bold text-md-on-surface">
                      Baseline master framework with {selectedArticle.article.name.split(" – ")[0]}
                    </p>
                    <p className="text-xs text-md-on-surface-variant mt-0.5">
                      Check for missing controls from this article, or run a full cross-regulation baseline check.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBaselineModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-md-primary-container text-md-on-primary-container hover:bg-md-primary hover:text-md-on-primary transition-colors flex-shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                    Run Baseline Check
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-md-on-surface-variant">Select an article from the list to view details.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Baseline Modal ─────────────────────────────────────────────────── */}
      {showBaselineModal && (
        <BaselineModal
          initialArticleId={selectedArticleId}
          onClose={() => setShowBaselineModal(false)}
        />
      )}
    </div>
  )
}
