import { Router } from "express";
import { auditService } from "@recovery/audit";
import { caseLifecycle } from "@recovery/case-lifecycle";
import {
  listAuditEventsQuerySchema,
  listCaseAuditEventsQuerySchema,
} from "@recovery/validation";
import { ApiError } from "../lib/errors.js";
import { asyncHandler } from "../lib/async-handler.js";
import { okCollection } from "../lib/responses.js";

export const auditRouter = Router();

auditRouter.get(
  "/audit-events",
  asyncHandler(async (req, res) => {
    const parsed = listAuditEventsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest(
        "VALIDATION_ERROR",
        "Invalid audit-events query.",
        {
          fieldErrors: parsed.error.issues.map((i) => ({
            path: i.path.join(".") || "(root)",
            message: i.message,
          })),
        },
      );
    }
    const f = parsed.data;
    const rows = await auditService.list({
      caseId: f.caseId,
      actions: f.actions,
      actor: f.actor,
      from: f.from,
      to: f.to,
      limit: f.limit,
      offset: f.offset,
    });
    okCollection(res, rows, {
      page: f.page,
      limit: f.limit,
      total: rows.length,
      totalPages: 1,
    });
  }),
);

auditRouter.get(
  "/recovery-cases/:caseId/audit-events",
  asyncHandler(async (req, res) => {
    const caseId = String(req.params.caseId);
    const parsed = listCaseAuditEventsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw ApiError.badRequest(
        "VALIDATION_ERROR",
        "Invalid case audit-events query.",
        {
          fieldErrors: parsed.error.issues.map((i) => ({
            path: i.path.join(".") || "(root)",
            message: i.message,
          })),
        },
      );
    }
    const exists = await caseLifecycle.findByIdOrNull(caseId);
    if (!exists) {
      throw ApiError.notFound(
        "CASE_NOT_FOUND",
        `Recovery case ${caseId} not found.`,
      );
    }
    const f = parsed.data;
    const rows = await auditService.list({
      caseId,
      limit: f.limit,
      offset: f.offset,
    });
    okCollection(res, rows, {
      page: f.page,
      limit: f.limit,
      total: rows.length,
      totalPages: 1,
    });
  }),
);
