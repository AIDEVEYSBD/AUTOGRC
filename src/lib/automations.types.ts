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
  
  // New percentage-based system
  answerTemplate: string | null
  
  // Legacy fields (for backward compatibility)
  answerPass: string | null
  answerFail: string | null
  
  createdAt: string
  lastRunAt: string | null
  lastRunStatus: string | null
  totalRuns: number
  successfulRuns: number
}

export interface AutomationRun {
  id: string
  automationId: string
  triggeredBy: string
  status: string
  startedAt: string
  finishedAt: string | null
  errorMessage: string | null
}

export interface ControlOption {
  id: string
  controlCode: string
  title: string
  statement: string | null
}

export interface ApplicabilityCategoryOption {
  id: string
  name: string
  description: string | null
}

export interface ApplicationOption {
  id: string
  name: string
  primaryUrl: string
  criticality: string
}

export interface IntegrationTableOption {
  tableName: string
  integrationName: string
  description: string | null
}

export interface TableColumn {
  columnName: string
  dataType: string
  isNullable: boolean
}

export interface QueryPreviewResult {
  columns: string[]
  rows: Record<string, any>[]
  rowCount: number
  hasApplicationId: boolean
  hasCompliancePercentage: boolean
  previewData: {
    averageCompliance: number
    predictedStatus: string
    // FIX: Added rowCounts object to resolve TS2339 error
    rowCounts: {
      totalRows: number
      compliantRows: number
      partialGapRows: number
      nonCompliantRows: number
    }
    thresholdInfo: {
      compliant: string
      partial_gap: string
      not_compliant: string
    }
  } | null
  error: string | null
}

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
  onLeft: string
  onRight: string
}

export interface QuerySelect {
  id: string
  expression: string
  alias: string
  aggregate: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX" | "BOOL_AND" | "BOOL_OR" | "STRING_AGG" | null
}

export interface QueryCondition {
  id: string
  logic: "AND" | "OR"
  left: string
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "ILIKE" | "IN" | "NOT IN" | "IS NULL" | "IS NOT NULL"
  right: string
}

export interface QueryOrderBy {
  id: string
  column: string
  direction: "ASC" | "DESC"
}