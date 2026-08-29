import {
  ApiBody,
  ApiConsumes,
  ApiResponse,
  ApiProduces,
  ApiOperation,
  ApiOkResponse,
  getSchemaPath,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

import { ProductResponseDto } from './dto/product-response.dto';
import { ProductSlugResponseDto } from './dto/product-slug-response.dto';
import { PaginatedProductsResponseDto } from './dto/paginated-products-response.dto';

export function ApiListProducts() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List products',
      description:
        'Retrieve a paginated list of products, with materials, images and variants. Requires admin role.',
    }),
    ApiOkResponse({ type: PaginatedProductsResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
  );
}

export function ApiListPublicProducts() {
  return applyDecorators(
    ApiOperation({
      summary: 'List public products',
      description:
        'Retrieve a paginated list of ACTIVE products for storefront use. No authentication required.',
    }),
    ApiOkResponse({ type: PaginatedProductsResponseDto }),
  );
}

export function ApiListBestSellerProducts() {
  return applyDecorators(
    ApiOperation({
      summary: 'List best-selling public products',
      description:
        'Retrieve a paginated list of ACTIVE products sorted by soldCount descending, for storefront use. No authentication required.',
    }),
    ApiOkResponse({ type: PaginatedProductsResponseDto }),
  );
}

export function ApiGetPublicProductBySlug() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get public product by slug',
      description:
        'Retrieve a single ACTIVE product by its slug for storefront use. No authentication required.',
    }),
    ApiOkResponse({ type: ProductResponseDto }),
    ApiNotFoundResponse({ description: 'Product not found' }),
  );
}

export function ApiGetProductSlugs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get product slugs by ids',
      description:
        'Batch resolve product ids to their current slug — useful for linking from denormalized snapshots (e.g. order items) that only store productId. Ids that are archived, deleted, or not found are silently omitted from the response. No authentication required.',
    }),
    ApiOkResponse({ type: [ProductSlugResponseDto] }),
  );
}

export function ApiGetRelatedProducts() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get related products (cursor-based)',
      description:
        'Retrieve ACTIVE products similar to the given product, identified by its slug. Prioritizes products in the same category, falling back to other active products once the category is exhausted. Uses cursor-based pagination via the opaque `cursor` query param returned as `meta.nextCursor`. No authentication required.',
    }),
    ApiOkResponse({
      schema: {
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(ProductResponseDto) },
          },
          meta: {
            properties: {
              nextCursor: { type: 'string', nullable: true },
              hasNextPage: { type: 'boolean' },
            },
          },
        },
      },
    }),
    ApiNotFoundResponse({ description: 'Product not found' }),
    ApiBadRequestResponse({ description: 'Invalid cursor' }),
  );
}

export function ApiCreateProduct() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create product',
      description:
        'Create a new product, optionally with materials and variants in the same request. Requires admin role.',
    }),
    ApiCreatedResponse({ type: ProductResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiConflictResponse({
      description: 'SKU or slug is already in use',
    }),
  );
}

export function ApiExportProducts() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Export products to Excel',
      description:
        'Export the filtered list of products (search/status/category/outOfStock) to an .xlsx file. Stock column reflects the sum across all variants. Requires admin role. Not limited by pagination — returns all matching records, capped at 20,000 rows.',
    }),
    ApiProduces(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ),
    ApiResponse({
      status: 200,
      description: 'Excel file (.xlsx) containing the filtered product list',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Export exceeds the maximum allowed row count',
    }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
  );
}

export function ApiGetProductById() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get product by id',
      description:
        'Retrieve a single product by id, with materials, images and variants. Requires admin role.',
    }),
    ApiOkResponse({ type: ProductResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'Product not found' }),
  );
}

export function ApiUpdateProduct() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update product',
      description:
        'Update product information, including replacing its materials list. Variants are managed via the dedicated variant endpoints. Requires admin role.',
    }),
    ApiOkResponse({ type: ProductResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiConflictResponse({
      description: 'SKU or slug is already in use',
    }),
    ApiNotFoundResponse({ description: 'Product not found' }),
  );
}

export function ApiUpdateProductStatus() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update product status',
      description:
        'Change a product status between DRAFT, ACTIVE and ARCHIVED. Requires admin role.',
    }),
    ApiOkResponse({ type: ProductResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'Product not found' }),
  );
}

export function ApiAddVariant() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Add product variant',
      description:
        'Add a new color/price/stock variant to the product. Requires admin role.',
    }),
    ApiCreatedResponse({ type: ProductResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiNotFoundResponse({ description: 'Product not found' }),
  );
}

export function ApiUpdateVariant() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update product variant',
      description:
        'Update a variant belonging to the product. Requires admin role.',
    }),
    ApiOkResponse({ type: ProductResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiNotFoundResponse({
      description: 'Product not found, or variant not found on this product',
    }),
  );
}

export function ApiRemoveVariant() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Remove product variant',
      description:
        "Remove a variant from the product's variant list, along with its variant-scoped images. Requires admin role.",
    }),
    ApiOkResponse({ type: ProductResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({
      description: 'Product not found, or variant not found on this product',
    }),
  );
}

export function ApiAddProductImage() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Add product image',
      description:
        'Upload and append an image to the product gallery. Pass an optional variantId query param to scope the image to a specific variant instead of the product itself. Stored on Cloudinary. Requires admin role.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Image file (jpg, jpeg, png, webp), max 5MB',
          },
        },
      },
    }),
    ApiOkResponse({ type: ProductResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiUnprocessableEntityResponse({
      description: 'Invalid file type or file too large',
    }),
    ApiNotFoundResponse({
      description: 'Product not found, or variant not found on this product',
    }),
  );
}

export function ApiRemoveProductImage() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Remove product image',
      description:
        "Remove an image (identified by its id) from the product's gallery.",
    }),
    ApiOkResponse({ type: ProductResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({
      description: 'Product not found, or image not found on this product',
    }),
  );
}

export function ApiDeleteProduct() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Delete product',
      description: 'Soft-delete a product. Requires admin role.',
    }),
    ApiNoContentResponse({ description: 'Product deleted successfully' }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'Product not found' }),
  );
}

export const ApiBulkDeleteProducts = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Bulk delete products',
      description:
        'Soft-deletes multiple products at once. Fails entirely if any ID is invalid or not found.',
    }),
    ApiResponse({
      status: 200,
      description: 'Products deleted successfully.',
      schema: { example: { deletedCount: 3 } },
    }),
    ApiResponse({
      status: 400,
      description: 'Validation failed (empty or invalid ID list).',
    }),
    ApiResponse({
      status: 403,
      description: 'Only admins can access this resource.',
    }),
    ApiResponse({
      status: 404,
      description: 'One or more product IDs not found.',
    }),
  );
