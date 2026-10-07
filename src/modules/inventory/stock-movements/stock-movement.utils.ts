import { StockMovementType } from '@prisma/client';

export const INBOUND_TYPES: StockMovementType[] = [
  StockMovementType.PURCHASE_IN,
  StockMovementType.RETURN_IN,
  StockMovementType.TRANSFER_IN,
];

export const OUTBOUND_TYPES: StockMovementType[] = [
  StockMovementType.SALE_OUT,
  StockMovementType.DAMAGED_OUT,
  StockMovementType.TRANSFER_OUT,
];

export function getSignedQuantity(
  type: StockMovementType,
  quantity: number,
): number {
  if (type === StockMovementType.ADJUSTMENT) return quantity;
  return OUTBOUND_TYPES.includes(type)
    ? -Math.abs(quantity)
    : Math.abs(quantity);
}
