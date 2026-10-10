import { Address } from '@prisma/client';

type AddressTextParts = Pick<
  Address,
  'addressDetail' | 'wardName' | 'provinceName'
>;

export function formatAddressText(address: AddressTextParts): string {
  return [address.addressDetail, address.wardName, address.provinceName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}
