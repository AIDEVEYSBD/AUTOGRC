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
          { code: "AI-R2", domain: "Risk Management", statement: "Conduct and document foreseeable misuse analysis for each high-risk AI system, reviewed by a risk committee at least annually." },
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
          "Technical and organisational measures must be implemented to embed data protection principles.",
        ],
        suggestedControls: [
          { code: "GDP-PBD1", domain: "Privacy", statement: "Integrate privacy-by-design reviews into the SDLC as a mandatory gate prior to deployment of any system processing personal data." },
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
          "Controllers must implement appropriate technical and organisational security measures.",
          "Measures must include pseudonymisation and encryption of personal data.",
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
          "DPIAs must assess necessity, proportionality, and mitigation measures for identified risks.",
        ],
        suggestedControls: [
          { code: "GDP-DPIA1", domain: "Privacy", statement: "Establish a DPIA screening process triggered for all new or significantly changed processing activities involving personal data, with documented outcomes." },
          { code: "GDP-DPIA2", domain: "Risk Management", statement: "Maintain a register of completed DPIAs and schedule periodic reviews (at least every three years) to ensure ongoing relevance and effectiveness." },
        ],
      },
    ],
  },
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
          "Covered entities may only use or disclose PHI for treatment, payment, or with patient authorisation.",
          "Minimum necessary standard: only the minimum PHI needed to accomplish the intended purpose may be used.",
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
          "A Security Risk Analysis must be conducted and documented regularly.",
          "Access controls, audit controls, and transmission security must be implemented for all ePHI systems.",
        ],
        suggestedControls: [
          { code: "HIP-SEC1", domain: "Risk Management", statement: "Conduct and document a HIPAA Security Risk Analysis at least annually and after any significant change to ePHI systems, with remediation plans tracked." },
          { code: "HIP-SEC2", domain: "Access Control", statement: "Implement role-based access controls for all ePHI systems, with access reviews performed semi-annually and removal completed within 24 hours of role change." },
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
          "Breaches affecting 500 or more individuals require HHS notification and media disclosure in the affected state.",
          "A breach is presumed unless a risk assessment demonstrates low probability of PHI compromise.",
        ],
        suggestedControls: [
          { code: "HIP-BNR1", domain: "Incident Management", statement: "Establish a HIPAA breach notification procedure including internal escalation timelines, HHS reporting workflows, and template notifications for affected individuals." },
          { code: "HIP-BNR2", domain: "Incident Management", statement: "Maintain a breach log and conduct a risk assessment for every potential PHI exposure event to determine whether breach notification obligations are triggered." },
        ],
      },
    ],
  },
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
          "Essential and important entities must adopt proportionate technical and organisational measures to manage cybersecurity risks.",
          "Required measures include risk analysis, incident handling, business continuity, supply chain security, and cryptography.",
          "Multi-factor authentication must be used where appropriate.",
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
          "Significant incidents must be reported to the national CSIRT without undue delay.",
          "An early warning must be submitted within 24 hours; a full notification within 72 hours.",
          "A final report must follow within one month detailing root cause, impact, and remediation.",
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
          "Certification schemes should align with ENISA and the EU Cybersecurity Act framework.",
        ],
        suggestedControls: [
          { code: "NIS-CERT1", domain: "Supply Chain", statement: "Evaluate ICT products and cloud services against available European cybersecurity certification schemes (EUCS, EUCC) as part of procurement and vendor assessment processes." },
        ],
      },
    ],
  },
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
          "Financial entities must have an internal governance framework for ICT risk management.",
          "Management body bears ultimate responsibility for the ICT risk management framework.",
          "Entities must identify, classify, and document all ICT assets and their interdependencies.",
        ],
        suggestedControls: [
          { code: "DOR-ICT1", domain: "Risk Management", statement: "Establish an ICT risk management framework governing identification, classification, and treatment of ICT risks, with management body sign-off at least annually." },
          { code: "DOR-ICT2", domain: "Asset Management", statement: "Maintain a comprehensive ICT asset register documenting all hardware, software, and service components, including interdependencies and criticality ratings." },
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
          "RTO/RPO must be defined for all critical ICT systems.",
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
          "Major ICT incidents must be reported to competent authorities with initial notification within 4 hours.",
          "A final incident report must be submitted within one month of incident closure.",
        ],
        suggestedControls: [
          { code: "DOR-INC1", domain: "Incident Management", statement: "Implement an ICT incident classification procedure aligned with DORA criteria, enabling consistent determination of major vs. non-major incidents within defined timeframes." },
          { code: "DOR-INC2", domain: "Incident Management", statement: "Establish DORA-compliant major incident reporting workflows with 4-hour initial notification and one-month final report capabilities." },
        ],
      },
      {
        id: "dora-art26",
        name: "Article 26 – Third-Party ICT Risk",
        enforceability: "Enforceable with penalty",
        enforcementDate: "17 Jan 2025",
        enforcementYear: 2025,
        highlights: [
          "Financial entities must maintain a register of all contractual arrangements with third-party ICT providers.",
          "Critical ICT third-party providers are subject to an EU oversight framework.",
          "Exit strategies must be in place for all critical or important ICT third-party arrangements.",
        ],
        suggestedControls: [
          { code: "DOR-TPM1", domain: "Supply Chain", statement: "Maintain a DORA-compliant register of all ICT third-party service arrangements, updated on each new contract or material change, with criticality classifications documented." },
          { code: "DOR-TPM2", domain: "Supply Chain", statement: "Develop and test exit strategies for all critical or important ICT third-party arrangements, ensuring continuity of service in the event of provider failure or termination." },
        ],
      },
    ],
  },
  {
    id: "sox",
    name: "Sarbanes-Oxley Act",
    shortName: "SOX",
    sectors: ["Financial Services"],
    geographies: ["Americas"],
    articles: [
      {
        id: "sox-s302",
        name: "Section 302 – Corporate Responsibility for Financial Reports",
        enforceability: "Enforceable with penalty",
        enforcementDate: "29 Aug 2002",
        enforcementYear: 2002,
        highlights: [
          "CEO and CFO must personally certify the accuracy and completeness of financial reports filed with the SEC.",
          "Executives must disclose any known material weaknesses in internal controls over financial reporting.",
          "False certification carries criminal penalties of up to $5 million and 20 years imprisonment.",
        ],
        suggestedControls: [
          { code: "SOX-302-1", domain: "Governance", statement: "Establish a formal CEO/CFO certification process supported by sub-certification packages from business unit controllers, documenting the evidential basis for each representation." },
          { code: "SOX-302-2", domain: "Risk Management", statement: "Implement a material weakness identification and remediation process with defined escalation timelines and board-level reporting for all identified control deficiencies." },
        ],
      },
      {
        id: "sox-s404",
        name: "Section 404 – Management Assessment of Internal Controls",
        enforceability: "Enforceable with penalty",
        enforcementDate: "15 Jun 2003",
        enforcementYear: 2003,
        highlights: [
          "Management must assess and report on the effectiveness of internal controls over financial reporting (ICFR) annually.",
          "External auditors must attest to management's ICFR assessment for accelerated filers.",
          "Assessments must be based on a recognised control framework, typically COSO.",
        ],
        suggestedControls: [
          { code: "SOX-404-1", domain: "Governance", statement: "Adopt the COSO Internal Control – Integrated Framework as the basis for annual ICFR assessments, with scoping decisions documented and approved by the CFO." },
          { code: "SOX-404-2", domain: "Audit & Compliance", statement: "Maintain a centralised control inventory mapped to financial statement risk areas, with evidence of design and operating effectiveness testing documented and retained annually." },
          { code: "SOX-404-3", domain: "Change Management", statement: "Implement a SOX change management process to evaluate the ICFR impact of significant business, system, and process changes prior to go-live." },
        ],
      },
      {
        id: "sox-s906",
        name: "Section 906 – Criminal Penalties for False Certifications",
        enforceability: "Enforceable with penalty",
        enforcementDate: "30 Jul 2002",
        enforcementYear: 2002,
        highlights: [
          "Wilful certification of a false financial report carries penalties of up to $5 million and 20 years imprisonment.",
          "Knowingly false certifications carry penalties of up to $1 million and 10 years imprisonment.",
          "Applies to all certifying officers regardless of whether they personally prepared the report.",
        ],
        suggestedControls: [
          { code: "SOX-906-1", domain: "Governance", statement: "Implement a sub-certification process requiring business unit controllers to certify financial data accuracy prior to executive-level SOX certifications." },
          { code: "SOX-906-2", domain: "Training & Awareness", statement: "Deliver annual SOX awareness training to all finance, accounting, and IT personnel with ICFR responsibilities, with completion records maintained." },
        ],
      },
    ],
  },
  {
    id: "ccpa",
    name: "California Consumer Privacy Act / CPRA",
    shortName: "CCPA / CPRA",
    sectors: ["All Sectors"],
    geographies: ["Americas"],
    articles: [
      {
        id: "ccpa-rights",
        name: "Consumer Rights – Access, Deletion & Opt-Out",
        enforceability: "Enforceable with penalty",
        enforcementDate: "1 Jan 2020",
        enforcementYear: 2020,
        highlights: [
          "California residents have the right to know what personal information is collected, used, shared, or sold.",
          "Consumers may request deletion of their personal information, subject to limited exceptions.",
          "Businesses must honour opt-out requests from the sale or sharing of personal information within 15 days.",
          "Civil penalties up to $7,500 per intentional violation enforceable by the California Privacy Protection Agency.",
        ],
        suggestedControls: [
          { code: "CCPA-R1", domain: "Privacy", statement: "Implement consumer request intake and fulfilment workflows for access, deletion, correction, and opt-out requests, with response timelines tracked against the 45-day statutory deadline." },
          { code: "CCPA-R2", domain: "Privacy", statement: "Deploy a 'Do Not Sell or Share My Personal Information' mechanism on all consumer-facing digital properties, with opt-out signals honoured within 15 business days." },
        ],
      },
      {
        id: "ccpa-disclosure",
        name: "Transparency & Privacy Notice Requirements",
        enforceability: "Enforceable with penalty",
        enforcementDate: "1 Jan 2020",
        enforcementYear: 2020,
        highlights: [
          "Businesses must disclose categories of personal information collected and purposes at or before the point of collection.",
          "Privacy policies must be updated at least annually and disclose all consumer rights under CCPA/CPRA.",
          "Sensitive personal information (SPI) requires separate notice and opt-out rights under CPRA amendments effective 2023.",
        ],
        suggestedControls: [
          { code: "CCPA-D1", domain: "Privacy", statement: "Maintain a CCPA/CPRA-compliant privacy notice disclosing all categories of personal information collected, purposes of processing, and consumer rights, reviewed and updated at least annually." },
          { code: "CCPA-D2", domain: "Data Governance", statement: "Conduct annual data mapping exercises to identify all personal information flows, third-party sharing arrangements, and sensitive personal information categories subject to CPRA." },
        ],
      },
      {
        id: "ccpa-security",
        name: "Reasonable Security & Private Right of Action",
        enforceability: "Enforceable with penalty",
        enforcementDate: "1 Jan 2020",
        enforcementYear: 2020,
        highlights: [
          "Consumers have a private right of action for data breaches resulting from failure to implement reasonable security.",
          "Statutory damages range from $100 to $750 per consumer per incident, or actual damages if greater.",
          "Businesses must implement and maintain reasonable security procedures appropriate to the nature of personal information held.",
        ],
        suggestedControls: [
          { code: "CCPA-S1", domain: "Cybersecurity", statement: "Implement a minimum baseline of CIS Controls mapped to the personal information categories held, with annual gap assessments documented to evidence reasonable security posture." },
          { code: "CCPA-S2", domain: "Incident Management", statement: "Establish a data breach response plan with CCPA-specific notification procedures, documenting the legal basis for any determination that notification is not required." },
        ],
      },
      {
        id: "ccpa-cpra-2023",
        name: "CPRA Amendments – Sensitive Personal Information & Data Minimisation",
        enforceability: "Enforceable with penalty",
        enforcementDate: "1 Jan 2023",
        enforcementYear: 2023,
        highlights: [
          "CPRA introduces a new category of sensitive personal information (SPI) with heightened protections.",
          "Businesses must limit the collection and use of personal information to what is reasonably necessary for the disclosed purpose.",
          "Consumers may direct businesses to limit the use and disclosure of their sensitive personal information.",
          "New right to correct inaccurate personal information added alongside existing access and deletion rights.",
        ],
        suggestedControls: [
          { code: "CCPA-SP1", domain: "Privacy", statement: "Identify, classify, and inventory all sensitive personal information (SPI) categories collected, with purpose limitation controls preventing use beyond the disclosed processing purpose." },
          { code: "CCPA-SP2", domain: "Privacy", statement: "Implement a correction request workflow enabling consumers to request rectification of inaccurate personal information, with responses within the 45-day statutory window." },
        ],
      },
    ],
  },
  {
    id: "pci-dss",
    name: "Payment Card Industry Data Security Standard v4.0",
    shortName: "PCI DSS v4",
    sectors: ["Financial Services", "Retail"],
    geographies: ["Global"],
    articles: [
      {
        id: "pci-req3",
        name: "Requirement 3 – Protect Stored Account Data",
        enforceability: "Enforceable with penalty",
        enforcementDate: "31 Mar 2024",
        enforcementYear: 2024,
        highlights: [
          "Primary account numbers (PANs) must be rendered unreadable anywhere stored using strong cryptography.",
          "Sensitive authentication data (SAD) must not be stored after authorisation, even if encrypted.",
          "Cryptographic key management procedures must be formally documented and implemented.",
          "PCI DSS v4.0 introduces targeted risk analysis for customised implementation approaches.",
        ],
        suggestedControls: [
          { code: "PCI-D1", domain: "Cryptography", statement: "Implement strong cryptography (AES-256 or equivalent) for all stored PANs, with key management procedures covering generation, distribution, storage, retirement, and destruction." },
          { code: "PCI-D2", domain: "Data Governance", statement: "Run automated data discovery scans quarterly to detect and remediate unprotected PANs stored outside the defined cardholder data environment (CDE)." },
        ],
      },
      {
        id: "pci-req6",
        name: "Requirement 6 – Develop and Maintain Secure Systems and Software",
        enforceability: "Enforceable with penalty",
        enforcementDate: "31 Mar 2024",
        enforcementYear: 2024,
        highlights: [
          "All CDE system components must be protected from known vulnerabilities via a risk-ranked patch management programme.",
          "Bespoke and custom software must follow a secure development lifecycle including code review.",
          "Web-facing applications must be protected by a WAF or undergo regular application security testing.",
        ],
        suggestedControls: [
          { code: "PCI-S1", domain: "Vulnerability Management", statement: "Implement a risk-ranked patch management programme applying critical patches within one month of release for all components within the cardholder data environment." },
          { code: "PCI-S2", domain: "Secure Development", statement: "Integrate SAST and DAST tooling into the CI/CD pipeline for all applications handling cardholder data, with critical and high findings blocking deployment to production." },
          { code: "PCI-S3", domain: "Cybersecurity", statement: "Deploy and configure a WAF for all public-facing web applications in the CDE, with rulesets reviewed and updated after each significant code change or newly disclosed threat." },
        ],
      },
      {
        id: "pci-req8",
        name: "Requirement 8 – Identify Users and Authenticate Access",
        enforceability: "Enforceable with penalty",
        enforcementDate: "31 Mar 2024",
        enforcementYear: 2024,
        highlights: [
          "Multi-factor authentication is required for all access into the CDE, expanding beyond remote access in v4.0.",
          "Shared and generic accounts are prohibited; all users must have unique IDs.",
          "Passwords must meet minimum length and complexity requirements; passphrases are explicitly permitted.",
        ],
        suggestedControls: [
          { code: "PCI-A1", domain: "Access Control", statement: "Enforce multi-factor authentication for all interactive user access into the CDE including console access, with phishing-resistant MFA mandated for privileged and administrative accounts." },
          { code: "PCI-A2", domain: "Access Control", statement: "Implement identity lifecycle management ensuring unique IDs per user, semi-annual access reviews, and immediate revocation within 24 hours of role termination or change." },
        ],
      },
      {
        id: "pci-req11",
        name: "Requirement 11 – Test Security of Systems and Networks Regularly",
        enforceability: "Enforceable with penalty",
        enforcementDate: "31 Mar 2024",
        enforcementYear: 2024,
        highlights: [
          "Internal and external penetration testing of the CDE must be conducted at least annually and after any significant infrastructure or application change.",
          "Intrusion detection and prevention systems must monitor all traffic at the CDE perimeter and within the CDE.",
          "PCI DSS v4.0 introduces a requirement for targeted penetration testing of segmentation controls.",
        ],
        suggestedControls: [
          { code: "PCI-T1", domain: "Cybersecurity", statement: "Conduct annual penetration tests of the CDE perimeter and internal network by a qualified tester, with segmentation validation and remediation of exploitable findings prior to next assessment." },
          { code: "PCI-T2", domain: "Cybersecurity", statement: "Deploy IDS/IPS covering all CDE network boundaries and internal segments, with alert review procedures and tuning reviewed at least every six months." },
        ],
      },
    ],
  },
  {
    id: "mas-trm",
    name: "MAS Technology Risk Management Guidelines",
    shortName: "MAS TRM",
    sectors: ["Financial Services"],
    geographies: ["Asia-Pacific"],
    articles: [
      {
        id: "mas-trm-gov",
        name: "Section 3 – IT Governance",
        enforceability: "Enforceable with penalty",
        enforcementDate: "18 Jan 2021",
        enforcementYear: 2021,
        highlights: [
          "Financial institutions must establish an IT governance framework with clear accountabilities for technology risk.",
          "A Chief Information Officer or equivalent must have sufficient seniority and direct access to the board.",
          "Technology risk appetite must be defined and aligned to the overall enterprise risk management framework.",
        ],
        suggestedControls: [
          { code: "MAS-G1", domain: "Governance", statement: "Establish a technology risk governance framework with defined roles, responsibilities, and escalation paths from operational teams to the board, reviewed and approved annually." },
          { code: "MAS-G2", domain: "Governance", statement: "Define and document a technology risk appetite statement aligned to the institution's enterprise risk framework, with board approval and quarterly monitoring reports to the risk committee." },
        ],
      },
      {
        id: "mas-trm-cyber",
        name: "Section 11 – Cyber Hygiene",
        enforceability: "Enforceable with penalty",
        enforcementDate: "18 Jan 2021",
        enforcementYear: 2021,
        highlights: [
          "Institutions must implement robust controls to mitigate cyber threats including malware, phishing, and ransomware.",
          "Network security controls must include segmentation, continuous monitoring, and perimeter defences.",
          "MAS expects institutions to perform regular adversarial simulation exercises such as TIBER-SG.",
        ],
        suggestedControls: [
          { code: "MAS-C1", domain: "Cybersecurity", statement: "Implement a cyber hygiene programme covering asset patching SLAs, endpoint detection and response (EDR), email security gateways, and privileged access management." },
          { code: "MAS-C2", domain: "Cybersecurity", statement: "Conduct annual adversarial simulation exercises (red team or TIBER-SG equivalent) targeting critical systems, with findings tracked to closure within agreed remediation timelines." },
        ],
      },
      {
        id: "mas-trm-resilience",
        name: "Section 7 – IT Service Continuity",
        enforceability: "Enforceable with penalty",
        enforcementDate: "18 Jan 2021",
        enforcementYear: 2021,
        highlights: [
          "Critical IT systems must have defined RTO/RPO targets with recovery capabilities tested at least annually.",
          "Disaster recovery plans must be tested jointly with IT and business stakeholders to validate end-to-end recoverability.",
          "Outsourced IT services must have equivalent resilience requirements imposed on vendors contractually.",
        ],
        suggestedControls: [
          { code: "MAS-R1", domain: "Business Continuity", statement: "Define RTO/RPO targets for all critical IT systems via business impact analysis, validated through annual DR tests with documented results and lessons learned incorporated." },
          { code: "MAS-R2", domain: "Supply Chain", statement: "Include IT service continuity requirements in all outsourcing contracts for critical functions, with annual assurance reviews confirming vendor resilience capabilities." },
        ],
      },
      {
        id: "mas-trm-data",
        name: "Section 9 – Data & Infrastructure Security",
        enforceability: "Enforceable with penalty",
        enforcementDate: "18 Jan 2021",
        enforcementYear: 2021,
        highlights: [
          "Sensitive data must be identified, classified, and protected using appropriate encryption and access controls.",
          "Network segmentation must isolate systems of differing criticality and restrict lateral movement.",
          "Security monitoring must provide visibility into both perimeter and internal network activity.",
        ],
        suggestedControls: [
          { code: "MAS-D1", domain: "Data Governance", statement: "Implement a data classification scheme with technical controls (encryption, DLP, access restrictions) applied proportionately to each classification tier for all systems holding customer or sensitive data." },
          { code: "MAS-D2", domain: "Cybersecurity", statement: "Deploy network segmentation isolating internet-facing systems, internal systems, and sensitive data environments, with firewall rules reviewed quarterly and anomalous traffic alerts reviewed daily." },
        ],
      },
    ],
  },
  {
    id: "pdpa-sg",
    name: "Personal Data Protection Act (Singapore)",
    shortName: "PDPA (SG)",
    sectors: ["All Sectors"],
    geographies: ["Asia-Pacific"],
    articles: [
      {
        id: "pdpa-sg-consent",
        name: "Part III – Consent Obligation",
        enforceability: "Enforceable with penalty",
        enforcementDate: "2 Jul 2014",
        enforcementYear: 2014,
        highlights: [
          "Organisations must obtain consent before collecting, using, or disclosing personal data.",
          "Withdrawal of consent must be honoured within a reasonable timeframe with consequences communicated upfront.",
          "2021 amendments introduced legitimate interests as an additional legal basis, reducing over-reliance on consent.",
        ],
        suggestedControls: [
          { code: "PDPA-C1", domain: "Privacy", statement: "Implement consent management procedures covering collection, recording, and withdrawal of consent, with withdrawal requests processed within 10 business days." },
          { code: "PDPA-C2", domain: "Data Governance", statement: "Document the legal basis for each personal data processing activity in a processing register, distinguishing consent, legitimate interests, contractual necessity, and legal obligation." },
        ],
      },
      {
        id: "pdpa-sg-protection",
        name: "Part IV – Protection Obligation",
        enforceability: "Enforceable with penalty",
        enforcementDate: "2 Jul 2014",
        enforcementYear: 2014,
        highlights: [
          "Organisations must make reasonable security arrangements to protect personal data from unauthorised access, collection, use, or disclosure.",
          "The PDPC expects organisations to implement a baseline of both technical and organisational security measures.",
          "Financial penalties under 2021 amendments can reach SGD 1 million or 10% of annual Singapore turnover for egregious breaches.",
        ],
        suggestedControls: [
          { code: "PDPA-P1", domain: "Cybersecurity", statement: "Implement technical safeguards for personal data including encryption at rest and in transit, role-based access controls, and regular vulnerability assessments of systems holding personal data." },
          { code: "PDPA-P2", domain: "Governance", statement: "Appoint a Data Protection Officer (DPO) with sufficient authority and resources, publish the DPO contact details on the organisation's website, and conduct annual PDPA compliance reviews." },
        ],
      },
      {
        id: "pdpa-sg-breach",
        name: "Part VIA – Mandatory Data Breach Notification",
        enforceability: "Enforceable with penalty",
        enforcementDate: "1 Oct 2021",
        enforcementYear: 2021,
        highlights: [
          "Organisations must notify the PDPC within 3 calendar days of assessing that a breach is notifiable.",
          "Affected individuals must be notified where the breach is likely to result in significant harm.",
          "Organisations have up to 30 calendar days to assess whether a breach triggers notification obligations.",
        ],
        suggestedControls: [
          { code: "PDPA-B1", domain: "Incident Management", statement: "Establish a PDPA breach assessment and notification procedure with 30-day assessment and 3-day PDPC notification timelines, including significance assessment decision trees." },
          { code: "PDPA-B2", domain: "Incident Management", statement: "Implement logging and monitoring controls to detect personal data breach indicators across all systems holding personal data, with automated alerting to the DPO upon detection." },
        ],
      },
    ],
  },
  {
    id: "eu-cra",
    name: "EU Cyber Resilience Act",
    shortName: "EU CRA",
    sectors: ["IT Services", "Manufacturing"],
    geographies: ["Europe"],
    articles: [
      {
        id: "cra-art13",
        name: "Article 13 – Obligations of Manufacturers",
        enforceability: "Enforceable with penalty",
        enforcementDate: "11 Dec 2027",
        enforcementYear: 2027,
        highlights: [
          "Manufacturers must ensure products with digital elements are designed and developed with security by default.",
          "A cybersecurity risk assessment must be conducted and documented before placing a product on the EU market.",
          "Products must bear CE marking to demonstrate conformity with CRA essential cybersecurity requirements.",
          "Fines up to €15 million or 2.5% of global annual turnover for non-compliance with essential requirements.",
        ],
        suggestedControls: [
          { code: "CRA-M1", domain: "Secure Development", statement: "Integrate a product cybersecurity risk assessment into the product development lifecycle, documenting threat modelling outcomes, residual risks, and applied mitigations before market release." },
          { code: "CRA-M2", domain: "Secure Development", statement: "Enforce secure-by-default configurations for all products with digital elements, minimising attack surface and disabling unnecessary features or services at point of supply." },
          { code: "CRA-M3", domain: "Compliance", statement: "Establish and maintain a Software Bill of Materials (SBOM) for all products with digital elements, covering third-party and open-source components with active vulnerability tracking." },
        ],
      },
      {
        id: "cra-art14",
        name: "Article 14 – Vulnerability Handling & Reporting to ENISA",
        enforceability: "Enforceable with penalty",
        enforcementDate: "11 Sep 2026",
        enforcementYear: 2026,
        highlights: [
          "Manufacturers must report actively exploited vulnerabilities in their products to ENISA within 24 hours of awareness.",
          "A more detailed vulnerability notification must be submitted within 72 hours of initial awareness.",
          "Manufacturers must handle vulnerabilities in a coordinated manner and provide mechanisms for researchers to disclose findings.",
        ],
        suggestedControls: [
          { code: "CRA-V1", domain: "Vulnerability Management", statement: "Implement a vulnerability disclosure policy (VDP) with a public contact point for researchers and internal 24/72-hour ENISA reporting workflows with pre-approved notification templates." },
          { code: "CRA-V2", domain: "Vulnerability Management", statement: "Deploy automated monitoring for newly disclosed CVEs affecting product components, with triage SLAs and patch availability timelines aligned to CVSS severity classifications." },
        ],
      },
      {
        id: "cra-art19",
        name: "Article 19 – Security Support Period",
        enforceability: "Enforceable with penalty",
        enforcementDate: "11 Dec 2027",
        enforcementYear: 2027,
        highlights: [
          "Manufacturers must provide security updates for a product's expected lifetime or at least five years from market placement, whichever is longer.",
          "End-of-support dates must be clearly communicated to users prior to purchase.",
          "Security updates must be made available free of charge and distributed without undue delay.",
        ],
        suggestedControls: [
          { code: "CRA-S1", domain: "Vulnerability Management", statement: "Define and publish a security support period for each product at point of sale, with patch release processes capable of delivering free security updates throughout the declared support lifecycle." },
          { code: "CRA-S2", domain: "Governance", statement: "Implement a product end-of-life policy with advance customer notice of support termination dates, accompanied by documented migration options and transition guidance." },
        ],
      },
    ],
  },
  {
    id: "apra-cps234",
    name: "APRA Prudential Standard CPS 234",
    shortName: "APRA CPS 234",
    sectors: ["Financial Services", "Insurance"],
    geographies: ["Asia-Pacific"],
    articles: [
      {
        id: "cps234-roles",
        name: "Paragraphs 15–17 – Roles and Responsibilities",
        enforceability: "Enforceable with penalty",
        enforcementDate: "1 Jul 2019",
        enforcementYear: 2019,
        highlights: [
          "Boards of APRA-regulated entities bear ultimate responsibility for information security capability.",
          "Management must clearly define information security responsibilities across all staff and roles.",
          "Third parties managing APRA-regulated entity assets must maintain information security capabilities commensurate with associated risk.",
        ],
        suggestedControls: [
          { code: "CPS-G1", domain: "Governance", statement: "Document and obtain board approval for information security roles and responsibilities, with annual information security reporting to the board including capability assessment outcomes." },
          { code: "CPS-G2", domain: "Supply Chain", statement: "Assess information security capabilities of all third parties managing regulated entity assets, with contractual obligations and annual assurance reviews proportionate to the risk involved." },
        ],
      },
      {
        id: "cps234-capability",
        name: "Paragraphs 18–23 – Information Security Capability",
        enforceability: "Enforceable with penalty",
        enforcementDate: "1 Jul 2019",
        enforcementYear: 2019,
        highlights: [
          "Entities must maintain an information security capability commensurate with the size and extent of threats to their information assets.",
          "An information security capability assessment must be conducted and documented at least annually.",
          "Controls must be implemented to protect information assets classified according to criticality and sensitivity.",
        ],
        suggestedControls: [
          { code: "CPS-C1", domain: "Risk Management", statement: "Conduct and document an annual information security capability assessment against a recognised framework (ISO 27001, NIST CSF), with identified gaps tracked to remediation." },
          { code: "CPS-C2", domain: "Data Governance", statement: "Implement an information asset classification scheme with technical and organisational controls mapped to each classification tier, reviewed annually for completeness." },
        ],
      },
      {
        id: "cps234-testing",
        name: "Paragraphs 27–30 – Testing Control Effectiveness",
        enforceability: "Enforceable with penalty",
        enforcementDate: "1 Jul 2019",
        enforcementYear: 2019,
        highlights: [
          "Entities must test controls protecting information assets through a systematic, risk-based testing programme.",
          "Testing must be conducted by appropriately skilled and independent personnel.",
          "Results must be reported to the board or a board-level risk or audit committee.",
        ],
        suggestedControls: [
          { code: "CPS-T1", domain: "Audit & Compliance", statement: "Implement an annual information security control testing programme including penetration testing, vulnerability assessments, and control design reviews with results reported to the board." },
          { code: "CPS-T2", domain: "Audit & Compliance", statement: "Ensure information security testing is performed by parties independent of those responsible for implementing the controls, with findings validated through internal or external audit." },
        ],
      },
    ],
  },
  {
    id: "nist-csf",
    name: "NIST Cybersecurity Framework 2.0",
    shortName: "NIST CSF 2.0",
    sectors: ["All Sectors"],
    geographies: ["Americas"],
    articles: [
      {
        id: "nist-govern",
        name: "Govern Function – Organisational Context & Risk Strategy",
        enforceability: "Guidance",
        enforcementDate: "26 Feb 2024",
        enforcementYear: 2024,
        highlights: [
          "New in CSF 2.0: the Govern function establishes organisational context, risk strategy, and cybersecurity oversight as a first-class pillar.",
          "Organisations must define and communicate cybersecurity policy, roles, and responsibilities.",
          "Supply chain cybersecurity risk management is explicitly embedded within the Govern function.",
        ],
        suggestedControls: [
          { code: "NIST-GV1", domain: "Governance", statement: "Develop and communicate a cybersecurity policy establishing the organisation's risk tolerance, roles, responsibilities, and accountability mechanisms aligned to NIST CSF 2.0 Govern function outcomes." },
          { code: "NIST-GV2", domain: "Supply Chain", statement: "Implement a cybersecurity supply chain risk management programme identifying critical suppliers, assessing their security practices, and incorporating security requirements in procurement contracts." },
        ],
      },
      {
        id: "nist-identify",
        name: "Identify Function – Asset & Risk Management",
        enforceability: "Guidance",
        enforcementDate: "26 Feb 2024",
        enforcementYear: 2024,
        highlights: [
          "Organisations must maintain current inventories of hardware, software, and data assets to understand cybersecurity risk exposure.",
          "Vulnerabilities in assets must be identified and threat intelligence integrated into risk management decisions.",
          "Business environment context is essential to prioritise cybersecurity investments appropriately.",
        ],
        suggestedControls: [
          { code: "NIST-ID1", domain: "Asset Management", statement: "Maintain a current inventory of all hardware, software, and data assets with criticality ratings reviewed annually and updated on any material change to the environment." },
          { code: "NIST-ID2", domain: "Risk Management", statement: "Conduct annual cybersecurity risk assessments using a documented methodology, with risk treatment decisions reviewed by leadership and remediation actions tracked to closure." },
        ],
      },
      {
        id: "nist-protect",
        name: "Protect Function – Identity, Access & Awareness",
        enforceability: "Guidance",
        enforcementDate: "26 Feb 2024",
        enforcementYear: 2024,
        highlights: [
          "Organisations must implement identity management and access controls to limit exposure to cybersecurity risks.",
          "Security awareness and training programmes must be in place for all personnel.",
          "Data security practices must protect the confidentiality, integrity, and availability of information assets.",
        ],
        suggestedControls: [
          { code: "NIST-PR1", domain: "Access Control", statement: "Implement least-privilege access controls with regular access reviews, MFA for privileged and remote access, and an identity lifecycle process covering onboarding and offboarding." },
          { code: "NIST-PR2", domain: "Training & Awareness", statement: "Deliver annual cybersecurity awareness training to all staff with role-specific training for technical and privileged users, tracking completion rates and testing awareness effectiveness." },
        ],
      },
      {
        id: "nist-respond-recover",
        name: "Respond & Recover Functions – Incident Management",
        enforceability: "Guidance",
        enforcementDate: "26 Feb 2024",
        enforcementYear: 2024,
        highlights: [
          "Organisations must have documented response plans for cybersecurity incidents, including communication and coordination procedures.",
          "Recovery planning must cover restoration of capabilities and services affected by cybersecurity incidents.",
          "Lessons learned from incidents and exercises must be incorporated into updated plans.",
        ],
        suggestedControls: [
          { code: "NIST-RS1", domain: "Incident Management", statement: "Develop, maintain, and test an incident response plan covering detection, containment, eradication, recovery, and post-incident review, exercised at least annually through tabletop or simulation." },
          { code: "NIST-RC1", domain: "Business Continuity", statement: "Develop recovery plans for critical systems with recovery objectives validated through annual testing, incorporating lessons learned from exercises and real incidents." },
        ],
      },
    ],
  },
  {
    id: "hipaa-hitech",
    name: "HITECH Act – Health Information Technology",
    shortName: "HITECH",
    sectors: ["Healthcare"],
    geographies: ["Americas"],
    articles: [
      {
        id: "hitech-breach",
        name: "Section 13402 – Notification in Case of Breach",
        enforceability: "Enforceable with penalty",
        enforcementDate: "23 Sep 2009",
        enforcementYear: 2009,
        highlights: [
          "Business associates are directly liable for HIPAA Security Rule compliance and breach notification obligations.",
          "Covered entities must notify HHS and affected individuals within 60 days of discovering an unsecured PHI breach.",
          "Breaches affecting 500+ individuals in a state require contemporaneous media notice in that state.",
          "Wilful neglect carries minimum civil penalties of $10,000 per violation.",
        ],
        suggestedControls: [
          { code: "HIT-BN1", domain: "Incident Management", statement: "Extend breach notification procedures to all business associates via contractual BAA obligations, with annual confirmation of their notification capability and contact details." },
          { code: "HIT-BN2", domain: "Incident Management", statement: "Implement a breach log capturing all potential PHI exposures with documented risk assessments to determine notification obligations, retained for six years." },
        ],
      },
      {
        id: "hitech-enforcement",
        name: "Section 13410 – Strengthened Enforcement",
        enforceability: "Enforceable with penalty",
        enforcementDate: "23 Sep 2009",
        enforcementYear: 2009,
        highlights: [
          "OCR may impose civil monetary penalties of $100 to $50,000 per violation, capped at $1.9 million per violation category per year.",
          "State Attorneys General may bring civil actions on behalf of state residents for HIPAA violations.",
          "A percentage of civil penalties collected must be distributed to harmed individuals.",
        ],
        suggestedControls: [
          { code: "HIT-E1", domain: "Governance", statement: "Establish a HIPAA/HITECH compliance programme with designated Privacy and Security Officers, annual risk analyses, and a corrective action plan process for identified gaps." },
          { code: "HIT-E2", domain: "Audit & Compliance", statement: "Conduct annual HIPAA compliance audits covering Privacy Rule, Security Rule, and Breach Notification Rule requirements, with findings reported to senior leadership." },
        ],
      },
      {
        id: "hitech-meaningful-use",
        name: "Section 13001 – Adoption of Certified Health IT",
        enforceability: "Enforceable without penalty",
        enforcementDate: "1 Jan 2011",
        enforcementYear: 2011,
        highlights: [
          "Healthcare providers and hospitals are incentivised to adopt certified electronic health record (EHR) technology.",
          "Certified EHR technology must meet security and interoperability standards defined by ONC.",
          "Adoption enables access to Medicare and Medicaid incentive payments under meaningful use criteria.",
        ],
        suggestedControls: [
          { code: "HIT-MU1", domain: "Data Governance", statement: "Ensure all deployed EHR systems hold current ONC certification and are configured to meet meaningful use security requirements, with certification status reviewed annually." },
          { code: "HIT-MU2", domain: "Secure Development", statement: "Apply ONC security requirements to any custom EHR integrations or extensions, with third-party security assessments prior to connecting to certified EHR systems." },
        ],
      },
    ],
  },
  {
    id: "csrd",
    name: "EU Corporate Sustainability Reporting Directive",
    shortName: "CSRD",
    sectors: ["All Sectors"],
    geographies: ["Europe"],
    articles: [
      {
        id: "csrd-art19a",
        name: "Article 19a – Sustainability Reporting Obligations",
        enforceability: "Enforceable with penalty",
        enforcementDate: "1 Jan 2024",
        enforcementYear: 2024,
        highlights: [
          "Large EU companies must report sustainability information covering environmental, social, and governance (ESG) matters.",
          "Reporting must follow the European Sustainability Reporting Standards (ESRS) adopted by the European Commission.",
          "Sustainability statements must be included in the management report and subject to limited assurance.",
          "Phased rollout: large PIEs from FY2024, other large companies from FY2025, listed SMEs from FY2026.",
        ],
        suggestedControls: [
          { code: "CSRD-R1", domain: "Governance", statement: "Establish a sustainability reporting programme aligned to ESRS, with defined data collection processes, ownership, and an internal review and assurance workflow ahead of statutory deadlines." },
          { code: "CSRD-R2", domain: "Governance", statement: "Appoint a Chief Sustainability Officer or equivalent with board reporting access, supported by cross-functional working groups covering environmental, social, and governance data domains." },
        ],
      },
      {
        id: "csrd-double-materiality",
        name: "Double Materiality Assessment",
        enforceability: "Enforceable with penalty",
        enforcementDate: "1 Jan 2024",
        enforcementYear: 2024,
        highlights: [
          "Companies must perform a double materiality assessment identifying sustainability topics material from both impact and financial perspectives.",
          "The assessment must consider impacts, risks, and opportunities across the value chain.",
          "Methodology and outcomes of the materiality assessment must be disclosed.",
        ],
        suggestedControls: [
          { code: "CSRD-DM1", domain: "Risk Management", statement: "Conduct and document an annual double materiality assessment covering impact materiality and financial materiality perspectives across the full value chain, with stakeholder input incorporated." },
          { code: "CSRD-DM2", domain: "Data Governance", statement: "Implement data collection and validation processes for all material ESRS disclosure requirements, with defined data owners, quality controls, and audit trail documentation." },
        ],
      },
      {
        id: "csrd-digital",
        name: "Digital Tagging & Machine-Readable Reporting",
        enforceability: "Enforceable with penalty",
        enforcementDate: "1 Jan 2026",
        enforcementYear: 2026,
        highlights: [
          "Sustainability statements must be prepared in a machine-readable format using XHTML with inline XBRL tagging.",
          "Digital tagging must follow the ESRS XBRL taxonomy published by EFRAG.",
          "Machine-readable reports must be submitted to the European Single Access Point (ESAP).",
        ],
        suggestedControls: [
          { code: "CSRD-DT1", domain: "Compliance", statement: "Implement XBRL tagging capabilities for sustainability disclosures aligned to the ESRS taxonomy, with quality assurance checks validating tag accuracy prior to submission." },
          { code: "CSRD-DT2", domain: "Governance", statement: "Establish a digital reporting workflow integrating sustainability data collection, XBRL tagging, and ESAP submission with defined ownership and pre-submission review gates." },
        ],
      },
    ],
  },
]

