/**
 * Security Controls Configuration
 *
 * This module centralizes security-related configuration and verification
 * for the NgopiCode Digital Store backend.
 *
 * Security controls implemented:
 * 1. MinIO private bucket - No public access, files served via pre-signed URLs only
 * 2. UUID v4 download tokens - 122 bits of entropy for secure token generation
 * 3. Parameterized queries - TypeORM default behavior prevents SQL injection
 * 4. HTTPS enforcement - All traffic routed through Cloudflare Tunnel
 *
 * @see Requirements 13.1 - MinIO private bucket (no public access)
 * @see Requirements 13.4 - UUID v4 tokens (122 bits entropy)
 * @see Requirements 13.5 - HTTPS enforcement via Cloudflare Tunnel
 * @see Requirements 13.6 - Parameterized queries (TypeORM default)
 */

import { randomUUID } from 'crypto';

/**
 * MinIO Bucket Security Configuration
 *
 * All product files are stored in private MinIO buckets.
 * Access is only granted via time-limited pre-signed URLs (1 hour expiry).
 *
 * The bucket policy explicitly denies all public GetObject requests.
 * This is enforced at two levels:
 * 1. Application level: `initializeMinioBuckets()` sets a Deny policy on bucket creation
 * 2. Infrastructure level: `docker-compose.yml` runs `mc anonymous set none` on startup
 *
 * @see Requirements 13.1
 */
export const MINIO_SECURITY_CONFIG = {
  /** Bucket name for digital product files */
  productsBucket: 'products',

  /** Pre-signed URL expiry in seconds (1 hour) */
  presignedUrlExpiry: 3600,

  /**
   * Private bucket policy that denies all public access.
   * Applied when creating the bucket via `initializeMinioBuckets()`.
   */
  getPrivateBucketPolicy(bucketName: string): string {
    return JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    });
  },
} as const;

/**
 * Download Token Security Configuration
 *
 * Download tokens are generated using Node.js `crypto.randomUUID()` which
 * produces UUID v4 tokens with 122 bits of randomness (128 bits minus 6 bits
 * used for version and variant fields).
 *
 * UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * - 4 indicates version 4
 * - y is one of 8, 9, a, or b (variant bits)
 * - All other characters are cryptographically random hex digits
 *
 * This provides sufficient entropy to prevent brute-force token guessing.
 * At 122 bits of entropy, an attacker would need ~2^61 attempts on average
 * to guess a valid token (birthday attack consideration).
 *
 * @see Requirements 13.4
 */
