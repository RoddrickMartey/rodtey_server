import { Request, Response } from 'express';
import prisma from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { createOrderSchema, updateOrderStatusSchema } from './order.validator.js';
import { emitToUser } from '../../socket/index.js';
import { paginate } from '../../utils/paginate.js';

// ─── Create order ────────────────────────────────────────
export const createOrder = async (req: Request, res: Response) => {
  const buyerId = req.user!.userId;
  const { items, shippingAddress } = createOrderSchema.parse(req.body);

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true, name: true, price: true, stock: true },
  });

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new AppError('Product not found', 404);
    if (product.stock < item.quantity) {
      throw new AppError(`Not enough stock for "${product.name}"`, 400);
    }
  }

  const total = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)!;
    return sum + Number(product.price) * item.quantity;
  }, 0);

  const order = await prisma.$transaction(
    async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          buyerId,
          total,
          shippingAddress,
          items: {
            create: items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                price: product.price,
              };
            }),
          },
        },
        select: {
          id: true,
          total: true,
          status: true,
          shippingAddress: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: { take: 1, select: { url: true } },
                  vendor: { select: { userId: true } },
                },
              },
            },
          },
        },
      });

      // safe parameterized raw queries — no injection possible
      await Promise.all(
        items.map(
          (item) =>
            tx.$executeRaw`
      UPDATE products
      SET stock = stock - ${item.quantity}
      WHERE id::text = ${item.productId}
      AND stock >= ${item.quantity}
    `,
        ),
      );

      return newOrder;
    },
    { timeout: 15000 },
  );

  const vendorUserIds = new Set(order.items.map((i) => i.product.vendor.userId));
  vendorUserIds.forEach((vendorUserId) => {
    emitToUser(vendorUserId, 'notification:order', {
      type: 'NEW_ORDER',
      orderId: order.id,
      message: 'You have a new order',
    });
  });

  res.status(201).json({ success: true, data: order });
};

// ─── Get my orders (buyer) ───────────────────────────────
export const getMyOrders = async (req: Request, res: Response) => {
  const buyerId = req.user!.userId;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { buyerId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            product: {
              select: {
                name: true,
                slug: true,
                images: { take: 1, select: { url: true } },
              },
            },
          },
        },
      },
    }),
    prisma.order.count({ where: { buyerId } }),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: paginate(total, page, limit),
  });
};

// ─── Get single order ────────────────────────────────────
export const getOrderById = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params as { id: string };

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      total: true,
      status: true,
      shippingAddress: true,
      paymentReference: true,
      createdAt: true,
      updatedAt: true,
      buyer: { select: { id: true, name: true, email: true } },
      items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: { take: 1, select: { url: true } },
              vendor: { select: { id: true, storeName: true } },
            },
          },
        },
      },
    },
  });

  if (!order) throw new AppError('Order not found', 404);
  const isOwner = order.buyer.id === userId;
  const isVendor = await prisma.vendor.findFirst({
    where: {
      userId,
      products: { some: { orderItems: { some: { orderId: id } } } },
    },
  });

  if (!isOwner && !isVendor) throw new AppError('Forbidden', 403);

  res.json({ success: true, data: order });
};

// ─── Get vendor orders ───────────────────────────────────
export const getVendorOrders = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new AppError('Store not found', 404);

  const where = {
    items: { some: { product: { vendorId: vendor.id } } },
    ...(status && { status: status as never }),
  };

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        shippingAddress: true,
        buyer: { select: { name: true, email: true } },
        items: {
          where: { product: { vendorId: vendor.id } },
          select: {
            id: true,
            quantity: true,
            price: true,
            product: {
              select: {
                name: true,
                images: { take: 1, select: { url: true } },
              },
            },
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: paginate(total, page, limit),
  });
};

// ─── Update order status (vendor) ───────────────────────
export const updateOrderStatus = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params as { id: string };
  const { status } = updateOrderStatusSchema.parse(req.body);

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new AppError('Store not found', 404);

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });

  if (!order) throw new AppError('Order not found', 404);

  const ownsProduct = order.items.some((item) => item.product.vendorId === vendor.id);
  if (!ownsProduct) throw new AppError('Forbidden', 403);

  if (order.status === 'CANCELLED') throw new AppError('Cannot update a cancelled order', 400);
  if (order.status === 'DELIVERED') throw new AppError('Cannot update a delivered order', 400);

  const updated = await prisma.order.update({
    where: { id },
    data: { status },
    select: { id: true, status: true, updatedAt: true },
  });

  // notify buyer that their order status changed
  emitToUser(order.buyerId, 'notification:order', {
    type: 'STATUS_UPDATE',
    orderId: order.id,
    status: updated.status,
    message: `Your order has been ${updated.status.toLowerCase()}`,
  });

  res.json({ success: true, data: updated });
};

// ─── Cancel order (buyer) ────────────────────────────────
export const cancelOrder = async (req: Request, res: Response) => {
  const buyerId = req.user!.userId;
  const { id } = req.params as { id: string };

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: { select: { vendorId: true, vendor: { select: { userId: true } } } },
        },
      },
    },
  });

  if (!order) throw new AppError('Order not found', 404);
  if (order.buyerId !== buyerId) throw new AppError('Forbidden', 403);
  if (order.status !== 'PENDING') {
    throw new AppError('Only pending orders can be cancelled', 400);
  }

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      order.items.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        }),
      ),
    );

    await tx.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  });

  // notify each vendor that the order was cancelled
  const vendorUserIds = new Set(order.items.map((i) => i.product.vendor.userId));
  vendorUserIds.forEach((vendorUserId) => {
    emitToUser(vendorUserId, 'notification:order', {
      type: 'CANCELLED',
      orderId: order.id,
      message: 'An order has been cancelled',
    });
  });

  res.json({ success: true, message: 'Order cancelled' });
};
