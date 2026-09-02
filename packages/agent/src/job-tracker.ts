export type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export interface AgentJob {
  id: string;
  caseId: string;
  type: string;
  status: JobStatus;
  progress: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AgentJobEvent {
  jobId: string;
  type: string;
  message: string;
  detail?: Record<string, unknown>;
  createdAt: string;
}

export class AgentJobTracker {
  private static instance: AgentJobTracker;
  private jobs: Map<string, AgentJob> = new Map();
  private events: Map<string, AgentJobEvent[]> = new Map();

  public static getInstance(): AgentJobTracker {
    if (!AgentJobTracker.instance) {
      AgentJobTracker.instance = new AgentJobTracker();
    }
    return AgentJobTracker.instance;
  }

  public createJob(jobId: string, caseId: string, type = "RECOVERY_ANALYSIS"): AgentJob {
    const job: AgentJob = {
      id: jobId,
      caseId,
      type,
      status: "RUNNING",
      progress: 10,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    this.jobs.set(jobId, job);
    this.events.set(jobId, []);
    this.addJobEvent(jobId, "JOB_STARTED", `Started agent recovery analysis for case ${caseId}`);
    return job;
  }

  public addJobEvent(jobId: string, eventType: string, message: string, detail?: Record<string, unknown>): void {
    const list = this.events.get(jobId) || [];
    const event: AgentJobEvent = {
      jobId,
      type: eventType,
      message,
      detail,
      createdAt: new Date().toISOString(),
    };
    list.push(event);
    this.events.set(jobId, list);
  }

  public updateJobStatus(jobId: string, status: JobStatus, progress: number): AgentJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;

    job.status = status;
    job.progress = Math.min(Math.max(progress, 0), 100);
    if (status === "SUCCEEDED" || status === "FAILED" || status === "CANCELLED") {
      job.completedAt = new Date().toISOString();
    }
    this.jobs.set(jobId, job);
    return job;
  }

  public getJob(jobId: string): AgentJob | undefined {
    return this.jobs.get(jobId);
  }

  public getJobEvents(jobId: string): AgentJobEvent[] {
    return this.events.get(jobId) || [];
  }
}

export const agentJobTracker = AgentJobTracker.getInstance();
