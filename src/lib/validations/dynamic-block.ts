import { z } from 'zod/v4';

export const dynamicBlockCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  placement: z.enum(['start', 'end']),
});

export type DynamicBlockCreateInput = z.infer<typeof dynamicBlockCreateSchema>;

export const dynamicBlockUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  content: z
    .object({ type: z.literal('doc'), content: z.array(z.unknown()) })
    .optional()
    .nullable(),
  placement: z.enum(['start', 'end']),
  status: z.enum(['draft', 'published']),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(-1000).max(1000),
  categoryIds: z.array(z.string().uuid()).max(100),
  tagIds: z.array(z.string().uuid()).max(100),
  articleIds: z.array(z.string().uuid()).max(100),
});

export type DynamicBlockUpdateInput = z.infer<typeof dynamicBlockUpdateSchema>;
