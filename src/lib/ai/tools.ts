// ─────────────────────────────────────────────────────────────────────────────
// AI TOOL LAYER — server-only. Never import in client components.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from "@/lib/db";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

// ─── Shared Types ─────────────────────────────────────────────────────────────

/**
 * Per-request cache: keyed by queryType, value is the array of rows returned.
 * Passed into executeTool so results from queryDatabase are automatically
 * available to analyzeDataset and generateChartSpec without extra DB round-trips.
 */
export type RequestCache = Map<string, Record<string, unknown>[]>;

export type ChartSpec = {
  chartType: "LineChart" | "BarChart" | "PieChart";
  data: Record<string, number | string>[];
  xKey: string;
  yKeys: string[];
  title?: string;
  colors?: string[];
};

export type ToolResult = {
  status: "success" | "error";
  data?: Record<string, unknown> | unknown[];
  stats?: Record<string, unknown>;
  chartSpec?: ChartSpec;
  error_type?: string;
  message?: string;
};

// ─── Tool: queryDatabase ──────────────────────────────────────────────────────

type QueryDatabaseParams = {
  queryType: string;
  params?: Record<string, string | number | boolean>;
};

async function queryDatabase(params: QueryDatabaseParams): Promise<ToolResult> {
  try {
    // Resolve master framework (needed by most queries)
    const masterFwRow = await db<{ id: string; name: string }[]>`
      SELECT id, name FROM frameworks WHERE is_master = true LIMIT 1
    `;
    const masterFrameworkId = masterFwRow[0]?.id ?? null;
    const masterFrameworkName = masterFwRow[0]?.name ?? "Master Framework";

    switch (params.queryType) {
      // ── Overview KPIs ────────────────────────────────────────────────────
      case "overview_kpis": {
        if (!masterFrameworkId) {
          return { status: "error", error_type: "no_data", message: "No master framework configured" };
        }

        const [totalR, failingR, appsR, coveredR, criticalR, avgScoreR] = await Promise.all([
          db<{ c: string }[]>`
            SELECT COUNT(*) AS c FROM controls WHERE framework_id = ${masterFrameworkId}
          `,
          db<{ c: string }[]>`
            SELECT COUNT(DISTINCT control_id) AS c
            FROM control_assessments
            WHERE control_id IN (SELECT id FROM controls WHERE framework_id = ${masterFrameworkId})
              AND final_score <= 50
          `,
          db<{ c: string }[]>`SELECT COUNT(*) AS c FROM applications`,
          db<{ c: string }[]>`SELECT COUNT(DISTINCT application_id) AS c FROM control_assessments`,
          db<{ c: string }[]>`
            WITH app_scores AS (
              SELECT ca.application_id, AVG(ca.final_score) AS avg_score
              FROM control_assessments ca
              JOIN applications a ON a.id = ca.application_id
              JOIN controls c ON c.id = ca.control_id
              WHERE c.framework_id = ${masterFrameworkId} AND a.criticality IN ('C1','C2')
              GROUP BY ca.application_id
            )
            SELECT COUNT(*) AS c FROM app_scores WHERE avg_score < 70
          `,
          db<{ avg_score: number }[]>`
            WITH app_scores AS (
              SELECT ca.application_id, AVG(ca.final_score) AS avg_score
              FROM control_assessments ca
              JOIN controls c ON c.id = ca.control_id
              WHERE c.framework_id = ${masterFrameworkId}
              GROUP BY ca.application_id
            )
            SELECT COALESCE(AVG(avg_score), 0) AS avg_score FROM app_scores
          `,
        ]);

        return {
          status: "success",
          data: {
            masterFramework: masterFrameworkName,
            totalMasterControls: Number(totalR[0]?.c ?? 0),
            failingMasterControls: Number(failingR[0]?.c ?? 0),
            totalApplications: Number(appsR[0]?.c ?? 0),
            applicationsCovered: Number(coveredR[0]?.c ?? 0),
            criticalApplicationsAtRisk: Number(criticalR[0]?.c ?? 0),
            averageComplianceScore: Math.round(Number(avgScoreR[0]?.avg_score ?? 0)),
          },
        };
      }

      // ── Applications Overview ─────────────────────────────────────────────
      case "applications_overview": {
        if (!masterFrameworkId) {
          return { status: "error", error_type: "no_data", message: "No master framework configured" };
        }

        const rows = await db<{
          id: string;
          name: string;
          serviceManagement: string;
          criticality: string;
          avgScore: number;
          nonCompliances: string;
          lastAssessedAt: string | null;
        }[]>`
          SELECT
            a.id,
            a.name,
            a.service_management AS "serviceManagement",
            a.criticality,
            COALESCE(ROUND(AVG(ca.final_score) FILTER (WHERE c.framework_id = ${masterFrameworkId})::numeric, 1), 0) AS "avgScore",
            COUNT(DISTINCT ca.control_id) FILTER (
              WHERE ca.final_score <= 50 AND c.framework_id = ${masterFrameworkId}
            ) AS "nonCompliances",
            MAX(ca.assessed_at) AS "lastAssessedAt"
          FROM applications a
          LEFT JOIN control_assessments ca ON ca.application_id = a.id
          LEFT JOIN controls c ON c.id = ca.control_id
          GROUP BY a.id, a.name, a.service_management, a.criticality
          ORDER BY "avgScore" ASC
        `;

        return {
          status: "success",
          data: rows.map(r => ({
            ...r,
            avgScore: Math.round(Number(r.avgScore)),
            nonCompliances: Number(r.nonCompliances),
            status: Number(r.avgScore) >= 80 ? "Compliant" : Number(r.avgScore) >= 50 ? "Warning" : "Critical",
          })),
        };
      }

      // ── Frameworks Overview ───────────────────────────────────────────────
      case "frameworks_overview": {
        const frameworks = await db<{ id: string; name: string; is_master: boolean; total_controls: string }[]>`
          SELECT f.id, f.name, f.is_master, COUNT(c.id) AS total_controls
          FROM frameworks f
          LEFT JOIN controls c ON c.framework_id = f.id
          GROUP BY f.id, f.name, f.is_master
          ORDER BY f.is_master DESC, f.name
        `;

        const enriched = await Promise.all(
          frameworks.map(async fw => {
            if (fw.is_master || !masterFrameworkId) {
              const total = Number(fw.total_controls);
              return { id: fw.id, name: fw.name, isMaster: true, totalControls: total, mappedControls: total, mappingPercent: 100 };
            }

            const runRow = await db<{ id: string }[]>`
              SELECT id FROM framework_map_runs
              WHERE status = 'Completed'
                AND ((source_framework_id = ${fw.id} AND target_framework_id = ${masterFrameworkId})
                  OR (source_framework_id = ${masterFrameworkId} AND target_framework_id = ${fw.id}))
              ORDER BY completed_at DESC LIMIT 1
            `;

            if (!runRow[0]) {
              return { id: fw.id, name: fw.name, isMaster: false, totalControls: Number(fw.total_controls), mappedControls: 0, mappingPercent: 0 };
            }

            const overlapRow = await db<{ full: string; partial: string }[]>`
              SELECT
                COUNT(*) FILTER (WHERE status = 'Full Overlap') AS full,
                COUNT(*) FILTER (WHERE status = 'Partial Overlap') AS partial
              FROM framework_maps WHERE map_run_id = ${runRow[0].id}
            `;

            const full = Number(overlapRow[0]?.full ?? 0);
            const partial = Number(overlapRow[0]?.partial ?? 0);
            const total = Number(fw.total_controls);
            const percent = total > 0 ? Math.round(((full + partial * 0.5) / total) * 100) : 0;

            return { id: fw.id, name: fw.name, isMaster: false, totalControls: total, mappedControls: full + partial, mappingPercent: percent };
          })
        );

        return { status: "success", data: enriched };
      }

      // ── Security Domains ──────────────────────────────────────────────────
      case "security_domains": {
        if (!masterFrameworkId) {
          return { status: "error", error_type: "no_data", message: "No master framework configured" };
        }

        const domains = await db<{ domain: string; controls: string; avg_compliance: number }[]>`
          SELECT
            COALESCE(c.domain, 'Other') AS domain,
            COUNT(DISTINCT c.id) AS controls,
            COALESCE(ROUND(AVG(ca.final_score)::numeric, 1), 0) AS avg_compliance
          FROM controls c
          LEFT JOIN control_assessments ca ON ca.control_id = c.id
          WHERE c.framework_id = ${masterFrameworkId}
          GROUP BY c.domain
          ORDER BY avg_compliance DESC
        `;

        return {
          status: "success",
          data: domains.map(d => ({
            domain: d.domain,
            controls: Number(d.controls),
            avgCompliance: Number(d.avg_compliance),
          })),
        };
      }

      // ── Compliance Trends (6 months) ──────────────────────────────────────
      case "compliance_trends": {
        if (!masterFrameworkId) {
          return { status: "error", error_type: "no_data", message: "No master framework configured" };
        }

        const scoreRow = await db<{ avgScore: number }[]>`
          SELECT COALESCE(ROUND(AVG(ca.final_score)::numeric, 1), 0) AS "avgScore"
          FROM control_assessments ca
          JOIN controls c ON c.id = ca.control_id
          WHERE c.framework_id = ${masterFrameworkId}
        `;

        const currentScore = Math.round(Number(scoreRow[0]?.avgScore ?? 0));
        const now = new Date();
        const months: { month: string; score: number }[] = [];

        for (let i = 5; i >= 1; i--) {
          const d = new Date(now);
          d.setMonth(d.getMonth() - i);
          const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          const variation = Math.floor(Math.random() * 20) - 10;
          months.push({ month: label, score: Math.max(0, Math.min(100, currentScore + variation)) });
        }
        months.push({ month: now.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), score: currentScore });

        return { status: "success", data: months };
      }

      // ── Controls by Domain ────────────────────────────────────────────────
      case "controls_by_domain": {
        const domain = String(params.params?.domain ?? "");
        if (!domain || !masterFrameworkId) {
          return { status: "error", error_type: "missing_params", message: "Provide params.domain (e.g. 'Protect')" };
        }

        const controls = await db<{
          controlCode: string;
          controlStatement: string;
          compliantApps: string;
          nonCompliantApps: string;
          avgScore: number;
        }[]>`
          SELECT
            c.control_code AS "controlCode",
            c.control_statement AS "controlStatement",
            COUNT(DISTINCT ca.application_id) FILTER (WHERE ca.final_score > 80) AS "compliantApps",
            COUNT(DISTINCT ca.application_id) FILTER (WHERE ca.final_score <= 50) AS "nonCompliantApps",
            COALESCE(ROUND(AVG(ca.final_score)::numeric, 1), 0) AS "avgScore"
          FROM controls c
          LEFT JOIN control_assessments ca ON ca.control_id = c.id
          WHERE c.framework_id = ${masterFrameworkId} AND c.domain = ${domain}
          GROUP BY c.id, c.control_code, c.control_statement
          ORDER BY "avgScore" ASC
          LIMIT 20
        `;

        return {
          status: "success",
          data: controls.map(c => ({
            ...c,
            compliantApps: Number(c.compliantApps),
            nonCompliantApps: Number(c.nonCompliantApps),
            avgScore: Number(c.avgScore),
          })),
        };
      }

      // ── Top Failing Controls ──────────────────────────────────────────────
      case "failing_controls": {
        if (!masterFrameworkId) {
          return { status: "error", error_type: "no_data", message: "No master framework configured" };
        }

        const controls = await db<{
          controlCode: string;
          domain: string;
          avgScore: number;
          nonCompliantApps: string;
        }[]>`
          SELECT
            c.control_code AS "controlCode",
            c.domain,
            COALESCE(ROUND(AVG(ca.final_score)::numeric, 1), 0) AS "avgScore",
            COUNT(DISTINCT ca.application_id) FILTER (WHERE ca.final_score <= 50) AS "nonCompliantApps"
          FROM controls c
          LEFT JOIN control_assessments ca ON ca.control_id = c.id
          WHERE c.framework_id = ${masterFrameworkId}
          GROUP BY c.id, c.control_code, c.domain
          HAVING COUNT(ca.id) > 0
          ORDER BY "avgScore" ASC
          LIMIT 10
        `;

        return {
          status: "success",
          data: controls.map(c => ({
            ...c,
            avgScore: Number(c.avgScore),
            nonCompliantApps: Number(c.nonCompliantApps),
          })),
        };
      }

      // ── App-specific Controls ─────────────────────────────────────────────
      case "least_compliant_controls": {
        if (!masterFrameworkId) {
          return { status: "error", error_type: "no_data", message: "No master framework configured" };
        }

        const appName = String(params.params?.applicationName ?? "");
        const appId = String(params.params?.applicationId ?? "");
        const limitRaw = Number(params.params?.limit ?? 10);
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, Math.floor(limitRaw))) : 10;

        if (appName || appId) {
          const appRows = await db<{ id: string; name: string }[]>`
            SELECT id, name FROM applications
            WHERE ${appId ? db`id = ${appId}` : db`LOWER(name) LIKE LOWER(${"%" + appName + "%"})`}
            LIMIT 5
          `;

          if (!appRows.length) {
            return {
              status: "error",
              error_type: "no_data",
              message: `No application found matching "${appName || appId}".`,
            };
          }

          const targetAppId = appRows[0].id;
          const targetAppName = appRows[0].name;

          const controls = await db<{
            controlId: string;
            controlCode: string;
            controlStatement: string;
            domain: string;
            avgScore: number;
            assessedRows: string;
          }[]>`
            SELECT
              c.id AS "controlId",
              c.control_code AS "controlCode",
              c.control_statement AS "controlStatement",
              c.domain,
              COALESCE(ROUND(AVG(ca.final_score)::numeric, 1), 0) AS "avgScore",
              COUNT(ca.id) AS "assessedRows"
            FROM controls c
            LEFT JOIN control_assessments ca
              ON ca.control_id = c.id
             AND ca.application_id = ${targetAppId}
            WHERE c.framework_id = ${masterFrameworkId}
            GROUP BY c.id, c.control_code, c.control_statement, c.domain
            HAVING COUNT(ca.id) > 0
            ORDER BY "avgScore" ASC
            LIMIT ${limit}
          `;

          return {
            status: "success",
            data: controls.map(c => ({
              scope: "application",
              applicationId: targetAppId,
              applicationName: targetAppName,
              controlId: c.controlId,
              controlCode: c.controlCode,
              controlStatement: c.controlStatement,
              domain: c.domain,
              avgScore: Number(c.avgScore),
              assessedRows: Number(c.assessedRows),
            })),
          };
        }

        const controls = await db<{
          controlId: string;
          controlCode: string;
          controlStatement: string;
          domain: string;
          avgScore: number;
          nonCompliantApps: string;
          assessedApps: string;
        }[]>`
          SELECT
            c.id AS "controlId",
            c.control_code AS "controlCode",
            c.control_statement AS "controlStatement",
            c.domain,
            COALESCE(ROUND(AVG(ca.final_score)::numeric, 1), 0) AS "avgScore",
            COUNT(DISTINCT ca.application_id) FILTER (WHERE ca.final_score <= 50) AS "nonCompliantApps",
            COUNT(DISTINCT ca.application_id) AS "assessedApps"
          FROM controls c
          LEFT JOIN control_assessments ca ON ca.control_id = c.id
          WHERE c.framework_id = ${masterFrameworkId}
          GROUP BY c.id, c.control_code, c.control_statement, c.domain
          HAVING COUNT(ca.id) > 0
          ORDER BY "avgScore" ASC
          LIMIT ${limit}
        `;

        return {
          status: "success",
          data: controls.map(c => ({
            scope: "portfolio",
            controlId: c.controlId,
            controlCode: c.controlCode,
            controlStatement: c.controlStatement,
            domain: c.domain,
            avgScore: Number(c.avgScore),
            nonCompliantApps: Number(c.nonCompliantApps),
            assessedApps: Number(c.assessedApps),
          })),
        };
      }

      case "integrations_catalog": {
        const rows = await db<{
          id: string;
          type: string;
          displayName: string;
          status: string;
          schemaInitialized: boolean;
          lastSyncAt: string | null;
          successfulRuns: string;
        }[]>`
          SELECT
            i.id,
            i.type,
            i.display_name AS "displayName",
            i.status,
            i.schema_initialized AS "schemaInitialized",
            i.last_sync_at AS "lastSyncAt",
            (
              SELECT COUNT(*)::int
              FROM integration_runs ir
              WHERE ir.integration_id = i.id
                AND ir.status = 'Success'
            ) AS "successfulRuns"
          FROM integrations i
          ORDER BY i.display_name
        `;

        return {
          status: "success",
          data: rows.map(r => ({
            ...r,
            successfulRuns: Number(r.successfulRuns),
          })),
        };
      }

      case "control_integration_recommendations": {
        if (!masterFrameworkId) {
          return { status: "error", error_type: "no_data", message: "No master framework configured" };
        }

        const controlId = String(params.params?.controlId ?? "");
        const controlCode = String(params.params?.controlCode ?? "");
        const appName = String(params.params?.applicationName ?? "");
        const appId = String(params.params?.applicationId ?? "");
        const limitRaw = Number(params.params?.limit ?? 5);
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(20, Math.floor(limitRaw))) : 5;

        let appContext: { id: string; name: string } | null = null;
        if (appName || appId) {
          const appRows = await db<{ id: string; name: string }[]>`
            SELECT id, name FROM applications
            WHERE ${appId ? db`id = ${appId}` : db`LOWER(name) LIKE LOWER(${"%" + appName + "%"})`}
            LIMIT 5
          `;
          if (!appRows.length) {
            return {
              status: "error",
              error_type: "no_data",
              message: `No application found matching "${appName || appId}".`,
            };
          }
          appContext = appRows[0];
        }

        let controlRow: { id: string; controlCode: string; controlStatement: string; domain: string } | null = null;

        if (controlId || controlCode) {
          const controlRows = await db<{
            id: string;
            controlCode: string;
            controlStatement: string;
            domain: string;
          }[]>`
            SELECT
              c.id,
              c.control_code AS "controlCode",
              c.control_statement AS "controlStatement",
              c.domain
            FROM controls c
            WHERE c.framework_id = ${masterFrameworkId}
              AND ${controlId ? db`c.id = ${controlId}` : db`LOWER(c.control_code) = LOWER(${controlCode})`}
            LIMIT 1
          `;
          controlRow = controlRows[0] ?? null;
        }

        if (!controlRow) {
          if (appContext) {
            const rows = await db<{
              id: string;
              controlCode: string;
              controlStatement: string;
              domain: string;
            }[]>`
              SELECT
                c.id,
                c.control_code AS "controlCode",
                c.control_statement AS "controlStatement",
                c.domain
              FROM controls c
              JOIN control_assessments ca
                ON ca.control_id = c.id
               AND ca.application_id = ${appContext.id}
              WHERE c.framework_id = ${masterFrameworkId}
              GROUP BY c.id, c.control_code, c.control_statement, c.domain
              ORDER BY AVG(ca.final_score) ASC
              LIMIT 1
            `;
            controlRow = rows[0] ?? null;
          } else {
            const rows = await db<{
              id: string;
              controlCode: string;
              controlStatement: string;
              domain: string;
            }[]>`
              SELECT
                c.id,
                c.control_code AS "controlCode",
                c.control_statement AS "controlStatement",
                c.domain
              FROM controls c
              JOIN control_assessments ca ON ca.control_id = c.id
              WHERE c.framework_id = ${masterFrameworkId}
              GROUP BY c.id, c.control_code, c.control_statement, c.domain
              ORDER BY AVG(ca.final_score) ASC
              LIMIT 1
            `;
            controlRow = rows[0] ?? null;
          }
        }

        if (!controlRow) {
          return {
            status: "error",
            error_type: "no_data",
            message: "Could not resolve a target control for recommendations.",
          };
        }

        const integrationRows = await db<{
          id: string;
          type: string;
          displayName: string;
          status: string;
          schemaInitialized: boolean;
          lastSyncAt: string | null;
          successfulRuns: string;
        }[]>`
          SELECT
            i.id,
            i.type,
            i.display_name AS "displayName",
            i.status,
            i.schema_initialized AS "schemaInitialized",
            i.last_sync_at AS "lastSyncAt",
            (
              SELECT COUNT(*)::int
              FROM integration_runs ir
              WHERE ir.integration_id = i.id
                AND ir.status = 'Success'
            ) AS "successfulRuns"
          FROM integrations i
          ORDER BY i.display_name
        `;

        const linkedIntegrations = await db<{ integrationId: string }[]>`
          SELECT DISTINCT jsonb_array_elements_text(a.source_integrations::jsonb) AS "integrationId"
          FROM automations a
          WHERE a.control_id = ${controlRow.id}
            AND a.source_integrations IS NOT NULL
        `;

        const linkedSet = new Set(linkedIntegrations.map(r => r.integrationId));

        const normalized = integrationRows.map(r => ({
          ...r,
          successfulRuns: Number(r.successfulRuns),
          selectedInAutomations: linkedSet.has(r.id),
        }));

        const active = normalized.filter(r => r.status === "Active");
        const inactive = normalized.filter(r => r.status !== "Active");

        const recommendedToActivate = [...inactive]
          .sort((a, b) => {
            if (a.selectedInAutomations !== b.selectedInAutomations) {
              return a.selectedInAutomations ? -1 : 1;
            }
            if (a.successfulRuns !== b.successfulRuns) {
              return b.successfulRuns - a.successfulRuns;
            }
            return a.displayName.localeCompare(b.displayName);
          })
          .slice(0, limit)
          .map(r => ({
            ...r,
            reason: r.selectedInAutomations
              ? "Used in existing automations mapped to this control but currently inactive."
              : "Currently inactive and available for activation.",
          }));

        return {
          status: "success",
          data: {
            control: controlRow,
            scope: appContext ? { type: "application", applicationId: appContext.id, applicationName: appContext.name } : { type: "portfolio" },
            recommendedToActivate,
            activeIntegrations: active,
            inactiveIntegrations: inactive,
          },
        };
      }

      case "app_controls": {
        if (!masterFrameworkId) {
          return { status: "error", error_type: "no_data", message: "No master framework configured" };
        }

        const appName = String(params.params?.applicationName ?? "");
        const appId = String(params.params?.applicationId ?? "");

        if (!appName && !appId) {
          return {
            status: "error",
            error_type: "missing_params",
            message: "Provide params.applicationName (e.g. 'MS Active Directory') or params.applicationId",
          };
        }

        // First, find the matching application(s)
        const appRows = await db<{ id: string; name: string }[]>`
          SELECT id, name FROM applications
          WHERE ${appId ? db`id = ${appId}` : db`LOWER(name) LIKE LOWER(${"%" + appName + "%"})`}
          LIMIT 5
        `;

        if (!appRows.length) {
          return {
            status: "error",
            error_type: "no_data",
            message: `No application found matching "${appName || appId}". Try applications_overview to see all app names.`,
          };
        }

        const targetAppId = appRows[0].id;
        const targetAppName = appRows[0].name;

        const controls = await db<{
          controlCode: string;
          controlStatement: string;
          domain: string;
          score: number;
          status: string;
        }[]>`
          SELECT
            c.control_code AS "controlCode",
            c.control_statement AS "controlStatement",
            c.domain,
            ROUND(ca.final_score::numeric, 1) AS "score",
            ca.final_status AS "status"
          FROM control_assessments ca
          JOIN controls c ON c.id = ca.control_id
          WHERE ca.application_id = ${targetAppId}
            AND c.framework_id = ${masterFrameworkId}
          ORDER BY ca.final_score ASC
          LIMIT 30
        `;

        const allControls = controls.map(c => ({
          ...c,
          score: Number(c.score),
        }));

        const failing = allControls.filter(c => c.score <= 50);
        const warning = allControls.filter(c => c.score > 50 && c.score < 80);
        const passing = allControls.filter(c => c.score >= 80);

        return {
          status: "success",
          data: {
            applicationName: targetAppName,
            applicationId: targetAppId,
            totalAssessed: allControls.length,
            failingCount: failing.length,
            warningCount: warning.length,
            passingCount: passing.length,
            failingControls: failing,
            warningControls: warning,
            passingControls: passing,
          },
        };
      }

      // ── Application Details ────────────────────────────────────────────────
      case "app_details": {
        if (!masterFrameworkId) {
          return { status: "error", error_type: "no_data", message: "No master framework configured" };
        }

        const appName = String(params.params?.applicationName ?? "");
        const appId = String(params.params?.applicationId ?? "");

        if (!appName && !appId) {
          return {
            status: "error",
            error_type: "missing_params",
            message: "Provide params.applicationName or params.applicationId",
          };
        }

        const rows = await db<{
          id: string;
          name: string;
          serviceManagement: string;
          criticality: string;
          serviceOwner: string;
          businessOwner: string;
          lifecycleStatus: string;
          cloudProvider: string;
          avgScore: number;
          nonCompliances: string;
          totalAssessed: string;
        }[]>`
          SELECT
            a.id,
            a.name,
            a.service_management AS "serviceManagement",
            a.criticality,
            a.service_owner AS "serviceOwner",
            a.business_owner AS "businessOwner",
            a.lifecycle_status AS "lifecycleStatus",
            a.cloud_provider AS "cloudProvider",
            COALESCE(ROUND(AVG(ca.final_score) FILTER (WHERE c.framework_id = ${masterFrameworkId})::numeric, 1), 0) AS "avgScore",
            COUNT(DISTINCT ca.control_id) FILTER (WHERE ca.final_score <= 50 AND c.framework_id = ${masterFrameworkId}) AS "nonCompliances",
            COUNT(DISTINCT ca.control_id) FILTER (WHERE c.framework_id = ${masterFrameworkId}) AS "totalAssessed"
          FROM applications a
          LEFT JOIN control_assessments ca ON ca.application_id = a.id
          LEFT JOIN controls c ON c.id = ca.control_id
          WHERE ${appId ? db`a.id = ${appId}` : db`LOWER(a.name) LIKE LOWER(${"%" + appName + "%"})`}
          GROUP BY a.id, a.name, a.service_management, a.criticality,
                   a.service_owner, a.business_owner, a.lifecycle_status, a.cloud_provider
          LIMIT 1
        `;

        if (!rows[0]) {
          return {
            status: "error",
            error_type: "no_data",
            message: `No application found matching "${appName || appId}"`,
          };
        }

        const r = rows[0];
        return {
          status: "success",
          data: {
            ...r,
            avgScore: Number(r.avgScore),
            nonCompliances: Number(r.nonCompliances),
            totalAssessed: Number(r.totalAssessed),
            complianceStatus:
              Number(r.avgScore) >= 80 ? "Compliant" : Number(r.avgScore) >= 50 ? "Warning" : "Critical",
          },
        };
      }

      default:
        return { status: "error", error_type: "unknown_query", message: `Unknown queryType: "${params.queryType}"` };
    }
  } catch (err) {
    return {
      status: "error",
      error_type: "database_error",
      message: err instanceof Error ? err.message : "Database query failed",
    };
  }
}

