import { Request, Response } from 'express';
import { AppError } from '../../utils/AppError.js';
import { uploadImage, uploadImages, deleteImage } from '../../utils/uploadImage.js';
import { singleUploadSchema, multipleUploadSchema } from './upload.validator.js';
import prisma from '../../config/prisma.js';

// ─── Upload single image ─────────────────────────────────
export const uploadSingleImage = async (req: Request, res: Response) => {
  const { base64, type, refId, altText } = singleUploadSchema.parse(req.body);
  const userId = req.user!.userId;

  switch (type) {
    case 'avatar': {
      if (refId !== userId) throw new AppError('Forbidden', 403);

      const existing = await prisma.image.findUnique({ where: { userId: refId } });
      if (existing) {
        await deleteImage(existing.publicId);
        await prisma.image.delete({ where: { id: existing.id } });
      }

      const { url, publicId } = await uploadImage(base64, 'rodtey/avatars');
      const image = await prisma.image.create({
        data: { url, publicId, altText, userId: refId },
        select: { id: true, url: true, publicId: true },
      });

      return res.status(201).json({ success: true, data: image });
    }

    case 'vendor_logo': {
      const vendor = await prisma.vendor.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!vendor || vendor.id !== refId) throw new AppError('Forbidden', 403);

      const existing = await prisma.image.findUnique({ where: { vendorLogoId: refId } });
      if (existing) {
        await deleteImage(existing.publicId);
        await prisma.image.delete({ where: { id: existing.id } });
      }

      const { url, publicId } = await uploadImage(base64, 'rodtey/vendors/logos');
      const image = await prisma.image.create({
        data: { url, publicId, altText, vendorLogoId: refId },
        select: { id: true, url: true, publicId: true },
      });

      return res.status(201).json({ success: true, data: image });
    }

    case 'vendor_banner': {
      const vendor = await prisma.vendor.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!vendor || vendor.id !== refId) throw new AppError('Forbidden', 403);

      const existing = await prisma.image.findUnique({ where: { vendorBannerId: refId } });
      if (existing) {
        await deleteImage(existing.publicId);
        await prisma.image.delete({ where: { id: existing.id } });
      }

      const { url, publicId } = await uploadImage(base64, 'rodtey/vendors/banners');
      const image = await prisma.image.create({
        data: { url, publicId, altText, vendorBannerId: refId },
        select: { id: true, url: true, publicId: true },
      });

      return res.status(201).json({ success: true, data: image });
    }

    case 'category': {
      if (req.user!.role !== 'ADMIN') throw new AppError('Forbidden', 403);

      const existing = await prisma.image.findUnique({ where: { categoryId: refId } });
      if (existing) {
        await deleteImage(existing.publicId);
        await prisma.image.delete({ where: { id: existing.id } });
      }

      const { url, publicId } = await uploadImage(base64, 'rodtey/categories');
      const image = await prisma.image.create({
        data: { url, publicId, altText, categoryId: refId },
        select: { id: true, url: true, publicId: true },
      });

      return res.status(201).json({ success: true, data: image });
    }

    default:
      throw new AppError('Invalid upload type for single upload', 400);
  }
};

// ─── Upload multiple images (products only) ──────────────
export const uploadMultipleImages = async (req: Request, res: Response) => {
  const { images, type, refId } = multipleUploadSchema.parse(req.body);
  const userId = req.user!.userId;

  if (type !== 'product') {
    throw new AppError('Multiple uploads are only allowed for products', 400);
  }

  const product = await prisma.product.findUnique({
    where: { id: refId },
    select: { vendorId: true },
  });
  if (!product) throw new AppError('Product not found', 404);

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor || product.vendorId !== vendor.id) throw new AppError('Forbidden', 403);

  // check total images won't exceed 5
  const existingCount = await prisma.image.count({ where: { productId: refId } });
  if (existingCount + images.length > 5) {
    throw new AppError(
      `Cannot add ${images.length} images — product already has ${existingCount} (max 5)`,
      400,
    );
  }

  // upload all to cloudinary in parallel
  const uploaded = await uploadImages(
    images.map((i) => i.base64),
    `rodtey/products/${refId}`,
  );

  // save all to db
  await prisma.image.createMany({
    data: uploaded.map(({ url, publicId }, index) => ({
      url,
      publicId,
      altText: images[index].altText,
      productId: refId,
    })),
  });

  const saved = await prisma.image.findMany({
    where: { productId: refId },
    select: { id: true, url: true, publicId: true, altText: true },
  });

  return res.status(201).json({ success: true, data: saved });
};

// ─── Delete single image ─────────────────────────────────
export const deleteSingleImage = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const userId = req.user!.userId;

  const image = await prisma.image.findUnique({
    where: { id },
    include: {
      product: { select: { vendorId: true } },
    },
  });
  if (!image) throw new AppError('Image not found', 404);

  // check ownership
  if (image.userId && image.userId !== userId) throw new AppError('Forbidden', 403);
  if (image.product) {
    const vendor = await prisma.vendor.findUnique({ where: { userId } });
    if (!vendor || image.product.vendorId !== vendor.id) throw new AppError('Forbidden', 403);
  }

  await deleteImage(image.publicId);
  await prisma.image.delete({ where: { id } });

  res.json({ success: true, message: 'Image deleted' });
};
