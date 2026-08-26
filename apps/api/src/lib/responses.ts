import type { Response } from "express";
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function ok<T>(res: Response, data: T): Response {
  return res.status(200).json({ data });
}

export function created<T>(res: Response, data: T): Response {
  return res.status(201).json({ data });
}

export function accepted<T>(res: Response, data: T): Response {
  return res.status(202).json({ data });
}

export function collection<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
): Response {
  return res.status(200).json({ data, meta: { pagination } });
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}