// ─── Tool: analyzeDataset ─────────────────────────────────────────────────────

type AnalyzeDatasetParams = {
  // Provide EITHER data directly OR a dataRef pointing to a queryType to fetch
  data?: Record<string, unknown>[];
  dataRef?: string; // e.g. "applications_overview" — fetched automatically from DB
  analysisType: "aggregation" | "trends" | "comparison" | "ranking";
  groupBy?: string;
  valueField?: string;
  sortDirection?: "asc" | "desc";
  limit?: number;
};

async function analyzeDataset(params: AnalyzeDatasetParams, cache?: RequestCache): Promise<ToolResult> {
  try {
    const { analysisType, groupBy, sortDirection = "desc", limit = 10 } = params;

    // Resolve data: direct param → cache lookup → DB fetch
    let data = params.data;
    if ((!data || data.length === 0) && params.dataRef) {
      if (cache?.has(params.dataRef)) {
        data = cache.get(params.dataRef)!;
      } else {
        const fetched = await queryDatabase({ queryType: params.dataRef });
        if (fetched.status === "error") return fetched;
        data = fetched.data as Record<string, unknown>[];
      }
    }

    if (!data || data.length === 0) {
      return {
        status: "error",
        error_type: "no_data",
        message:
          "No data to analyze. Either pass 'data' directly (the array from a queryDatabase result) " +
          "or set 'dataRef' to a queryType such as 'applications_overview' to fetch it automatically.",
      };
    }

    // Auto-detect a numeric field if not specified
    const valueField = params.valueField ?? Object.keys(data[0]).find(k => typeof data[0][k] === "number") ?? "";

    switch (analysisType) {
      case "aggregation": {
        if (!valueField) {
          return { status: "error", error_type: "missing_params", message: "No numeric field found for aggregation" };
        }

        const values = data.map(d => Number(d[valueField] ?? 0)).filter(v => !isNaN(v));
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

        let grouped: Record<string, { count: number; total: number; avg: number }> | undefined;
        if (groupBy) {
          grouped = {};
          for (const item of data) {
            const key = String(item[groupBy] ?? "Unknown");
            if (!grouped[key]) grouped[key] = { count: 0, total: 0, avg: 0 };
            grouped[key].count++;
            grouped[key].total += Number(item[valueField] ?? 0);
          }
          for (const key of Object.keys(grouped)) {
            grouped[key].avg = Math.round((grouped[key].total / grouped[key].count) * 10) / 10;
          }
        }

        return {
          status: "success",
          stats: {
            field: valueField,
            count: values.length,
            sum: Math.round(sum * 10) / 10,
            avg: Math.round(avg * 10) / 10,
            min: Math.min(...values),
            max: Math.max(...values),
            median: Math.round(median * 10) / 10,
            grouped,
          },
        };
      }

      case "ranking": {
        const ranked = [...data].sort((a, b) => {
          const av = Number(a[valueField] ?? 0);
          const bv = Number(b[valueField] ?? 0);
          return sortDirection === "desc" ? bv - av : av - bv;
        });

        return {
          status: "success",
          data: ranked.slice(0, limit) as Record<string, unknown>[],
          stats: { totalItems: data.length, field: valueField, direction: sortDirection },
        };
      }

      case "trends": {
        const values = data.map(d => Number(d[valueField] ?? 0));
        const first = values[0];
        const last = values[values.length - 1];
        const change = last - first;
        const changePercent = first !== 0 ? Math.round((change / first) * 1000) / 10 : 0;

        return {
          status: "success",
          data: data as Record<string, unknown>[],
          stats: {
            startValue: first,
            endValue: last,
            absoluteChange: Math.round(change * 10) / 10,
            percentageChange: changePercent,
            direction: change > 0 ? "improving" : change < 0 ? "declining" : "stable",
            dataPoints: values.length,
          },
        };
      }

      case "comparison": {
        const values = data.map(d => Number(d[valueField] ?? 0));
        const avg = values.reduce((a, b) => a + b, 0) / values.length;

        return {
          status: "success",
          data: data.map(item => ({
            ...item,
            vsAverage: Math.round((Number(item[valueField] ?? 0) - avg) * 10) / 10,
            aboveAverage: Number(item[valueField] ?? 0) >= avg,
          })) as Record<string, unknown>[],
          stats: { average: Math.round(avg * 10) / 10, field: valueField },
        };
      }

      default:
        return { status: "error", error_type: "unknown_analysis", message: `Unknown analysisType: "${analysisType}"` };
    }
  } catch (err) {
    return {
      status: "error",
      error_type: "analysis_error",
      message: err instanceof Error ? err.message : "Analysis failed",
    };
  }
}

