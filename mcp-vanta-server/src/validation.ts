import { z } from "zod";

const safeId = z
  .string()
  .min(1)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid ID format");

const paginationFields = {
  pageSize: z.number().int().min(1).max(500).optional(),
  pageCursor: z.string().optional(),
};

export const ListFailingTestsSchema = z.object({
  categoryFilter: z.string().optional(),
  frameworkFilter: z.string().optional(),
  ...paginationFields,
});

export const GetTestDetailsSchema = z.object({
  testId: safeId,
});

export const ListAffectedAssetsSchema = z.object({
  testId: safeId,
  ...paginationFields,
});

export const SuggestRemediationSchema = z.object({
  testId: safeId,
});
