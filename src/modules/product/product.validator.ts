import { z } from 'zod';

export const createProductSchema = z.object({
  name: z
    .string({ error: 'Product name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim(),

  description: z
    .string({ error: 'Description is required' })
    .min(10, 'Description must be at least 10 characters')
    .trim(),

  price: z.number({ error: 'Price is required' }).positive('Price must be a positive number'),

  stock: z
    .number()
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative')
    .default(0),

  categoryId: z.string({ error: 'Category is required' }).uuid('Invalid category id'),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
