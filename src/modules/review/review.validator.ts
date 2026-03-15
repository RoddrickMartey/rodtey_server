import { z } from 'zod';

export const createReviewSchema = z.object({
  productId: z.string({ error: 'Product id is required' }).uuid('Invalid product id'),

  rating: z
    .number({ error: 'Rating is required' })
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),

  comment: z.string().max(500, 'Comment must be at most 500 characters').trim().optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
