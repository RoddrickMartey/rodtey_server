import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string({ error: 'Product id is required' }).uuid('Invalid product id'),
        quantity: z
          .number({ error: 'Quantity is required' })
          .int('Quantity must be a whole number')
          .min(1, 'Quantity must be at least 1'),
      }),
    )
    .min(1, 'Order must have at least one item'),

  shippingAddress: z.object({
    fullName: z.string({ error: 'Full name is required' }).trim(),
    phone: z.string({ error: 'Phone is required' }).trim(),
    address: z.string({ error: 'Address is required' }).trim(),
    city: z.string({ error: 'City is required' }).trim(),
    country: z.string({ error: 'Country is required' }).trim(),
  }),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
