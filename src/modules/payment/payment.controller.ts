import { Request, Response } from 'express';
import paystack from '../../config/paystack.js';
import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { initializePaymentSchema } from './payment.validator.js';
import { emitToUser } from '../../socket/index.js';

const PLATFORM_FEE = 0.1;

// ─── helper — confirm order + create payouts + emit ─────
const confirmOrderAndPayout = async (
  orderId: string,
  order: {
    buyerId: string;
    items: {
      quantity: number;
      price: unknown;
      product: { vendorId: string; vendor: { userId: string } };
    }[];
  },
) => {
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
    });

    const vendorTotals = new Map<string, number>();
    for (const item of order.items) {
      const vendorId = item.product.vendorId;
      const current = vendorTotals.get(vendorId) || 0;
      vendorTotals.set(vendorId, current + Number(item.price) * item.quantity);
    }

    await Promise.all(
      Array.from(vendorTotals.entries()).map(([vendorId, amount]) =>
        tx.payout.create({
          data: {
            vendorId,
            orderId,
            amount: amount * (1 - PLATFORM_FEE),
            status: 'PENDING',
          },
        }),
      ),
    );
  });

  // notify buyer payment was confirmed
  emitToUser(order.buyerId, 'notification:payment', {
    type: 'PAYMENT_CONFIRMED',
    orderId,
    message: 'Your payment was confirmed and order is being processed',
  });

  // notify each vendor a payout is pending
  const vendorUserIds = new Set(order.items.map((i) => i.product.vendor.userId));
  vendorUserIds.forEach((vendorUserId) => {
    emitToUser(vendorUserId, 'notification:payment', {
      type: 'PAYOUT_PENDING',
      orderId,
      message: 'A payout is pending for your store',
    });
  });
};

// ─── Initialize payment ──────────────────────────────────
export const initializePayment = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { orderId, callbackUrl } = initializePaymentSchema.parse(req.body);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { buyer: { select: { email: true } } },
  });

  if (!order) throw new AppError('Order not found', 404);
  if (order.buyerId !== userId) throw new AppError('Forbidden', 403);
  if (order.status !== 'PENDING') throw new AppError('Order is not payable', 400);

  if (order.paymentReference) {
    return res.json({
      success: true,
      data: { reference: order.paymentReference },
    });
  }

  const response = await paystack.post('/transaction/initialize', {
    email: order.buyer.email,
    amount: Math.round(Number(order.total) * 100),
    currency: 'GHS',
    reference: `rodtey_${order.id}_${Date.now()}`,
    callback_url: callbackUrl,
    metadata: { orderId: order.id, userId },
  });

  const { reference, authorization_url } = response.data.data;

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentReference: reference },
  });

  return res.json({
    success: true,
    data: { authorizationUrl: authorization_url, reference },
  });
};

// ─── Verify payment ──────────────────────────────────────
export const verifyPayment = async (req: Request, res: Response) => {
  const { reference } = req.params as { reference: string };

  const response = await paystack.get(`/transaction/verify/${reference}`);
  const transaction = response.data.data;

  if (transaction.status !== 'success') {
    throw new AppError('Payment not successful', 400);
  }

  const orderId = transaction.metadata.orderId;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              vendorId: true,
              vendor: { select: { userId: true } },
            },
          },
        },
      },
    },
  });

  if (!order) throw new AppError('Order not found', 404);

  if (order.status === 'CONFIRMED') {
    return res.json({ success: true, message: 'Order already confirmed' });
  }

  await confirmOrderAndPayout(orderId, order);

  return res.json({ success: true, message: 'Payment confirmed' });
};

// ─── Paystack webhook ────────────────────────────────────
export const paystackWebhook = async (req: Request, res: Response) => {
  const secret = process.env.PAYSTACK_SECRET_KEY as string;

  const crypto = await import('crypto');
  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    throw new AppError('Invalid webhook signature', 400);
  }

  const event = req.body as {
    event: string;
    data: { reference: string; metadata: { orderId: string } };
  };

  if (event.event === 'charge.success') {
    const orderId = event.data.metadata.orderId;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                vendorId: true,
                vendor: { select: { userId: true } },
              },
            },
          },
        },
      },
    });

    if (!order || order.status === 'CONFIRMED') {
      return res.json({ received: true });
    }

    await confirmOrderAndPayout(orderId, order);
  }

  return res.json({ received: true });
};

// ─── Get my payouts (vendor) ─────────────────────────────
export const getMyPayouts = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new AppError('Store not found', 404);

  const [payouts, total] = await prisma.$transaction([
    prisma.payout.findMany({
      where: { vendorId: vendor.id },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        order: { select: { id: true, total: true, createdAt: true } },
      },
    }),
    prisma.payout.count({ where: { vendorId: vendor.id } }),
  ]);

  res.json({
    success: true,
    data: payouts,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
};
