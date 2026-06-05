# Testing Guide

## Table of Contents

- [Overview](#overview)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [Property-Based Testing](#property-based-testing)
- [Test Conventions](#test-conventions)
- [Running Tests](#running-tests)

## Overview

| Layer | Runner | PBT Library | Unit Test Pattern | PBT Pattern |
|-------|--------|-------------|-------------------|-------------|
| Backend | Jest + ts-jest | fast-check 3.x | `*.spec.ts` | `*.pbt.spec.ts` |
| Frontend | Vitest | fast-check 4.x | `*.test.ts` | `*.pbt.spec.ts` |

## Backend Testing

### Setup

Backend uses **Jest** with `ts-jest` for TypeScript support. Configuration is in `backend/jest.config.js`.

### Commands

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run only property-based tests
npm run test:pbt
```

### Unit Tests (`*.spec.ts`)

Standard unit tests using Jest's `describe`/`it`/`expect` API:

```typescript
// digital-fulfillment.service.spec.ts
'use strict';

const { DigitalFulfillmentService } = require('./digital-fulfillment.service');

describe('DigitalFulfillmentService', () => {
  let service;

  beforeEach(() => {
    service = new DigitalFulfillmentService(/* mocked deps */);
  });

  it('should generate a pre-signed URL for valid variant', async () => {
    const result = await service.generateDownloadUrl('variant-1');
    expect(result.url).toContain('minio');
    expect(result.expiresAt).toBeDefined();
  });

  it('should throw if variant has no digital product', async () => {
    await expect(service.generateDownloadUrl('invalid'))
      .rejects.toThrow('Digital product not found');
  });
});
```

### Property-Based Tests (`*.pbt.spec.ts`)

Uses fast-check 3.x to generate random inputs and verify invariants:

```typescript
// custom-order-process.pbt.spec.ts
'use strict';

const fc = require('fast-check');
const { transitions, isValidTransition } = require('./custom-order-process');

describe('Custom Order Process (PBT)', () => {
  it('should never allow backward transitions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(transitions)),
        fc.constantFrom(...Object.keys(transitions)),
        (fromState, toState) => {
          const stateOrder = ['AddingItems', 'ArrangingPayment', 'PaymentAuthorized', 'PaymentSettled', 'Delivered'];
          const fromIdx = stateOrder.indexOf(fromState);
          const toIdx = stateOrder.indexOf(toState);

          if (toIdx < fromIdx) {
            expect(isValidTransition(fromState, toState)).toBe(false);
          }
        }
      )
    );
  });
});
```

### Test File Locations

Tests are co-located with their source files:

```
backend/src/
├── config/
│   ├── custom-order-process.ts
│   ├── custom-order-process.spec.ts        # Unit test
│   ├── custom-order-process.pbt.spec.ts    # Property-based test
│   └── security.spec.ts
├── middleware/
│   ├── memory-guard.middleware.ts
│   ├── memory-guard.middleware.spec.ts
│   ├── download-rate-limiter.middleware.ts
│   ├── download-rate-limiter.middleware.spec.ts
│   └── download-rate-limiter.pbt.spec.ts
└── plugins/
    └── digital-fulfillment/
        └── services/
            ├── digital-fulfillment.service.ts
            ├── digital-fulfillment.service.spec.ts
            └── digital-fulfillment.service.pbt.spec.ts
```

## Frontend Testing

### Setup

Frontend uses **Vitest** (integrated with Nuxt). Fast-check 4.x is used for property-based tests.

### Commands

```bash
cd frontend

# Run all tests (single run, exits after completion)
npm run test

# Run tests in watch mode
npm run test:watch
```

### Unit Tests (`*.test.ts`)

```typescript
// utils/format-price.test.ts
import { describe, it, expect } from 'vitest';
import { formatPrice } from './format-price';

describe('formatPrice', () => {
  it('formats IDR correctly', () => {
    expect(formatPrice(150000)).toBe('Rp 150.000');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('Rp 0');
  });
});
```

### Property-Based Tests (`*.pbt.spec.ts`)

```typescript
// utils/format-price.pbt.spec.ts
import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { formatPrice } from './format-price';

describe('formatPrice (PBT)', () => {
  it('should always return a string starting with Rp', () => {
    fc.assert(
      fc.property(fc.nat(), (amount) => {
        const result = formatPrice(amount);
        return result.startsWith('Rp');
      })
    );
  });

  it('should never return negative display for non-negative input', () => {
    fc.assert(
      fc.property(fc.nat(), (amount) => {
        const result = formatPrice(amount);
        return !result.includes('-');
      })
    );
  });
});
```

## Property-Based Testing

### Philosophy

Property-based tests (PBT) verify **invariants** that hold for all possible inputs, rather than testing specific examples. This catches edge cases that hand-crafted tests miss.

### When to Write PBT

- State machines (order process transitions)
- Data transformations (price formatting, currency math)
- Validation logic (signature verification, rate limiting)
- Access control (download permissions, ownership checks)
- Anything with complex input domains

### fast-check Versions

| Layer | Version | Import |
|-------|---------|--------|
| Backend | 3.x | `const fc = require('fast-check');` |
| Frontend | 4.x | `import * as fc from 'fast-check';` |

### Common Arbitraries

```typescript
// Useful generators
fc.nat()                          // Non-negative integer
fc.integer({ min: 1, max: 1e9 }) // Bounded integer (e.g., IDR amounts)
fc.string()                       // Random string
fc.uuid()                         // UUID v4
fc.constantFrom('a', 'b', 'c')   // Pick from known values
fc.record({ ... })                // Structured objects
fc.array(fc.nat())                // Arrays
```

### PBT Best Practices

1. **Test properties, not examples** — "for all valid inputs, this invariant holds"
2. **Use arbitraries** — avoid hand-crafting input fixtures
3. **Keep properties simple** — one property per `it` block
4. **Seed reproduction** — fast-check reports the seed on failure for reproducibility

## Test Conventions

### File Naming

| Type | Backend | Frontend |
|------|---------|----------|
| Unit test | `foo.spec.ts` | `foo.test.ts` |
| Property-based test | `foo.pbt.spec.ts` | `foo.pbt.spec.ts` |

### Co-location

Tests live **next to** the source file they cover. Do not create separate `__tests__` directories:

```
✅ services/my-service.ts
✅ services/my-service.spec.ts
✅ services/my-service.pbt.spec.ts

❌ __tests__/my-service.spec.ts
```

### Integration Tests

Backend integration tests live in `backend/src/plugins/integration/`. These test cross-plugin interactions and full request flows.

## Running Tests

### Quick Reference

```bash
# Backend — all tests
cd backend && npm test

# Backend — watch mode
cd backend && npm run test:watch

# Backend — PBT only
cd backend && npm run test:pbt

# Frontend — all tests (single run)
cd frontend && npm run test

# Frontend — watch mode
cd frontend && npm run test:watch
```

### CI Integration

Tests run on every push. The CI pipeline executes:

1. Backend: `cd backend && npm test`
2. Frontend: `cd frontend && npm run test`

Both must pass for the build to succeed.
