import * as fc from 'fast-check';
import {
  DigitalFulfillmentService,
  FileUploadError,
  ALLOWED_MIME_TYPES,
  MinioClientAdapter,
  DigitalProductRepository,
} from './digital-fulfillment.service';

/**
 * Property 11: MIME Type Validation
 *
 * For any MIME type string, verify acceptance if and only if it's in the allowed list.
 *
 * **Validates: Requirements 3.3**
 */
describe('Property 11: MIME Type Validation', () => {
  let service: DigitalFulfillmentService;

  beforeEach(() => {
    const mockMinioClient: MinioClientAdapter = {
      statObject: jest.fn(),
      putObject: jest.fn(),
      removeObject: jest.fn(),
    };
    const mockRepository: DigitalProductRepository = {
      save: jest.fn(),
    };
    service = new DigitalFulfillmentService(mockMinioClient, mockRepository);
  });

  /**
   * Arbitrary that generates MIME type strings including both valid and invalid ones.
   * Generates strings in the format "type/subtype" with optional parameters.
   */
  const mimeTypeArbitrary = fc.oneof(
    // Generate from the allowed list (valid MIME types)
    fc.constantFrom(...ALLOWED_MIME_TYPES),
    // Generate common but disallowed MIME types
    fc.constantFrom(
      'image/png',
      'image/jpeg',
      'text/plain',
      'text/html',
      'application/json',
      'application/xml',
      'application/octet-stream',
      'video/mp4',
      'audio/mpeg',
    ),
    // Generate arbitrary MIME-like strings (type/subtype format)
    fc.tuple(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 20 }),
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789+-._'), { minLength: 1, maxLength: 30 }),
    ).map(([type, subtype]) => `${type}/${subtype}`),
    // Generate completely arbitrary strings (not MIME-like)
    fc.string({ minLength: 0, maxLength: 50 }),
  );

  it('should accept a MIME type if and only if it is in ALLOWED_MIME_TYPES', () => {
    fc.assert(
      fc.property(mimeTypeArbitrary, (mimeType) => {
        const isAllowed = ALLOWED_MIME_TYPES.includes(mimeType);

        if (isAllowed) {
          // Should not throw for allowed MIME types
          expect(() => service.validateMimeType(mimeType)).not.toThrow();
        } else {
          // Should throw FileUploadError with INVALID_MIME_TYPE code for disallowed types
          expect(() => service.validateMimeType(mimeType)).toThrow(FileUploadError);
          try {
            service.validateMimeType(mimeType);
          } catch (error) {
            expect((error as FileUploadError).code).toBe('INVALID_MIME_TYPE');
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('should always accept all three allowed MIME types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALLOWED_MIME_TYPES),
        (allowedMimeType) => {
          expect(() => service.validateMimeType(allowedMimeType)).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should always reject strings that are not in the allowed list', () => {
    // Generate arbitrary strings that are guaranteed NOT to be in the allowed list
    const nonAllowedArbitrary = fc.string({ minLength: 0, maxLength: 100 }).filter(
      (s) => !ALLOWED_MIME_TYPES.includes(s),
    );

    fc.assert(
      fc.property(nonAllowedArbitrary, (invalidMimeType) => {
        expect(() => service.validateMimeType(invalidMimeType)).toThrow(FileUploadError);
        try {
          service.validateMimeType(invalidMimeType);
        } catch (error) {
          expect((error as FileUploadError).code).toBe('INVALID_MIME_TYPE');
        }
      }),
      { numRuns: 200 },
    );
  });
});
