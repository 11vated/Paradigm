/**
 * Express middleware for Zod request body validation.
 * Returns 400 with structured error details on validation failure.
 */
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e: any) => ({
        field: e.path.join('.') || 'body',
        message: e.message,
        code: e.code,
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }
    // Replace body with parsed + defaulted values
    req.body = result.data;
    next();
  };
}
