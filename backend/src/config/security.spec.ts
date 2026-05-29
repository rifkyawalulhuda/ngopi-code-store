import {
  generateDownloadToken,
  isValidDownloadToken,
  verifySecurityConfiguration,
  MINIO_SECURITY_CONFIG,
  TOKEN_SECURITY_CONFIG,
  DATABASE_SECURITY_CONFIG,
  HTTPS_SECURITY_CONFIG,
} from './security';

describe('Security Controls Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('MinIO Private Bucket Configuration (Req 13.1)', () => {
    it('should define products bucket name', () => {
      expect(MINIO_SECURITY_CONFIG.productsBucket).toBe('products');
    });

    it('should set pre-signed URL expiry to 1 hour (3600 seconds)', () => {
      expect(MINIO_SECURITY_CONFIG.presignedUrlExpiry).toBe(3600);
    });

    it('should generate a private bucket policy that denies all public GetObject', () => {
      const policy = JSON.parse(
        MINIO_SECURITY_CONFIG.getPrivateBucketPolicy('products'),
      );

      expect(policy.Version).toBe('2012-10-17');
      expect(policy.Statement).toHaveLength(1);
      expect(policy.Statement[0].Effect).toBe('Deny');
      expect(policy.Statement[0].Principal).toBe('*');
      expect(policy.Statement[0].Action).toContain('s3:GetObject');
      expect(policy.Statement[0].Resource).toContain('arn:aws:s3:::products/*');
    });

    it('should generate policy with correct bucket name for any bucket', () => {
      const policy = JSON.parse(
        MINIO_SECURITY_CONFIG.getPrivateBucketPolicy('custom-bucket'),
      );

      expect(policy.Statement[0].Resource).toContain(
        'arn:aws:s3:::custom-bucket/*',
      );
    });
  });

  describe('UUID v4 Token Generation (Req 13.4)', () => {
    it('should document 122 bits of entropy', () => {
      expect(TOKEN_SECURITY_CONFIG.entropyBits).toBe(122);
    });

    it('should generate a valid UUID v4 token', () => {
      const token = generateDownloadToken();
      expect(isValidDownloadToken(token)).toBe(true);
    });

    it('should generate unique tokens on each call', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateDownloadToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should generate tokens with version 4 indicator', () => {
      const token = generateDownloadToken();
      // UUID v4 has '4' as the 13th character (position 14 in the string with hyphens)
      const parts = token.split('-');
      expect(parts[2][0]).toBe('4');
    });

    it('should generate tokens with correct variant bits', () => {
      const token = generateDownloadToken();
      const parts = token.split('-');
      // Variant bits: first char of 4th group must be 8, 9, a, or b
      expect(['8', '9', 'a', 'b']).toContain(parts[3][0]);
    });

    it('should validate correct UUID v4 tokens', () => {
      expect(isValidDownloadToken('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidDownloadToken('6ba7b810-9dad-41d0-80b4-00c04fd430c8')).toBe(true);
    });

    it('should reject invalid token formats', () => {
      expect(isValidDownloadToken('')).toBe(false);
      expect(isValidDownloadToken('not-a-uuid')).toBe(false);
      expect(isValidDownloadToken('550e8400-e29b-31d4-a716-446655440000')).toBe(false); // version 3
      expect(isValidDownloadToken('550e8400-e29b-41d4-c716-446655440000')).toBe(false); // wrong variant
    });
  });

  describe('Parameterized Queries (Req 13.6)', () => {
    it('should confirm parameterized queries are enabled', () => {
      expect(DATABASE_SECURITY_CONFIG.parameterizedQueries).toBe(true);
    });

    it('should set max connection pool to 10', () => {
      expect(DATABASE_SECURITY_CONFIG.maxConnectionPool).toBe(10);
    });

    it('should disable synchronize for production safety', () => {
      expect(DATABASE_SECURITY_CONFIG.synchronize).toBe(false);
    });
  });

  describe('HTTPS Enforcement via Cloudflare Tunnel (Req 13.5)', () => {
    it('should confirm HTTPS is enforced', () => {
      expect(HTTPS_SECURITY_CONFIG.httpsEnforced).toBe(true);
    });

    it('should require minimum TLS 1.2', () => {
      expect(HTTPS_SECURITY_CONFIG.minTlsVersion).toBe('1.2');
    });

    it('should confirm backend is not directly exposed', () => {
      expect(HTTPS_SECURITY_CONFIG.directExposure).toBe(false);
    });

    it('should reference correct tunnel token env var', () => {
      expect(HTTPS_SECURITY_CONFIG.tunnelTokenEnvVar).toBe('CLOUDFLARE_TUNNEL_TOKEN');
    });
  });

  describe('verifySecurityConfiguration()', () => {
    it('should pass all checks when all env vars are configured in production', () => {
      process.env.MINIO_ACCESS_KEY = 'test-key';
      process.env.MINIO_SECRET_KEY = 'test-secret';
      process.env.CLOUDFLARE_TUNNEL_TOKEN = 'test-token';
      process.env.NODE_ENV = 'production';

      const result = verifySecurityConfiguration();

      expect(result.minioConfigured).toBe(true);
      expect(result.uuidTokenGeneration).toBe(true);
      expect(result.parameterizedQueries).toBe(true);
      expect(result.httpsConfigured).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when MinIO credentials are missing', () => {
      delete process.env.MINIO_ACCESS_KEY;
      delete process.env.MINIO_SECRET_KEY;
      process.env.NODE_ENV = 'development';

      const result = verifySecurityConfiguration();

      expect(result.minioConfigured).toBe(false);
      expect(result.warnings).toContain(
        'MinIO credentials not configured. Set MINIO_ACCESS_KEY and MINIO_SECRET_KEY.',
      );
    });

    it('should warn when Cloudflare Tunnel token is missing in production', () => {
      process.env.MINIO_ACCESS_KEY = 'test-key';
      process.env.MINIO_SECRET_KEY = 'test-secret';
      delete process.env.CLOUDFLARE_TUNNEL_TOKEN;
      process.env.NODE_ENV = 'production';

      const result = verifySecurityConfiguration();

      expect(result.httpsConfigured).toBe(false);
      expect(result.warnings).toContain(
        'CLOUDFLARE_TUNNEL_TOKEN not configured. HTTPS enforcement requires Cloudflare Tunnel.',
      );
    });

    it('should not require Cloudflare Tunnel token in development', () => {
      process.env.MINIO_ACCESS_KEY = 'test-key';
      process.env.MINIO_SECRET_KEY = 'test-secret';
      delete process.env.CLOUDFLARE_TUNNEL_TOKEN;
      process.env.NODE_ENV = 'development';

      const result = verifySecurityConfiguration();

      expect(result.httpsConfigured).toBe(true);
    });

    it('should always report parameterized queries as enabled', () => {
      const result = verifySecurityConfiguration();
      expect(result.parameterizedQueries).toBe(true);
    });
  });
});
