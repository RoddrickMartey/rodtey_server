import { z } from 'zod';

const imageTypeEnum = z.enum(['avatar', 'product', 'vendor_logo', 'vendor_banner', 'category']);

export const singleUploadSchema = z.object({
  base64: z.string({ error: 'Image is required' }),
  type: imageTypeEnum,
  refId: z.string({ error: 'Reference id is required' }).uuid('Invalid reference id'),
  altText: z.string().optional(),
});

export const multipleUploadSchema = z.object({
  images: z
    .array(
      z.object({
        base64: z.string({ error: 'Image is required' }),
        altText: z.string().optional(),
      }),
    )
    .min(1, 'At least one image is required')
    .max(5, 'Maximum 5 images allowed'),
  type: imageTypeEnum,
  refId: z.string({ error: 'Reference id is required' }).uuid('Invalid reference id'),
});

export type SingleUploadInput = z.infer<typeof singleUploadSchema>;
export type MultipleUploadInput = z.infer<typeof multipleUploadSchema>;