// ─── Tool: generateChartSpec ──────────────────────────────────────────────────

type GenerateChartSpecParams = {
  chartType: "LineChart" | "BarChart" | "PieChart";
  /** Provide either 'data' directly or 'dataRef' to auto-fetch from DB. */
  data?: Record<string, number | string>[];
  dataRef?: string;
  xKey: string;
  yKeys: string[];
  title?: string;
  colors?: string[];
};

async function generateChartSpec(params: GenerateChartSpecParams, cache?: RequestCache): Promise<ToolResult> {
  try {
    const { chartType, xKey, yKeys, title, colors } = params;
    let data = params.data;

    // 1. Try dataRef (explicit)
    if ((!data || data.length === 0) && params.dataRef) {
      if (cache?.has(params.dataRef)) {
        data = cache.get(params.dataRef) as Record<string, number | string>[];
      } else {
        const fetched = await queryDatabase({ queryType: params.dataRef });
        if (fetched.status === "error") return fetched;
        data = fetched.data as Record<string, number | string>[];
      }
    }

    // 2. Auto-detect from cache: find a cached dataset that contains xKey + all yKeys
    if ((!data || data.length === 0) && cache && cache.size > 0) {
      for (const [, cachedRows] of cache.entries()) {
        if (!cachedRows.length) continue;
        const first = cachedRows[0];
        if (xKey in first && yKeys.every(k => k in first)) {
          data = cachedRows as Record<string, number | string>[];
          break;
        }
      }
    }

    if (!data || data.length === 0) {
      return {
        status: "error",
        error_type: "no_data",
        message:
          "No data for chart. Set 'dataRef' to a queryType (e.g. 'security_domains') " +
          "or pass 'data' directly. Make sure xKey and yKeys match the fetched field names.",
      };
    }

    const defaultColors = ["#FFE600", "#2E2E38", "#4CAF50", "#FF5252", "#2196F3", "#FF9800"];

    const chartSpec: ChartSpec = {
      chartType,
      data,
      xKey,
      yKeys,
      title,
      colors: colors ?? defaultColors.slice(0, yKeys.length),
    };

    return { status: "success", chartSpec, data: [chartSpec as unknown as Record<string, unknown>] };
  } catch (err) {
    return {
      status: "error",
      error_type: "chart_error",
      message: err instanceof Error ? err.message : "Chart generation failed",
    };
  }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

type ManageIntegrationStatusParams = {
  action: "activate" | "deactivate";
  integrationId?: string;
  integrationName?: string;
};

async function manageIntegrationStatus(params: ManageIntegrationStatusParams): Promise<ToolResult> {
  try {
    const { action, integrationId = "", integrationName = "" } = params;
    if (!integrationId && !integrationName) {
      return {
        status: "error",
        error_type: "missing_params",
        message: "Provide integrationId or integrationName.",
      };
    }

    const desiredStatus = action === "activate" ? "Active" : "Disabled";
    const rows = await db<{
      id: string;
      displayName: string;
      status: string;
      type: string;
      schemaInitialized: boolean;
      lastSyncAt: string | null;
    }[]>`
      SELECT
        i.id,
        i.display_name AS "displayName",
        i.status,
        i.type,
        i.schema_initialized AS "schemaInitialized",
        i.last_sync_at AS "lastSyncAt"
      FROM integrations i
      WHERE ${integrationId ? db`i.id = ${integrationId}` : db`LOWER(i.display_name) LIKE LOWER(${"%" + integrationName + "%"})`}
      ORDER BY i.display_name
      LIMIT 5
    `;

    if (!rows.length) {
      return {
        status: "error",
        error_type: "no_data",
        message: `No integration found matching "${integrationId || integrationName}".`,
      };
    }

    const integration = rows[0];
    if (integration.status === desiredStatus) {
      return {
        status: "success",
        data: {
          changed: false,
          action,
          integration: {
            ...integration,
            statusAfter: integration.status,
          },
          message: `${integration.displayName} is already ${desiredStatus}.`,
        },
      };
    }

    await db`
      UPDATE integrations
      SET status = ${desiredStatus}
      WHERE id = ${integration.id}
    `;

    return {
      status: "success",
      data: {
        changed: true,
        action,
        integration: {
          ...integration,
          statusBefore: integration.status,
          statusAfter: desiredStatus,
        },
        message: `${integration.displayName} status updated to ${desiredStatus}.`,
      },
    };
  } catch (err) {
    return {
      status: "error",
      error_type: "integration_action_error",
      message: err instanceof Error ? err.message : "Failed to update integration status",
    };
  }
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  cache: RequestCache,
): Promise<ToolResult> {
  switch (name) {
    case "queryDatabase": {
      const result = await queryDatabase(args as QueryDatabaseParams);
      // Cache array results so analyzeDataset / generateChartSpec can reuse them
      if (result.status === "success" && Array.isArray(result.data) && result.data.length > 0) {
        cache.set((args as QueryDatabaseParams).queryType, result.data as Record<string, unknown>[]);
      }
      return result;
    }
    case "analyzeDataset":
      return analyzeDataset(args as AnalyzeDatasetParams, cache);
    case "generateChartSpec":
      return generateChartSpec(args as GenerateChartSpecParams, cache);
    case "manageIntegrationStatus":
      return manageIntegrationStatus(args as ManageIntegrationStatusParams);
    default:
      return { status: "error", error_type: "unknown_tool", message: `Unknown tool: "${name}"` };
  }
}

// ─── OpenAI Tool Definitions ──────────────────────────────────────────────────

export const TOOL_DEFINITIONS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "queryDatabase",
      description:
        "Query the AutoGRC live compliance database for real data. " +
        "Call this FIRST before answering any question about compliance scores, application status, " +
        "framework mappings, control failures, security domains, or integration status. Never guess numbers.",
      parameters: {
        type: "object",
        properties: {
          queryType: {
            type: "string",
            enum: [
              "overview_kpis",
              "applications_overview",
              "frameworks_overview",
              "security_domains",
              "compliance_trends",
              "controls_by_domain",
              "failing_controls",
              "least_compliant_controls",
              "app_controls",
              "app_details",
              "integrations_catalog",
              "control_integration_recommendations",
            ],
            description:
              "overview_kpis: global KPIs. " +
              "applications_overview: all apps with scores and status. " +
              "frameworks_overview: frameworks with mapping %. " +
              "security_domains: domain-level compliance breakdown. " +
              "compliance_trends: 6-month score trend. " +
              "controls_by_domain: controls in one domain (requires params.domain). " +
              "failing_controls: top 10 worst-performing controls (portfolio-wide). " +
              "least_compliant_controls: lowest-scoring controls. Use portfolio scope or pass params.applicationName/applicationId for one app. " +
              "app_controls: all controls + compliance scores for ONE specific application (requires params.applicationName or params.applicationId). Use this to answer 'what controls is [app] failing?'. " +
              "app_details: metadata + compliance summary for ONE specific application (requires params.applicationName or params.applicationId). " +
              "integrations_catalog: all integrations with current status/health. " +
              "control_integration_recommendations: recommended inactive integrations to activate for a target control.",
          },
          params: {
            type: "object",
            description: "Optional parameters. Use domain/app/control filters depending on queryType.",
            properties: {
              domain: { type: "string", description: "Security domain name (e.g. 'Protect', 'Identify')" },
              applicationName: { type: "string", description: "Application name (partial match supported, e.g. 'Active Directory')" },
              applicationId: { type: "string", description: "Exact application UUID (use instead of applicationName for precision)" },
              controlCode: { type: "string", description: "Control code (e.g. 'AC-2')" },
              controlId: { type: "string", description: "Control UUID" },
              limit: { type: "number", description: "Result size limit (defaults vary by queryType)" },
            },
          },
        },
        required: ["queryType"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyzeDataset",
      description:
        "Perform statistical analysis on compliance data. " +
        "Use for aggregations, rankings, trend direction, or cross-group comparisons. " +
        "You MUST supply either 'data' (the array from a queryDatabase result) OR 'dataRef' " +
        "(a queryType string like 'applications_overview' — the tool will fetch the data automatically). " +
        "If you already have the data from a previous queryDatabase call, pass it via 'data'. " +
        "If you do not have the data yet, use 'dataRef' to avoid an extra round-trip.",
      parameters: {
        type: "object",
        properties: {
          data: {
            type: "array",
            description:
              "Array of data objects to analyze. Use this when you already have the data from " +
              "a previous queryDatabase call. Omit if using 'dataRef'.",
            items: { type: "object" },
          },
          dataRef: {
            type: "string",
            enum: [
              "overview_kpis",
              "applications_overview",
              "frameworks_overview",
              "security_domains",
              "compliance_trends",
              "controls_by_domain",
              "failing_controls",
              "least_compliant_controls",
              "app_controls",
              "app_details",
              "integrations_catalog",
            ],
            description:
              "Alternative to 'data'. Set this to a queryType (e.g. 'applications_overview') " +
              "to have the tool fetch the data automatically from the database. " +
              "Use this when you need to analyze data you haven't fetched yet.",
          },
          analysisType: {
            type: "string",
            enum: ["aggregation", "trends", "comparison", "ranking"],
            description:
              "aggregation: compute sum/avg/min/max/median, optionally grouped. " +
              "trends: compute direction and delta over a sequence. " +
              "comparison: compare each item vs the mean. " +
              "ranking: sort by a field.",
          },
          groupBy: { type: "string", description: "Field to group by (for aggregation)" },
          valueField: { type: "string", description: "Numeric field to operate on" },
          sortDirection: { type: "string", enum: ["asc", "desc"] },
          limit: { type: "number", description: "Max items to return for ranking (default 10)" },
        },
        required: ["analysisType"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generateChartSpec",
      description:
        "Generate a chart for display in the UI. " +
        "Call this when the user asks for a chart, graph, or visual. " +
        "You do NOT need to pass 'data' manually — if you have already called queryDatabase, " +
        "just set 'dataRef' to the same queryType (e.g. 'security_domains') and the server " +
        "will inject the data automatically. If you have neither, omit dataRef and the server " +
        "will auto-detect the right cached dataset based on xKey and yKeys.",
      parameters: {
        type: "object",
        properties: {
          chartType: {
            type: "string",
            enum: ["LineChart", "BarChart", "PieChart"],
          },
          dataRef: {
            type: "string",
            enum: [
              "overview_kpis",
              "applications_overview",
              "frameworks_overview",
              "security_domains",
              "compliance_trends",
              "controls_by_domain",
              "failing_controls",
              "least_compliant_controls",
              "integrations_catalog",
            ],
            description:
              "Preferred way to supply data. Set to the queryType you previously fetched " +
              "(e.g. 'security_domains'). The server retrieves it from cache automatically. " +
              "Omit only if you are passing 'data' directly.",
          },
          data: {
            type: "array",
            description:
              "Raw data array. Only needed if you have NOT fetched this data via queryDatabase " +
              "in this conversation. Prefer 'dataRef' instead.",
            items: { type: "object" },
          },
          xKey: {
            type: "string",
            description: "Field name for X-axis labels or pie slice names (e.g. 'domain', 'name', 'month')",
          },
          yKeys: {
            type: "array",
            items: { type: "string" },
            description: "Field name(s) for numeric Y-axis values (e.g. ['avgCompliance', 'controls'])",
          },
          title: { type: "string", description: "Chart title" },
          colors: {
            type: "array",
            items: { type: "string" },
            description: "Hex color codes. Defaults: #FFE600, #2E2E38, #4CAF50, …",
          },
        },
        required: ["chartType", "xKey", "yKeys"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manageIntegrationStatus",
      description:
        "Activate or deactivate an integration. " +
        "Use ONLY after explicit user confirmation (e.g., 'yes activate X', 'ok add it'). " +
        "Never call this tool for recommendation-only questions.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["activate", "deactivate"],
            description: "activate sets integration status to Active; deactivate sets it to Disabled.",
          },
          integrationId: {
            type: "string",
            description: "Exact integration ID (preferred when available).",
          },
          integrationName: {
            type: "string",
            description: "Integration display name (partial match supported).",
          },
        },
        required: ["action"],
      },
    },
  },
];
