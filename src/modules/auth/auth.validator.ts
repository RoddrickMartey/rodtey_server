import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters')
    .trim(),

  email: z.email('Invalid email address').toLowerCase().trim(),

  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  role: z.enum(['USER', 'VENDOR']).default('USER'),
});

export const loginSchema = z.object({
  email: z.email('Invalid email address').toLowerCase().trim(),

  password: z.string({ error: 'Password is required' }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
