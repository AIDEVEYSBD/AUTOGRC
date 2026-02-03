"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FlipCard } from "@/components/flip-card";
import {Capability} from "@/components/capability";
import Image from "next/image";
export default function Home() {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-b from-black via-black to-black" />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-yellow-400/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-yellow-400/5 rounded-full blur-3xl opacity-20" />
      </div>

      {/* NAV */}
      <nav className="fixed inset-x-0 top-5 z-50 px-4">
        <div
          className="glass-dark
           
               px-6 py-3
               flex items-center justify-between
               rounded-xl
               transition-all duration-600 ease-out
    hover:bg-white/15
    hover:border-yellow-400/60
    hover:shadow-[0_0_0_1px_rgba(250,204,21,0.4),0_24px_70px_rgba(250,204,21,0.18)]
    hover:-translate-y-1"
               
        >
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
           <Image src="/AutoGRC.ico" alt="AutoGRC" width={50} height={50} />
            <span className="hidden sm:inline text-4xl font-bold hover:text-yellow-400">AutoGRC</span>
          </Link>
          <Link href='/' className="text-lg">
          Home
          </Link>
          <Link href='/' className="text-lg">
          Home
          </Link>
       
          <Link href="/overview">
            <Button className="button">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-36 pb-28 px-6">
        <div className="mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 hover:text-yellow-400 
    hover:-translate-y-1">
              Automated
              Governance & Compliance
            </h1>

            <p className="text-2xl text-gray-300 leading-relaxed max-w-xl mb-10 hover:text-yellow-400 hover:-translate-y-1">
              AutoGRC automates control mapping, testing, and reporting across
              frameworks replacing weeks of manual audit work with continuous,
              real-time compliance.
            </p>

            <div className="flex items-center gap-4">
              <Link href="/overview">
                <Button className="button">Enter Platform</Button>
              </Link>

             
            </div>
          </div>

          {/* Hero Visual */}

        </div>
      </section>

      {/* PROBLEM */}
      <section id="problem" className="py-55 px-6 ">
      <FlipCard 
            frontTitle="The Compliance Challenge"
            frontContent="Why traditional compliance programs fail at scale"
            backTitle="Common Pain Points"
            backContent={[
              "Manual control mapping across frameworks",
              "Inconsistent assessment procedures",
              "Audit fatigue from repetitive evidence",
              "Weeks to generate compliance reports",
              "Limited real-time compliance visibility",
            ]}
          />
      </section>

      {/* SOLUTION */}
      <section
        id="solution"
        className="pt-90 px-6 bg-black/60 "
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-4 hover:text-yellow-400 hover:-translate-y-1">
            The AutoGRC Solution
            </h2>
            <p className="text-2xl text-gray-300 max-w-3xl mx-auto hover:text-yellow-400 hover:-translate-y-1">
            A unified platform that establishes your controls foundation, automates testing, and delivers real-time, defensible reporting across all frameworks.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Benefit title="Unified Controls Foundation" description="Establish a single source of truth for your controls framework with AI-powered mapping to industry standards" />
            <Benefit title="Continuous Automation" description="Reduce manual effort by 80% with automated control testing and evidence collection" />
            <Benefit title="Real-Time Visibility" description="Get instant compliance insights across all frameworks with dynamic dashboards and reporting" />
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="pt-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-4 hover:text-yellow-400 hover:-translate-y-1">Core Capabilities</h2>
            <p className="text-2xl text-gray-300 max-w-2xl mx-auto hover:text-yellow-400 hover:-translate-y-1">
            Three powerful modules working together to transform your compliance operation
            </p>
          </div>

          <div className="space-y-12">
          <Capability
  number="01"
  title="Framework Baselining & Mapping"
  description="AI-powered control mapping between your internal framework and industry standards (NIST, CIS, ISO 27001, NIS2, SOC 2, and more). Identify overlaps, gaps, and opportunities for consolidation."
  keyFeatures={[
    "Intelligent control-to-control mapping with confidence scores",
    "Support for 15+ major frameworks and regulations",
    "Gap analysis and coverage reporting",
    "Bidirectional mapping for evidence reuse",
  ]}
  businessOutcomes={[
    "Reduce mapping time from weeks to hours",
    "Achieve 90%+ mapping accuracy",
    "Eliminate duplicate control assessments",
  ]}
/>
<Capability
  number="02"
  title="Automated Controls Testing"
  description="Continuous, automated control testing across your entire application portfolio. Connect to existing tools, define test procedures, and let AutoGRC handle the execution and evidence collection."
  keyFeatures={[
    "Integration with security tools and APIs",
    "Configurable test schedules and sampling",
    "Automated evidence collection and storage",
    "Risk-based prioritization and scoping",
  ]}
  businessOutcomes={[
    "80% reduction in manual testing effort",
    "Continuous compliance monitoring",
    "Real-time control effectiveness visibility",
  ]}
/>

<Capability
  number="03"
  title="Compliance Reporting & Analytics"
  description="Generate audit-ready reports instantly. Track compliance posture across frameworks, applications, and business units with dynamic dashboards and exportable reports."
  keyFeatures={[
    "Real-time compliance dashboards",
    "Custom report templates for any framework",
    "Automated report generation and scheduling",
    "Export to Excel, PDF, and audit portals",
  ]}
  businessOutcomes={[
    "Generate reports in minutes, not weeks",
    "Audit-ready evidence packages",
    "Executive-level compliance insights",
  ]}
/>


          </div>
        </div>
      </section>


      {/* FOOTER */}
      <footer className="py-10 text-center text-sm text-gray-500 hover:text-yellow-400 hover:-translate-y-1">
        Internal demo build. No client data.
      </footer>
    </div>
  );
}

/* helpers */

function Benefit({ title,description }: { title: string,description: string }) {
  return (
    <div className="  glass-dark
  p-8
  rounded-2xl
  transition-all duration-300 ease-out
  hover:bg-white/15
 hover:border-yellow-400/60
    hover:shadow-[0_0_0_1px_rgba(250,204,21,0.4),0_20px_60px_rgba(250,204,21,0.15)]
    hover:-translate-y-1">
      <h3 className="text-xl font-bold mb-3 hover:text-yellow-400">{title}</h3>
      <p className="text-gray-300 hover:text-yellow-400">
        {description}
      </p>
    </div>
  );
}

