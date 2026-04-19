import { z } from 'zod';

export const TIP_CATEGORIES = [
  'work',
  'support',
  'donation',
  'feedback',
  'content',
  'design',
  'code',
  'other',
] as const;

export type TipCategory = (typeof TIP_CATEGORIES)[number];

export const tipSchema = z.object({
  amount: z
    .string()
    .min(1, 'Required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be greater than 0')
    // Cap is intentionally high to accommodate high-denomination stablecoins
    // (NGNm, COPm, JPYm, etc.). Real balance enforcement comes from the ERC-20 contract.
    .refine((v) => Number(v) <= 100_000_000, 'Amount exceeds maximum'),
  category: z.enum(TIP_CATEGORIES),
  message: z.string().max(280, 'Max 280 characters'),
});

export type TipFormData = z.infer<typeof tipSchema>;
