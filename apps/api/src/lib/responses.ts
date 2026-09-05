import type { Response } from "express";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type JsonPrimitive = string | number | boolean | null | undefined;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export function jsonSafe<T>(value: T): any {
  if (value === undefined || value === null) return value;
  return JSON.parse(
    JSON.stringify(value, (_k, v) =>
      typeof v === "bigint" ? Number(v) : v,
    ),
  );
}

export function payloadRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function ok<T>(res: Response, data: T): Response {
  return res.status(200).json({ data: jsonSafe(data) });
}

export function created<T>(res: Response, data: T): Response {
  return res.status(201).json({ data: jsonSafe(data) });
}

export function accepted<T>(res: Response, data: T): Response {
  return res.status(202).json({ data: jsonSafe(data) });
}

export function collection<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
): Response {
  return res.status(200).json({ data: jsonSafe(data), meta: { pagination } });
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}
