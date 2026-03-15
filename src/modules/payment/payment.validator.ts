import { z } from 'zod';

export const initializePaymentSchema = z.object({
  orderId: z.string({ error: 'Order id is required' }).uuid('Invalid order id'),
  callbackUrl: z.string({ error: 'Callback url is required' }).url('Invalid callback url'),
});

export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;
