/**
 * Digital Fulfillment Plugin - Shared TypeScript Interfaces
 *
 * These types define the contract for digital product management,
 * download record tracking, and secure download link generation.
 *
 * @see Requirements 3.1 - File storage in MinIO with product variant association
 */

import { ID } from '@vendure/core';

/** Input for uploading/registering a digital product file */
export interface DigitalProductInput {
  productVariantId: ID;
  fileName: string;
  fileSize: number;
  mimeType: string;
  bucket: 'products' | 'previews';
}

/** Represents a customer's download access record for a purchased digital product */
export interface DigitalDownloadRecord {
  id: ID;
  orderId: ID;
  customerId: ID;
  productVariantId: ID;
  downloadToken: string;
  maxDownloads: number;
  currentDownloads: number;
  expiresAt: Date;
  createdAt: Date;
}

/** Response returned when generating a secure download link */
export interface DownloadLinkResponse {
  url: string;
  /** Time in seconds until the pre-signed URL expires */
  expiresIn: number;
  remainingDownloads: number;
  fileName: string;
}
