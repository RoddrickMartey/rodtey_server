import { z } from 'zod';

export const createVendorSchema = z.object({
  storeName: z
    .string({ error: 'Store name is required' })
    .min(2, 'Store name must be at least 2 characters')
    .max(50, 'Store name must be at most 50 characters')
    .trim(),

  description: z.string().max(500, 'Description must be at most 500 characters').trim().optional(),
});

export const updateVendorSchema = z.object({
  storeName: z
    .string()
    .min(2, 'Store name must be at least 2 characters')
    .max(50, 'Store name must be at most 50 characters')
    .trim()
    .optional(),

  description: z.string().max(500, 'Description must be at most 500 characters').trim().optional(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
