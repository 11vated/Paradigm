/**
 * Pagination Middleware Tests
 * 
 * Tests for memory exhaustion prevention via pagination
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parsePaginationParams,
  parseCursorParams,
  createPaginationMeta,
  createCursorMeta,
  paginateArray,
  LazyIterator,
  filterStream,
  sortWithLimit,
  encodeCursor,
  decodeCursor,
  PAGINATION_DEFAULTS,
} from '../../src/server/middleware/pagination';

describe('Pagination Middleware', () => {
  describe('parsePaginationParams', () => {
    it('should parse valid pagination parameters', () => {
      const req = {
        query: { page: '2', limit: '25', sort: 'name', order: 'desc' },
      } as any;

      const params = parsePaginationParams(req);

      expect(params.page).toBe(2);
      expect(params.limit).toBe(25);
      expect(params.offset).toBe(25);
      expect(params.sort).toBe('name');
      expect(params.order).toBe('desc');
    });

    it('should enforce maximum limit', () => {
      const req = {
        query: { limit: '1000' },
      } as any;

      const params = parsePaginationParams(req);

      expect(params.limit).toBe(PAGINATION_DEFAULTS.MAX_LIMIT);
    });

    it('should enforce minimum limit', () => {
      const req = {
        query: { limit: '0' },
      } as any;

      const params = parsePaginationParams(req);

      // When limit is invalid (0 or negative), defaults to DEFAULT_LIMIT
      expect(params.limit).toBe(PAGINATION_DEFAULTS.DEFAULT_LIMIT);
    });

    it('should use defaults for missing parameters', () => {
      const req = { query: {} } as any;

      const params = parsePaginationParams(req);

      expect(params.page).toBe(PAGINATION_DEFAULTS.DEFAULT_PAGE);
      expect(params.limit).toBe(PAGINATION_DEFAULTS.DEFAULT_LIMIT);
      expect(params.offset).toBe(0);
    });

    it('should enforce maximum page number', () => {
      const req = {
        query: { page: '99999' },
      } as any;

      const params = parsePaginationParams(req);

      expect(params.page).toBe(PAGINATION_DEFAULTS.MAX_PAGE);
    });
  });

  describe('parseCursorParams', () => {
    it('should parse cursor parameters', () => {
      const req = {
        query: { cursor: 'abc123', limit: '30', direction: 'backward' },
      } as any;

      const params = parseCursorParams(req);

      expect(params.cursor).toBe('abc123');
      expect(params.limit).toBe(30);
      expect(params.direction).toBe('backward');
    });

    it('should default to forward direction', () => {
      const req = { query: {} } as any;

      const params = parseCursorParams(req);

      expect(params.direction).toBe('forward');
    });
  });

  describe('createPaginationMeta', () => {
    it('should create correct metadata for first page', () => {
      const meta = createPaginationMeta(1, 10, 100);

      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(10);
      expect(meta.total).toBe(100);
      expect(meta.totalPages).toBe(10);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(false);
      expect(meta.offset).toBe(0);
    });

    it('should create correct metadata for middle page', () => {
      const meta = createPaginationMeta(5, 10, 100);

      expect(meta.page).toBe(5);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(true);
      expect(meta.offset).toBe(40);
    });

    it('should create correct metadata for last page', () => {
      const meta = createPaginationMeta(10, 10, 100);

      expect(meta.page).toBe(10);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(true);
      expect(meta.offset).toBe(90);
    });
  });

  describe('createCursorMeta', () => {
    it('should create cursor metadata with more items', () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' },
      ];

      const meta = createCursorMeta(items, 2, (item) => item.id);

      expect(meta.hasMore).toBe(true);
      expect(meta.nextCursor).toBe('2');
      expect(meta.prevCursor).toBe('1');
      expect(meta.limit).toBe(2);
    });

    it('should create cursor metadata without more items', () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      const meta = createCursorMeta(items, 5, (item) => item.id);

      expect(meta.hasMore).toBe(false);
      expect(meta.nextCursor).toBe(null);
    });
  });

  describe('paginateArray', () => {
    it('should paginate array correctly', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const params = { page: 2, limit: 10, offset: 10 };

      const result = paginateArray(items, params);

      expect(result.items).toHaveLength(10);
      expect(result.items[0].id).toBe(10);
      expect(result.items[9].id).toBe(19);
      expect(result.meta.total).toBe(100);
      expect(result.meta.totalPages).toBe(10);
    });

    it('should handle last page with fewer items', () => {
      const items = Array.from({ length: 95 }, (_, i) => ({ id: i }));
      const params = { page: 10, limit: 10, offset: 90 };

      const result = paginateArray(items, params);

      expect(result.items).toHaveLength(5);
      expect(result.meta.total).toBe(95);
    });
  });

  describe('LazyIterator', () => {
    it('should iterate through items in batches', () => {
      const items = Array.from({ length: 25 }, (_, i) => i);
      const iterator = new LazyIterator(items, 10);

      expect(iterator.hasNext()).toBe(true);
      expect(iterator.remaining()).toBe(25);

      const batch1 = iterator.next();
      expect(batch1).toHaveLength(10);
      expect(batch1[0]).toBe(0);
      expect(iterator.remaining()).toBe(15);

      const batch2 = iterator.next();
      expect(batch2).toHaveLength(10);
      expect(batch2[0]).toBe(10);

      const batch3 = iterator.next();
      expect(batch3).toHaveLength(5);
      expect(batch3[0]).toBe(20);

      expect(iterator.hasNext()).toBe(false);
      expect(iterator.remaining()).toBe(0);
    });

    it('should reset iterator', () => {
      const items = [1, 2, 3, 4, 5];
      const iterator = new LazyIterator(items, 2);

      iterator.next();
      iterator.next();
      expect(iterator.remaining()).toBe(1);

      iterator.reset();
      expect(iterator.remaining()).toBe(5);
      expect(iterator.hasNext()).toBe(true);
    });
  });

  describe('filterStream', () => {
    it('should filter items in batches', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const predicate = (n: number) => n % 2 === 0;

      const batches = Array.from(filterStream(items, predicate, 10));

      expect(batches.length).toBeGreaterThan(0);
      const allFiltered = batches.flat();
      expect(allFiltered).toHaveLength(50);
      expect(allFiltered.every((n) => n % 2 === 0)).toBe(true);
    });

    it('should skip empty batches', () => {
      const items = [1, 3, 5, 7, 9];
      const predicate = (n: number) => n % 2 === 0;

      const batches = Array.from(filterStream(items, predicate, 2));

      expect(batches).toHaveLength(0);
    });
  });

  describe('sortWithLimit', () => {
    it('should sort and limit results', () => {
      const items = [5, 2, 8, 1, 9, 3, 7, 4, 6];
      const compareFn = (a: number, b: number) => a - b;

      const result = sortWithLimit(items, compareFn, 5);

      expect(result).toHaveLength(5);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle large arrays efficiently', () => {
      const items = Array.from({ length: 10000 }, (_, i) => 10000 - i);
      const compareFn = (a: number, b: number) => a - b;

      const result = sortWithLimit(items, compareFn, 10);

      expect(result).toHaveLength(10);
      expect(result[0]).toBe(1);
      expect(result[9]).toBe(10);
    });
  });

  describe('Cursor encoding/decoding', () => {
    it('should encode and decode cursor', () => {
      const data = { id: '123', timestamp: 1234567890 };

      const encoded = encodeCursor(data);
      expect(typeof encoded).toBe('string');

      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(data);
    });

    it('should handle invalid cursor', () => {
      const decoded = decodeCursor('invalid-cursor');
      expect(decoded).toBe(null);
    });

    it('should handle complex data', () => {
      const data = {
        id: 'abc-123',
        nested: { value: 42, array: [1, 2, 3] },
        timestamp: Date.now(),
      };

      const encoded = encodeCursor(data);
      const decoded = decodeCursor(encoded);

      expect(decoded).toEqual(data);
    });
  });
});

// Made with Bob