// ─── Derived ──────────────────────────────────────────────────────────────────

const ALL_SECTORS = Array.from(
  new Set(REGULATIONS.flatMap((r) => r.sectors))
).sort((a, b) => (a === "All Sectors" ? -1 : b === "All Sectors" ? 1 : a.localeCompare(b)))

const ALL_GEOS = Array.from(new Set(REGULATIONS.flatMap((r) => r.geographies))).sort()

const ALL_ARTICLES = REGULATIONS.flatMap((r) => r.articles)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function enforceabilityStyle(level: Enforceability) {
  if (level === "Enforceable with penalty") return { bg: "bg-[#e41f13]/10", text: "text-[#e41f13]" }
  if (level === "Enforceable without penalty") return { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]" }
  return { bg: "bg-[#eef2ff]", text: "text-[#4f46e5]" }
}

function EnforceabilityBadge({ level }: { level: Enforceability }) {
  const { bg, text } = enforceabilityStyle(level)
  return (
    <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${bg} ${text}`}>
      {level}
    </span>
  )
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function TimelineChart({ data }: { data: { year: number; count: number }[] }) {
  const currentYear = new Date().getFullYear()

  return (
    <div className="relative flex justify-between items-end" style={{ paddingBottom: "14px" }}>
      {/* Horizontal line at the bottom */}
      <div
        className="absolute left-0 right-0 h-px"
        style={{ bottom: "5px", backgroundColor: "var(--md-outline-variant)" }}
      />

      {data.map((d) => {
        const isPast = d.year < currentYear
        const isCurrent = d.year === currentYear
        const isUpcoming = d.year > currentYear

        const boxBg = isCurrent
          ? "var(--md-primary)"
          : isUpcoming
          ? "var(--md-primary-container)"
          : "var(--md-surface-container-high)"
        const boxColor = isCurrent
          ? "var(--md-on-primary)"
          : isUpcoming
          ? "var(--md-on-primary-container)"
          : "var(--md-on-surface-variant)"
        const dotBg = isCurrent
          ? "var(--md-primary)"
          : isUpcoming
          ? "var(--md-primary-container)"
          : "var(--md-outline-variant)"

        return (
          <div key={d.year} className="relative z-10 flex flex-col items-center">
            {/* Box */}
            <div
              className="rounded border px-2 py-1 text-center"
              style={{
                backgroundColor: boxBg,
                borderColor: isPast ? "var(--md-outline-variant)" : boxBg,
                color: boxColor,
                minWidth: "44px",
              }}
            >
              <div className="text-sm font-bold leading-none">{d.count}</div>
              <div className="text-[10px] font-medium mt-0.5 opacity-80">{d.year}</div>
            </div>

            {/* Connector */}
            <div
              className="w-px h-2"
              style={{ backgroundColor: isCurrent ? "var(--md-primary)" : "var(--md-outline-variant)" }}
            />

            {/* Dot on the line */}
            <div
              className="w-2.5 h-2.5 rounded-full border-2"
              style={{
                backgroundColor: dotBg,
                borderColor: isPast ? "var(--md-outline-variant)" : dotBg,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── Baseline Modal (scoped to active regulation) ─────────────────────────────

function BaselineModal({ regulation, onClose }: { regulation: RegulationEntry; onClose: () => void }) {
  const allCodes = regulation.articles.flatMap((a) => a.suggestedControls.map((c) => c.code))
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(allCodes.map((c) => [c, true]))
  )
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(regulation.articles.map((a) => a.id)))
  const [done, setDone] = useState(false)

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleArticleAll = (article: Article, val: boolean) =>
    setChecked((prev) => ({
      ...prev,
      ...Object.fromEntries(article.suggestedControls.map((c) => [c.code, val])),
    }))

  const selectedCount = Object.values(checked).filter(Boolean).length
  const totalCount = allCodes.length

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-md-surface-container w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-md-outline-variant flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "var(--md-primary-container)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--md-on-primary-container)" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-md-on-surface">Baseline Master Framework</h3>
              <p className="text-xs text-md-on-surface-variant">
                Framework Mapper detected the following controls missing from your master framework
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-md-on-surface-variant hover:text-md-on-surface transition-colors ml-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Regulation label */}
        {!done && (
          <div className="px-5 py-2.5 border-b border-md-outline-variant flex-shrink-0 flex items-center justify-between"
            style={{ backgroundColor: "var(--md-surface-container-high)" }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-md-on-surface">{regulation.shortName}</span>
              <span className="text-xs text-md-on-surface-variant">— {regulation.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-md-on-surface-variant">{selectedCount}/{totalCount} selected</span>
              <button onClick={() => setChecked(Object.fromEntries(allCodes.map((c) => [c, true])))}
                className="text-xs font-bold text-md-on-surface-variant hover:text-md-on-surface underline underline-offset-2 transition-colors">All</button>
              <button onClick={() => setChecked(Object.fromEntries(allCodes.map((c) => [c, false])))}
                className="text-xs font-bold text-md-on-surface-variant hover:text-md-on-surface underline underline-offset-2 transition-colors">None</button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {done ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3 px-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e8f5e9" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00a758" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-md-on-surface">Controls queued for addition</p>
                <p className="text-xs text-md-on-surface-variant mt-1">
                  {selectedCount} control{selectedCount !== 1 ? "s" : ""} from <strong>{regulation.shortName}</strong> have been queued for addition to your master framework.
                </p>
              </div>
              <button onClick={onClose}
                className="mt-1 px-5 py-2 text-sm font-bold bg-md-primary-container text-md-on-primary-container rounded-lg hover:bg-md-primary hover:text-md-on-primary transition-colors">
                Done
              </button>
            </div>
          ) : (
            <div className="divide-y divide-md-outline-variant">
              {regulation.articles.map((article) => {
                const isExpanded = expandedIds.has(article.id)
                const artChecked = article.suggestedControls.filter((c) => checked[c.code]).length
                const artAll = artChecked === article.suggestedControls.length
                const artIndeterminate = artChecked > 0 && !artAll

                return (
                  <div key={article.id}>
                    {/* Article header */}
                    <div className="flex items-center gap-3 px-5 py-2.5"
                      style={{ backgroundColor: "var(--md-surface-container)" }}>
                      <input type="checkbox" className="w-3.5 h-3.5 flex-shrink-0 accent-[var(--md-primary)]"
                        checked={artAll}
                        ref={(el) => { if (el) el.indeterminate = artIndeterminate }}
                        onChange={(e) => toggleArticleAll(article, e.target.checked)}
                        onClick={(e) => e.stopPropagation()} />
                      <button onClick={() => toggleExpand(article.id)}
                        className="flex-1 flex items-center justify-between text-left gap-2">
                        <span className="text-xs font-bold text-md-on-surface">{article.name}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-md-on-surface-variant">{artChecked}/{article.suggestedControls.length}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                            className={`text-md-on-surface-variant transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </button>
                    </div>

                    {/* Controls */}
                    {isExpanded && (
                      <div className="pb-1 bg-md-surface">
                        {article.suggestedControls.map((ctrl) => (
                          <label key={ctrl.code}
                            className={`flex items-start gap-3 px-5 py-2 pl-10 cursor-pointer transition-colors ${
                              checked[ctrl.code] ? "bg-md-primary-container/15" : "hover:bg-md-surface-container"
                            }`}>
                            <input type="checkbox" className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 accent-[var(--md-primary)]"
                              checked={!!checked[ctrl.code]}
                              onChange={(e) => setChecked((p) => ({ ...p, [ctrl.code]: e.target.checked }))} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-md-on-surface font-mono">{ctrl.code}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded text-md-on-surface-variant"
                                  style={{ backgroundColor: "var(--md-surface-container-high)" }}>{ctrl.domain}</span>
                              </div>
                              <p className="text-xs text-md-on-surface-variant mt-0.5 leading-relaxed">{ctrl.statement}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-md-outline-variant flex-shrink-0">
            <span className="text-xs text-md-on-surface-variant">{selectedCount} control{selectedCount !== 1 ? "s" : ""} selected</span>
            <div className="flex gap-2">
              <button onClick={onClose}
                className="px-3 py-1.5 text-xs font-bold border border-md-outline-variant text-md-on-surface rounded-lg hover:bg-md-surface-container-high transition-colors">
                Cancel
              </button>
              <button onClick={() => setDone(true)} disabled={selectedCount === 0}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  selectedCount === 0
                    ? "bg-md-outline-variant text-md-on-surface-variant cursor-not-allowed"
                    : "bg-md-primary-container text-md-on-primary-container hover:bg-md-primary hover:text-md-on-primary"
                }`}>
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
  const [selectedRegId, setSelectedRegId] = useState<string>(REGULATIONS[0].id)
  const [expandedArticleIds, setExpandedArticleIds] = useState<Set<string>>(new Set())
  const [showBaselineModal, setShowBaselineModal] = useState(false)

  const filteredRegs = useMemo(() => {
    return REGULATIONS.filter((r) => {
      const sectorOk = selectedSector === "All" || r.sectors.includes(selectedSector) || r.sectors.includes("All Sectors")
      const geoOk = selectedGeo === "All" || r.geographies.includes(selectedGeo)
      return sectorOk && geoOk
    })
  }, [selectedSector, selectedGeo])

  const selectedReg = useMemo(
    () => filteredRegs.find((r) => r.id === selectedRegId) ?? filteredRegs[0] ?? null,
    [filteredRegs, selectedRegId]
  )

  const toggleArticle = (id: string) =>
    setExpandedArticleIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  // KPI
  const now = new Date()
  const oneYearLater = new Date(now); oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
  const MONTHS: Record<string, number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 }

  const filteredArticles = useMemo(
    () => filteredRegs.flatMap((r) => r.articles),
    [filteredRegs]
  )

  const enforceableNextYear = useMemo(() => {
    return filteredArticles.filter((a) => {
      const p = a.enforcementDate.split(" ")
      const d = new Date(parseInt(p[2]), MONTHS[p[1]] ?? 0, parseInt(p[0]))
      return d >= now && d <= oneYearLater
    }).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredArticles])

  const upcomingYears = filteredArticles.filter((a) => a.enforcementYear >= now.getFullYear()).map((a) => a.enforcementYear)
  const nextYear = upcomingYears.length ? Math.min(...upcomingYears) : now.getFullYear()

  const trendData = useMemo(() => {
    const m: Record<number, number> = {}
    filteredArticles.forEach((a) => { m[a.enforcementYear] = (m[a.enforcementYear] ?? 0) + 1 })
    return Object.entries(m).map(([y, c]) => ({ year: +y, count: c })).sort((a, b) => a.year - b.year)
  }, [filteredArticles])

  const uniqueSectors = useMemo(
    () => new Set(filteredRegs.flatMap((r) => r.sectors.filter((s) => s !== "All Sectors"))).size,
    [filteredRegs]
  )
  const uniqueGeos = useMemo(
    () => new Set(filteredRegs.flatMap((r) => r.geographies)).size,
    [filteredRegs]
  )

  return (
    <div className="flex flex-col h-full space-y-4 p-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-md-on-surface">Framework Workbench</h1>
        <p className="mt-1 text-sm text-md-on-surface-variant max-w-3xl">
          A curated regulatory intelligence board presenting regulations from across global compliance domains —
          AI governance, data privacy, cybersecurity, financial resilience, and healthcare. Explore enforceability
          timelines, assess sector and geographic applicability, and baseline your master framework against emerging regulatory requirements.
        </p>
      </div>

      {/* ── Filters + KPI Row ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-md-outline-variant bg-md-surface-container p-4 shadow-sm flex-shrink-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-md-on-surface-variant">Sector</label>
              <select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)}
                className="border border-md-outline-variant rounded-lg px-3 py-1.5 text-sm bg-md-surface text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary-container min-w-[160px]">
                <option value="All">All Sectors</option>
                {ALL_SECTORS.filter((s) => s !== "All Sectors").map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wide text-md-on-surface-variant">Geography</label>
              <select value={selectedGeo} onChange={(e) => setSelectedGeo(e.target.value)}
                className="border border-md-outline-variant rounded-lg px-3 py-1.5 text-sm bg-md-surface text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary-container min-w-[160px]">
                <option value="All">All Geographies</option>
                {ALL_GEOS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="hidden lg:block w-px self-stretch bg-md-outline-variant" />

          {/* KPI cards */}
          <div className="flex flex-wrap gap-3 flex-1">
            {[
              { label: "Regulations", value: filteredRegs.length },
              { label: "Acts / Articles", value: filteredArticles.length },
              { label: "Sectors Covered", value: uniqueSectors },
              { label: "Geographies", value: uniqueGeos },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col justify-between rounded-lg border border-md-outline-variant bg-md-surface px-4 py-3 min-w-[110px]">
                <span className="text-xs font-medium text-md-on-surface-variant leading-snug">{label}</span>
                <span className="text-2xl font-bold text-md-on-surface mt-1">{value}</span>
              </div>
            ))}

            {/* Summary + Timeline */}
            <div className="flex flex-col gap-2 rounded-lg border border-md-outline-variant bg-md-surface px-4 py-3 flex-1 min-w-[280px]">
              <span className="text-xs font-bold uppercase tracking-wide text-md-on-surface-variant">Enforcement Timeline</span>
              <div className="flex items-start gap-4">
                <div className="flex flex-col flex-shrink-0">
                  <span className="text-xs text-md-on-surface-variant leading-snug">Enforceable next 1 yr</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-bold text-md-on-surface">{enforceableNextYear}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "var(--md-primary-container)", color: "var(--md-on-primary-container)" }}>
                      {nextYear}
                    </span>
                  </div>
                </div>
                <div className="w-px self-stretch bg-md-outline-variant flex-shrink-0" />
                <div className="flex-1 min-w-[200px]">
                  <TimelineChart data={trendData} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-panel layout ───────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left panel */}
        <div className="w-52 flex-shrink-0 rounded-xl border border-md-outline-variant bg-md-surface-container overflow-hidden shadow-sm flex flex-col">
          <div className="px-3 py-2.5 border-b border-md-outline-variant flex-shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-wide text-md-on-surface-variant">Regulations</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredRegs.length === 0 ? (
              <p className="text-xs text-md-on-surface-variant p-3 text-center">No matches.</p>
            ) : (
              filteredRegs.map((reg) => {
                const isActive = selectedReg?.id === reg.id
                return (
                  <button key={reg.id}
                    onClick={() => { setSelectedRegId(reg.id); setExpandedArticleIds(new Set()) }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${isActive ? "text-md-on-primary-container" : "text-md-on-surface hover:bg-md-surface-container-high"}`}
                    style={isActive ? { backgroundColor: "var(--md-primary-container)" } : {}}>
                    <p className="text-sm font-bold leading-tight">{reg.shortName}</p>
                    <p className={`text-xs mt-0.5 ${isActive ? "opacity-70" : "text-md-on-surface-variant"}`}>
                      {reg.articles.length} articles
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 rounded-xl border border-md-outline-variant bg-md-surface-container shadow-sm overflow-hidden flex flex-col min-h-0">
          {selectedReg ? (
            <>
              {/* Regulation header */}
              <div className="px-5 py-3 border-b border-md-outline-variant flex-shrink-0">
                <h2 className="text-base font-bold text-md-on-surface">{selectedReg.name}</h2>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {selectedReg.geographies.map((g) => (
                    <span key={g} className="text-xs font-medium px-2 py-0.5 rounded-full border border-md-outline-variant text-md-on-surface-variant">{g}</span>
                  ))}
                  {selectedReg.sectors.slice(0, 4).map((s) => (
                    <span key={s} className="text-xs font-medium px-2 py-0.5 rounded-full border border-md-outline-variant text-md-on-surface-variant">{s}</span>
                  ))}
                  {selectedReg.sectors.length > 4 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-md-outline-variant text-md-on-surface-variant">+{selectedReg.sectors.length - 4}</span>
                  )}
                </div>
              </div>

              {/* Articles accordion */}
              <div className="flex-1 overflow-y-auto divide-y divide-md-outline-variant">
                {selectedReg.articles.map((article) => {
                  const isExpanded = expandedArticleIds.has(article.id)
                  const { bg, text } = enforceabilityStyle(article.enforceability)

                  return (
                    <div key={article.id}>
                      {/* Article row */}
                      <button
                        onClick={() => toggleArticle(article.id)}
                        className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-md-surface-container-high transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-md-on-surface">{article.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${bg} ${text}`}>
                              {article.enforceability}
                            </span>
                            <span className="text-xs text-md-on-surface-variant">{article.enforcementDate}</span>
                          </div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                          className={`text-md-on-surface-variant flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      {/* Expanded body */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-3 space-y-4 bg-md-surface border-t border-md-outline-variant">
                          {/* Applicability + Enforceability */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-lg border border-md-outline-variant bg-md-surface-container p-3 space-y-2">
                              <p className="text-xs font-bold uppercase tracking-wide text-md-on-surface-variant">Applicability</p>
                              <div>
                                <p className="text-xs text-md-on-surface-variant mb-1">Industry Sector</p>
                                <div className="flex flex-wrap gap-1">
                                  {selectedReg.sectors.map((s) => (
                                    <span key={s} className="text-xs font-medium px-2 py-0.5 rounded-full border border-md-outline-variant text-md-on-surface">{s}</span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-md-on-surface-variant mb-1">Geography</p>
                                <div className="flex flex-wrap gap-1">
                                  {selectedReg.geographies.map((g) => (
                                    <span key={g} className="text-xs font-medium px-2 py-0.5 rounded-full border border-md-outline-variant text-md-on-surface">{g}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="rounded-lg border border-md-outline-variant bg-md-surface-container p-3 space-y-2">
                              <p className="text-xs font-bold uppercase tracking-wide text-md-on-surface-variant">Enforceability</p>
                              <EnforceabilityBadge level={article.enforceability} />
                              <div>
                                <p className="text-xs text-md-on-surface-variant">Enforcement date</p>
                                <p className="text-sm font-bold text-md-on-surface mt-0.5">{article.enforcementDate}</p>
                              </div>
                            </div>
                          </div>

                          {/* Highlights */}
                          <div>
                            <p className="text-xs font-bold text-md-on-surface mb-1.5">Key Highlights</p>
                            <ul className="space-y-1.5">
                              {article.highlights.map((h, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--md-primary)" }} />
                                  <span className="text-xs text-md-on-surface-variant leading-relaxed">{h}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Suggested controls */}
                          <div>
                            <p className="text-xs font-bold text-md-on-surface mb-1.5">Suggested Control Activities</p>
                            <div className="rounded-lg border border-md-outline-variant overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="border-b border-md-outline-variant"
                                  style={{ backgroundColor: "var(--md-surface-container-high)" }}>
                                  <tr>
                                    <th className="px-3 py-2 text-left font-bold text-md-on-surface w-20">Code</th>
                                    <th className="px-3 py-2 text-left font-bold text-md-on-surface w-36">Domain</th>
                                    <th className="px-3 py-2 text-left font-bold text-md-on-surface">Control Statement</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {article.suggestedControls.map((ctrl, i) => (
                                    <tr key={ctrl.code}
                                      className={`border-t border-md-outline-variant align-top ${i % 2 === 0 ? "bg-md-surface" : "bg-md-surface-container"}`}>
                                      <td className="px-3 py-2.5 font-mono font-bold text-md-on-surface whitespace-nowrap">{ctrl.code}</td>
                                      <td className="px-3 py-2.5 text-md-on-surface-variant whitespace-nowrap">{ctrl.domain}</td>
                                      <td className="px-3 py-2.5 text-md-on-surface leading-relaxed">{ctrl.statement}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* ── Bottom bar ─────────────────────────────────────────────── */}
              <div
                className="flex-shrink-0 border-t border-md-outline-variant px-5 py-3 flex items-center justify-between gap-4"
                style={{ backgroundColor: "var(--md-surface-container-high)" }}
              >
                <div className="min-w-0">
                  <p className="text-xs text-md-on-surface-variant">Active regulation</p>
                  <p className="text-sm font-bold text-md-on-surface truncate">{selectedReg.shortName} — {selectedReg.name}</p>
                </div>
                <button
                  onClick={() => setShowBaselineModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg flex-shrink-0 transition-colors bg-md-primary-container text-md-on-primary-container hover:bg-md-primary hover:text-md-on-primary"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                  Baseline Master Framework
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-md-on-surface-variant">Select a regulation to view its articles.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Baseline Modal ─────────────────────────────────────────────────── */}
      {showBaselineModal && selectedReg && (
        <BaselineModal regulation={selectedReg} onClose={() => setShowBaselineModal(false)} />
      )}
    </div>
  )
}
