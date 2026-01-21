// lib/automations.types.ts

export interface Automation {
  id: string
  name: string
  description: string | null
  controlId: string
  controlCode: string
  controlTitle: string
  applyScope: "AllApplications" | "ByApplicability" | "SelectedApplications"
  applicabilityIds: string[] | null
  applicationIds: string[] | null
  sqlText: string
  sourceIntegrations: string[] | null
  answerPass: string
  answerFail: string
  createdAt: string
  lastRunAt: string | null
  lastRunStatus: "Running" | "Success" | "Failed" | null
  totalRuns: number
  successfulRuns: number
  failedRuns: number
}

export interface AutomationRun {
  id: string
  automationId: string
  triggeredBy: "Manual" | "Schedule"
  startedAt: string
  finishedAt: string | null
  status: "Running" | "Success" | "Failed"
  errorMessage: string | null
  appsProcessed: number | null
}

export interface ControlOption {
  id: string
  controlCode: string
  title: string
  statement: string | null
  frameworkName: string
}

export interface ApplicabilityCategoryOption {
  id: string
  name: string
  description: string | null
}

export interface ApplicationOption {
  id: string
  name: string
  primaryUrl: string | null
  criticality: string
}

export interface IntegrationTableOption {
  integrationId: string
  integrationName: string
  tableName: string
}

export interface TableColumn {
  columnName: string
  dataType: string
  isNullable: boolean
}

// Query Builder Types
export interface QueryBuilderState {
  fromTable: string
  fromAlias: string
  joins: QueryJoin[]
  selectColumns: QuerySelect[]
  whereConditions: QueryCondition[]
  groupByColumns: string[]
  havingConditions: QueryCondition[]
  orderByColumns: QueryOrderBy[]
}

export interface QueryJoin {
  id: string
  type: "INNER" | "LEFT" | "RIGHT"
  table: string
  alias: string
  onLeft: string // e.g., "a.id"
  onRight: string // e.g., "s.application_id"
}

export interface QuerySelect {
  id: string
  expression: string // e.g., "a.id", "s.host", "BOOL_AND(s.supports_tls_1_3)"
  alias: string // e.g., "application_id", "host", "supports_tls_1_3"
  aggregate: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX" | "BOOL_AND" | "BOOL_OR" | "STRING_AGG" | null
}

export interface QueryCondition {
  id: string
  logic: "AND" | "OR"
  left: string // column or expression
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "ILIKE" | "IN" | "NOT IN" | "IS NULL" | "IS NOT NULL"
  right: string // value or expression
}

export interface QueryOrderBy {
  id: string
  column: string
  direction: "ASC" | "DESC"
}

export interface QueryPreviewResult {
  columns: string[]
  rows: Record<string, any>[]
  rowCount: number
  hasApplicationId: boolean
  error: string | null
}