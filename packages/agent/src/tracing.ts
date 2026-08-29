export interface TracingConfig {
  enabled: boolean;
  apiKey?: string;
  project?: string;
  endpoint?: string;
  environment?: string;
}

export function loadTracingConfig(): TracingConfig {
  const apiKey = process.env.LANGSMITH_API_KEY;
  const enabled =
    process.env.LANGSMITH_TRACING === "true" &&
    Boolean(apiKey) &&
    apiKey !== "dummy";
  if (!enabled) return { enabled: false };
  if (apiKey) process.env.LANGSMITH_API_KEY = apiKey;
  const project = process.env.LANGSMITH_PROJECT ?? "ai-revenue-recovery";
  if (project) process.env.LANGSMITH_PROJECT = project;
  const endpoint = process.env.LANGSMITH_ENDPOINT;
  if (endpoint) process.env.LANGSMITH_ENDPOINT = endpoint;
  const environment =
    process.env.LANGSMITH_ENVIRONMENT ?? process.env.NODE_ENV ?? "development";
  return { enabled: true, apiKey, project, endpoint, environment };
}

export const TRACING_CONFIG = loadTracingConfig();

export function tracingTags(input: {
  caseId: string;
  runId: string;
  actor?: string;
}): Record<string, string> {
  const tags: Record<string, string> = {
    case_id: input.caseId,
    run_id: input.runId,
    component: "agent-runner",
    environment: TRACING_CONFIG.environment ?? "development",
  };
  if (input.actor) tags.actor = input.actor;
  return tags;
}

export function tracingMetadata(input: {
  caseId: string;
  runId: string;
  project?: string;
}): Record<string, string> {
  return {
    case_id: input.caseId,
    run_id: input.runId,
    project: input.project ?? TRACING_CONFIG.project ?? "ai-revenue-recovery",
  };
}
