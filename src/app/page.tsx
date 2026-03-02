import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-md-surface">
      <ThemeToggle />
      {/* HERO */}
      <section className="relative overflow-hidden bg-md-surface-container border-b border-md-outline-variant">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-32">
          <div className="max-w-4xl">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-md-on-surface leading-tight mb-6">
              AutoGRC
            </h1>
            <p className="text-xl text-md-on-surface-variant leading-relaxed mb-8 max-w-3xl">
              Automate compliance across frameworks with AI-powered control mapping, 
              continuous testing, and real-time reporting. Transform weeks of manual 
              work into minutes of intelligent automation.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/login">
                <button className="px-8 py-4 font-bold bg-md-primary-container text-md-on-primary-container rounded-xl hover:bg-md-primary hover:text-md-on-primary transition-colors text-lg">
                  Enter Platform
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-md-primary-container/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
      </section>

      {/* PROBLEM STATEMENT */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-md-on-surface mb-6">
              The Compliance Challenge
            </h2>
            <p className="text-base text-md-on-surface-variant leading-relaxed mb-4">
              Organizations struggle to maintain alignment between internal controls 
              and evolving regulatory frameworks like NIST, CIS, ISO, and NIS2. Manual 
              processes are time-consuming, inconsistent, and impossible to scale.
            </p>
            <p className="text-base text-md-on-surface-variant leading-relaxed">
              Security teams spend weeks mapping controls, conducting assessments, and 
              preparing audit reports—only to repeat the process across multiple frameworks.
            </p>
          </div>

          <div className="bg-md-surface-container rounded-xl p-8 border border-md-outline-variant">
            <h3 className="text-xl font-bold text-md-on-surface mb-6">Common Pain Points</h3>
            <ul className="space-y-4">
              <PainPoint text="Manual control mapping across multiple frameworks" />
              <PainPoint text="Inconsistent assessment procedures and results" />
              <PainPoint text="Audit fatigue from repetitive evidence gathering" />
              <PainPoint text="Weeks or months to generate compliance reports" />
              <PainPoint text="Limited visibility into real-time compliance posture" />
            </ul>
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="bg-md-surface-container border-y border-md-outline-variant py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-md-on-surface mb-4">
              The AutoGRC Solution
            </h2>
            <p className="text-xl text-md-on-surface-variant max-w-3xl mx-auto">
              A unified platform that establishes your controls foundation, automates 
              testing, and delivers real-time, defensible reporting across all frameworks.
            </p>
          </div>
            <div className="grid md:grid-cols-3 gap-8">
            <Benefit
              icon={<svg className="w-12 h-12 text-[#ffe600]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              title="Unified Controls Foundation"
              description="Establish a single source of truth for your controls framework with AI-powered mapping to industry standards"
            />
            <Benefit
              icon={<svg className="w-12 h-12 text-[#ffe600]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              title="Continuous Automation"
              description="Reduce manual effort by 80% with automated control testing and evidence collection"
            />
            <Benefit
              icon={<svg className="w-12 h-12 text-[#ffe600]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              title="Real-Time Visibility"
              description="Get instant compliance insights across all frameworks with dynamic dashboards and reporting"
            />
            </div>
        </div>
      </section>

      {/* CORE CAPABILITIES */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-md-on-surface mb-4">
            Core Capabilities
          </h2>
          <p className="text-xl text-md-on-surface-variant max-w-2xl mx-auto">
            Three powerful modules working together to transform your compliance operations
          </p>
        </div>

        <div className="space-y-12">
          <Capability
            number="01"
            title="Framework Baselining & Mapping"
            description="AI-powered control mapping between your internal framework and industry standards (NIST, CIS, ISO 27001, NIS2, SOC 2, and more). Identify overlaps, gaps, and opportunities for consolidation."
            features={[
              "Intelligent control-to-control mapping with confidence scores",
              "Support for 15+ major frameworks and regulations",
              "Gap analysis and coverage reporting",
              "Bidirectional mapping for evidence reuse",
            ]}
            outcomes={[
              "Reduce mapping time from weeks to hours",
              "Achieve 90%+ mapping accuracy",
              "Eliminate duplicate control assessments",
            ]}
          />

          <Capability
            number="02"
            title="Automated Controls Testing"
            description="Continuous, automated control testing across your entire application portfolio. Connect to existing tools, define test procedures, and let AutoGRC handle the execution and evidence collection."
            features={[
              "Integration with security tools and APIs",
              "Configurable test schedules and sampling",
              "Automated evidence collection and storage",
              "Risk-based prioritization and scoping",
            ]}
            outcomes={[
              "80% reduction in manual testing effort",
              "Continuous compliance monitoring",
              "Real-time control effectiveness visibility",
            ]}
          />

          <Capability
            number="03"
            title="Compliance Reporting & Analytics"
            description="Generate audit-ready reports instantly. Track compliance posture across frameworks, applications, and business units with dynamic dashboards and exportable reports."
            features={[
              "Real-time compliance dashboards",
              "Custom report templates for any framework",
              "Automated report generation and scheduling",
              "Export to Excel, PDF, and audit portals",
            ]}
            outcomes={[
              "Generate reports in minutes, not weeks",
              "Audit-ready evidence packages",
              "Executive-level compliance insights",
            ]}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-md-primary text-md-on-primary py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Compliance Operations?
          </h2>
          <p className="text-xl mb-8" style={{ color: 'inherit' }}>
            Join leading organizations using AutoGRC to automate compliance and 
            reduce audit preparation time by 80%.
          </p>
          <Link href="/login">
            <button className="px-8 py-4 font-bold bg-md-primary-container text-md-on-primary-container rounded-xl hover:opacity-90 transition-opacity text-lg">
              Get Started Now
            </button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-md-outline-variant py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-md-on-surface-variant">
            Internal demonstration build for evaluation purposes only. No client data.
            <br />
            Designed for enterprise assurance environments.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ——— Helper Components ——— */

function PainPoint({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <svg className="w-5 h-5 text-md-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      <span className="text-md-on-surface-variant">{text}</span>
    </li>
  );
}

function Benefit({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-md-surface rounded-xl p-6 border border-md-outline-variant hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-md-on-surface mb-3">{title}</h3>
      <p className="text-md-on-surface-variant leading-relaxed">{description}</p>
    </div>
  );
}

function Capability({
  number,
  title,
  description,
  features,
  outcomes,
}: {
  number: string;
  title: string;
  description: string;
  features: string[];
  outcomes: string[];
}) {
  return (
    <div className="bg-md-surface rounded-xl border border-md-outline-variant overflow-hidden hover:shadow-lg transition-shadow">
      <div className="bg-md-surface-container px-8 py-6 border-b border-md-outline-variant">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-5xl font-bold text-md-primary-container">{number}</span>
          <h3 className="text-2xl font-bold text-md-on-surface">{title}</h3>
        </div>
        <p className="text-md-on-surface-variant leading-relaxed">{description}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 px-8 py-6">
        <div>
          <h4 className="text-sm font-bold text-md-on-surface uppercase tracking-wider mb-4">
            Key Features
          </h4>
          <ul className="space-y-3">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-md-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-md-on-surface-variant text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold text-md-on-surface uppercase tracking-wider mb-4">
            Business Outcomes
          </h4>
          <ul className="space-y-3">
            {outcomes.map((outcome, i) => (
              <li key={i} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-md-primary-container flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                <span className="text-md-on-surface-variant text-sm">{outcome}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}