export const TOKEN_SECURITY_CONFIG = {
  /** Entropy bits provided by UUID v4 */
  entropyBits: 122,

  /** Token format validation regex */
  uuidV4Regex: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

/**
 * Generates a cryptographically secure download token using UUID v4.
 *
 * Uses Node.js `crypto.randomUUID()` which is backed by the operating system's
 * cryptographic random number generator (CSPRNG), providing 122 bits of entropy.
 *
 * @returns A UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * @see Requirements 13.4
 */
export function generateDownloadToken(): string {
  return randomUUID();
}

/**
 * Validates that a token conforms to UUID v4 format.
 *
 * @param token - The token string to validate
 * @returns true if the token is a valid UUID v4
 */
export function isValidDownloadToken(token: string): boolean {
  return TOKEN_SECURITY_CONFIG.uuidV4Regex.test(token);
}

/**
 * Database Security Configuration
 *
 * TypeORM uses parameterized queries by default for all database operations.
 * This prevents SQL injection attacks by separating SQL logic from data values.
 *
 * How it works:
 * - All `find()`, `save()`, `update()`, `delete()` operations use parameterized queries
 * - QueryBuilder methods like `.where()` use parameter binding (`:paramName`)
 * - Raw queries should NEVER be used; if absolutely necessary, use `query()` with parameters
 *
 * Example of safe TypeORM usage (already in use throughout the codebase):
 * ```typescript
 * // Safe - parameterized query
 * repository.findOne({ where: { downloadToken: token } });
 *
 * // Safe - QueryBuilder with parameters
 * queryBuilder.where('entity.id = :id', { id: someId });
 *
 * // UNSAFE - Never do this
 * // connection.query(`SELECT * FROM entity WHERE id = '${someId}'`);
 * ```
 *
 * @see Requirements 13.6
 */
export const DATABASE_SECURITY_CONFIG = {
  /** TypeORM uses parameterized queries by default */
  parameterizedQueries: true,

  /** Maximum database connection pool size (limits resource exhaustion attacks) */
  maxConnectionPool: 10,

  /** Synchronize disabled in production (prevents schema manipulation) */
  synchronize: false,
} as const;

/**
 * HTTPS / Transport Security Configuration
 *
 * All external traffic is routed through Cloudflare Tunnel which enforces HTTPS.
 *
 * Architecture:
 * ```
 * Client (HTTPS) → Cloudflare Edge → Cloudflare Tunnel → Vendure Backend (HTTP internal)
 * ```
 *
 * Security guarantees:
 * - All client-facing traffic is encrypted with TLS 1.2+ (managed by Cloudflare)
 * - Cloudflare provides DDoS protection and WAF capabilities
 * - The Vendure backend is not directly exposed to the internet
 * - Internal communication between containers uses Docker network (isolated)
 *
 * Configuration is managed via:
 * - `docker-compose.yml`: cloudflared service with TUNNEL_TOKEN
 * - Cloudflare Dashboard: tunnel routing rules (domain → localhost:3000)
 *
 * @see Requirements 13.5
 */
export const HTTPS_SECURITY_CONFIG = {
  /** HTTPS is enforced at the Cloudflare Tunnel level */
  httpsEnforced: true,

  /** Minimum TLS version (managed by Cloudflare) */
  minTlsVersion: '1.2',

  /** Backend is not directly exposed to the internet */
  directExposure: false,

  /**
   * Required environment variable for Cloudflare Tunnel.
   * Set in docker-compose.yml as TUNNEL_TOKEN.
   */
  tunnelTokenEnvVar: 'CLOUDFLARE_TUNNEL_TOKEN',
} as const;

/**
 * Verifies that all required security environment variables are configured.
 * Should be called during application startup.
 *
 * @returns An object with verification results for each security control
 */
export function verifySecurityConfiguration(): SecurityVerificationResult {
  const results: SecurityVerificationResult = {
    minioConfigured: false,
    uuidTokenGeneration: false,
    parameterizedQueries: true, // Always true with TypeORM
    httpsConfigured: false,
    warnings: [],
  };

  // Verify MinIO credentials are configured
  if (process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY) {
    results.minioConfigured = true;
  } else {
    results.warnings.push(
      'MinIO credentials not configured. Set MINIO_ACCESS_KEY and MINIO_SECRET_KEY.',
    );
  }

  // Verify UUID v4 token generation works
  const testToken = generateDownloadToken();
  if (isValidDownloadToken(testToken)) {
    results.uuidTokenGeneration = true;
  } else {
    results.warnings.push(
      'UUID v4 token generation failed verification. Check crypto module availability.',
    );
  }

  // Parameterized queries are always enabled with TypeORM
  results.parameterizedQueries = true;

  // Verify Cloudflare Tunnel token is configured (only in production)
  if (process.env.NODE_ENV === 'production') {
    if (process.env.CLOUDFLARE_TUNNEL_TOKEN) {
      results.httpsConfigured = true;
    } else {
      results.warnings.push(
        'CLOUDFLARE_TUNNEL_TOKEN not configured. HTTPS enforcement requires Cloudflare Tunnel.',
      );
    }
  } else {
    // In development, HTTPS is not required
    results.httpsConfigured = true;
  }

  return results;
}

/**
 * Result of security configuration verification.
 */
export interface SecurityVerificationResult {
  /** Whether MinIO is properly configured with credentials */
  minioConfigured: boolean;
  /** Whether UUID v4 token generation is working */
  uuidTokenGeneration: boolean;
  /** Whether parameterized queries are enabled (always true with TypeORM) */
  parameterizedQueries: boolean;
  /** Whether HTTPS is configured (Cloudflare Tunnel in production) */
  httpsConfigured: boolean;
  /** Any warnings about missing or misconfigured security controls */
  warnings: string[];
}
