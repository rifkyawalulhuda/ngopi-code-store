import { DeepPartial, VendureEntity, ID } from '@vendure/core';
import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { ProductVariant } from '@vendure/core';
import { Min, Max } from 'class-validator';

/**
 * DigitalProduct entity represents a digital file associated with a product variant.
 * Files are stored in MinIO and delivered to customers via pre-signed URLs after purchase.
 *
 * @see Requirements 3.2 - Digital product record with file metadata and download configuration
 */
@Entity()
@Unique(['fileName', 'bucket'])
export class DigitalProduct extends VendureEntity {
  constructor(input?: DeepPartial<DigitalProduct>) {
    super(input);
  }

  @ManyToOne(() => ProductVariant)
  @JoinColumn()
  productVariant: ProductVariant;

  @Column({ type: 'int' })
  productVariantId: ID;

  /**
   * Generated filename used as the MinIO object key identifier.
   * Must be unique within the same bucket.
   */
  @Column()
  fileName: string;

  /**
   * Original filename as uploaded by the administrator.
   * Used for display and download Content-Disposition header.
   */
  @Column()
  originalFileName: string;

  /**
   * File size in bytes. Maximum 500MB (524,288,000 bytes).
   * Stored as bigint to support large file sizes.
   */
  @Column({ type: 'bigint' })
  fileSize: number;

  /**
   * MIME type of the file. Must be one of:
   * - application/zip
   * - application/pdf
   * - application/epub+zip
   */
  @Column()
  mimeType: string;

  /**
   * MinIO bucket where the file is stored.
   */
  @Column()
  bucket: string;

  /**
   * MinIO object key for retrieving the file.
   */
  @Column()
  objectKey: string;

  /**
   * Maximum number of times a customer can download this product per order.
   *
   * `999` is the sentinel used by the Admin uploader to mean "unlimited" — the
   * dashboard upload flow stores it directly, and `OrderFulfillmentRunner`
   * copies it into each `DigitalDownload` record. The DB CHECK constraint on
   * `digital_download.maxDownloads` allows up to 1000 for that reason
   * (see migration `WidenDigitalDownloadMaxRange`).
   *
   * The column default (5) is only used when a record is created without an
   * explicit value, which the upload flow never does.
   */
  @Min(1)
  @Max(1000)
  @Column({ default: 5 })
  maxDownloadsPerOrder: number;

  /**
   * Number of hours after purchase that the download link remains active.
   * Valid range: 1 to 168 (7 days). Default: 72 hours.
   */
  @Min(1)
  @Max(168)
  @Column({ default: 72 })
  downloadExpiryHours: number;
}
