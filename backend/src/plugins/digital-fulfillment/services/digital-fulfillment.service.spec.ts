import { Readable } from 'stream';
import {
  DigitalFulfillmentService,
  FileUploadError,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MinioClientAdapter,
  DigitalProductRepository,
} from './digital-fulfillment.service';
import { DigitalProduct } from '../entities/digital-product.entity';
import { DigitalProductInput } from '../../../shared/types/digital-fulfillment.types';

describe('DigitalFulfillmentService', () => {
  let service: DigitalFulfillmentService;
  let mockMinioClient: jest.Mocked<MinioClientAdapter>;
  let mockRepository: jest.Mocked<DigitalProductRepository>;

  function createValidInput(): DigitalProductInput {
    return {
      productVariantId: '42',
      fileName: 'nuxt-starter-kit-v1.zip',
      fileSize: 15_000_000,
      mimeType: 'application/zip',
      bucket: 'products',
    };
  }

  function createReadableStream(content = 'file-content'): Readable {
    const stream = new Readable();
    stream.push(content);
    stream.push(null);
    return stream;
  }

  beforeEach(() => {
    mockMinioClient = {
      statObject: jest.fn(),
      putObject: jest.fn(),
      removeObject: jest.fn(),
      presignedGetObject: jest.fn(),
    };
    mockRepository = {
      save: jest.fn(),
      findByVariantId: jest.fn(),
    };
    service = new DigitalFulfillmentService(mockMinioClient, mockRepository);
  });

  describe('validateMimeType', () => {
    it('should accept application/zip', () => {
      expect(() => service.validateMimeType('application/zip')).not.toThrow();
    });

    it('should accept application/pdf', () => {
      expect(() => service.validateMimeType('application/pdf')).not.toThrow();
    });

    it('should accept application/epub+zip', () => {
      expect(() => service.validateMimeType('application/epub+zip')).not.toThrow();
    });

    it('should reject image/png', () => {
      expect(() => service.validateMimeType('image/png')).toThrow(FileUploadError);
      expect(() => service.validateMimeType('image/png')).toThrow('MIME type');
    });

    it('should reject text/plain', () => {
      expect(() => service.validateMimeType('text/plain')).toThrow(FileUploadError);
    });

    it('should reject application/json', () => {
      expect(() => service.validateMimeType('application/json')).toThrow(FileUploadError);
    });

    it('should have INVALID_MIME_TYPE error code', () => {
      try {
        service.validateMimeType('text/html');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FileUploadError);
        expect((error as FileUploadError).code).toBe('INVALID_MIME_TYPE');
      }
    });
  });

  describe('validateFileSize', () => {
    it('should accept file size within limit', () => {
      expect(() => service.validateFileSize(100_000_000)).not.toThrow(); // 100MB
    });

    it('should accept file size exactly at limit', () => {
      expect(() => service.validateFileSize(MAX_FILE_SIZE_BYTES)).not.toThrow();
    });

    it('should reject file size exceeding limit', () => {
      expect(() => service.validateFileSize(MAX_FILE_SIZE_BYTES + 1)).toThrow(FileUploadError);
    });

    it('should accept zero-byte file', () => {
      expect(() => service.validateFileSize(0)).not.toThrow();
    });

    it('should have FILE_TOO_LARGE error code', () => {
      try {
        service.validateFileSize(MAX_FILE_SIZE_BYTES + 1);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FileUploadError);
        expect((error as FileUploadError).code).toBe('FILE_TOO_LARGE');
      }
    });
  });

  describe('checkFilenameUniqueness', () => {
    it('should pass when file does not exist (NotFound)', async () => {
      mockMinioClient.statObject.mockRejectedValue({ code: 'NotFound' });

      await expect(
        service.checkFilenameUniqueness('products', 'test.zip'),
      ).resolves.toBeUndefined();
    });

    it('should pass when file does not exist (NoSuchKey)', async () => {
      mockMinioClient.statObject.mockRejectedValue({ code: 'NoSuchKey' });

      await expect(
        service.checkFilenameUniqueness('products', 'test.zip'),
      ).resolves.toBeUndefined();
    });

    it('should pass when file does not exist (Not Found message)', async () => {
      mockMinioClient.statObject.mockRejectedValue({
        message: 'Not Found',
      });

      await expect(
        service.checkFilenameUniqueness('products', 'test.zip'),
      ).resolves.toBeUndefined();
    });

    it('should throw FILENAME_CONFLICT when file exists', async () => {
      mockMinioClient.statObject.mockResolvedValue({ size: 1000 });

      await expect(
        service.checkFilenameUniqueness('products', 'existing.zip'),
      ).rejects.toMatchObject({
        code: 'FILENAME_CONFLICT',
      });
    });

    it('should throw STORAGE_UNAVAILABLE on connection error', async () => {
      mockMinioClient.statObject.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(
        service.checkFilenameUniqueness('products', 'test.zip'),
      ).rejects.toMatchObject({
        code: 'STORAGE_UNAVAILABLE',
      });
    });
  });

  describe('streamUploadToMinio', () => {
    it('should upload file successfully', async () => {
      mockMinioClient.putObject.mockResolvedValue({});
      const stream = createReadableStream();

      await expect(
        service.streamUploadToMinio('products', 'test.zip', stream, 100),
      ).resolves.toBeUndefined();

      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'products',
        'test.zip',
        stream,
        100,
        { 'Content-Type': 'application/octet-stream' },
      );
    });

    it('should throw STORAGE_UNAVAILABLE on upload failure', async () => {
      mockMinioClient.putObject.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );
      const stream = createReadableStream();

      await expect(
        service.streamUploadToMinio('products', 'test.zip', stream, 100),
      ).rejects.toMatchObject({
        code: 'STORAGE_UNAVAILABLE',
      });
    });
  });

  describe('uploadProductFile', () => {
    it('should successfully upload a valid file and create record', async () => {
      const input = createValidInput();
      const stream = createReadableStream();
      const expectedProduct = new DigitalProduct({
        ...input,
        originalFileName: input.fileName,
        bucket: 'products',
        objectKey: input.fileName,
      });

      // File doesn't exist
      mockMinioClient.statObject.mockRejectedValue({ code: 'NotFound' });
      // Upload succeeds
      mockMinioClient.putObject.mockResolvedValue({});
      // Record creation succeeds
      mockRepository.save.mockResolvedValue(expectedProduct);

      const result = await service.uploadProductFile(input, stream);

      expect(result).toBe(expectedProduct);
      expect(mockMinioClient.statObject).toHaveBeenCalledWith('products', input.fileName);
      expect(mockMinioClient.putObject).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should reject invalid MIME type before any storage operations', async () => {
      const input = createValidInput();
      input.mimeType = 'image/png';
      const stream = createReadableStream();

      await expect(service.uploadProductFile(input, stream)).rejects.toMatchObject({
        code: 'INVALID_MIME_TYPE',
      });

      expect(mockMinioClient.statObject).not.toHaveBeenCalled();
      expect(mockMinioClient.putObject).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should reject oversized file before any storage operations', async () => {
      const input = createValidInput();
      input.fileSize = MAX_FILE_SIZE_BYTES + 1;
      const stream = createReadableStream();

      await expect(service.uploadProductFile(input, stream)).rejects.toMatchObject({
        code: 'FILE_TOO_LARGE',
      });

      expect(mockMinioClient.statObject).not.toHaveBeenCalled();
      expect(mockMinioClient.putObject).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should reject duplicate filename before upload', async () => {
      const input = createValidInput();
      const stream = createReadableStream();

      // File already exists
      mockMinioClient.statObject.mockResolvedValue({ size: 1000 });

      await expect(service.uploadProductFile(input, stream)).rejects.toMatchObject({
        code: 'FILENAME_CONFLICT',
      });

      expect(mockMinioClient.putObject).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should return STORAGE_UNAVAILABLE when MinIO is unreachable during uniqueness check', async () => {
      const input = createValidInput();
      const stream = createReadableStream();

      mockMinioClient.statObject.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(service.uploadProductFile(input, stream)).rejects.toMatchObject({
        code: 'STORAGE_UNAVAILABLE',
      });

      expect(mockMinioClient.putObject).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should return STORAGE_UNAVAILABLE when MinIO is unreachable during upload', async () => {
      const input = createValidInput();
      const stream = createReadableStream();

      mockMinioClient.statObject.mockRejectedValue({ code: 'NotFound' });
      mockMinioClient.putObject.mockRejectedValue(
        new Error('connect ECONNREFUSED'),
      );

      await expect(service.uploadProductFile(input, stream)).rejects.toMatchObject({
        code: 'STORAGE_UNAVAILABLE',
      });

      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should rollback uploaded file when record creation fails', async () => {
      const input = createValidInput();
      const stream = createReadableStream();

      mockMinioClient.statObject.mockRejectedValue({ code: 'NotFound' });
      mockMinioClient.putObject.mockResolvedValue({});
      mockRepository.save.mockRejectedValue(new Error('Database connection lost'));
      mockMinioClient.removeObject.mockResolvedValue(undefined);

      await expect(service.uploadProductFile(input, stream)).rejects.toMatchObject({
        code: 'RECORD_CREATION_FAILED',
      });

      // Verify rollback was attempted
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(
        'products',
        input.fileName,
      );
    });

    it('should still throw RECORD_CREATION_FAILED even if rollback fails', async () => {
      const input = createValidInput();
      const stream = createReadableStream();

      mockMinioClient.statObject.mockRejectedValue({ code: 'NotFound' });
      mockMinioClient.putObject.mockResolvedValue({});
      mockRepository.save.mockRejectedValue(new Error('Database error'));
      mockMinioClient.removeObject.mockRejectedValue(
        new Error('MinIO also down'),
      );

      await expect(service.uploadProductFile(input, stream)).rejects.toMatchObject({
        code: 'RECORD_CREATION_FAILED',
      });

      // Rollback was attempted even though it failed
      expect(mockMinioClient.removeObject).toHaveBeenCalled();
    });

    it('should not create record if MinIO is unreachable (Requirement 3.6)', async () => {
      const input = createValidInput();
      const stream = createReadableStream();

      // MinIO unreachable during stat check
      mockMinioClient.statObject.mockRejectedValue(
        new Error('getaddrinfo ENOTFOUND minio'),
      );

      await expect(service.uploadProductFile(input, stream)).rejects.toMatchObject({
        code: 'STORAGE_UNAVAILABLE',
      });

      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});
