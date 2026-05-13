/**
 * Express middleware for Zod request body validation.
 * Returns 400 with structured error details on validation failure.
 */
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Get helpful suggestion for common validation errors
 */
function getSuggestion(field: string, code: string, message: string): string {
  if (code === 'invalid_value') {
    return `Check the spelling. Common values include: 'character', 'sprite', 'music', 'visual2d', 'geometry3d', 'fullgame'`;
  }
  if (code === 'invalid_type') {
    if (message.includes('string')) {
      return `Make sure to provide a text value, e.g., "${field}": "example"`;
    }
    if (message.includes('number')) {
      return `Make sure to provide a numeric value, e.g., "${field}": 0.5`;
    }
    if (message.includes('object')) {
      return `Make sure to provide an object, e.g., "${field}": { ... }`;
    }
  }
  if (code === 'too_small') {
    return `The value is too short. Minimum length is typically 1-3 characters`;
  }
  if (code === 'too_big') {
    return `The value is too long. Maximum length is typically 128-256 characters`;
  }
  return `Check the API documentation for the correct format`;
}

/**
 * Get example value for common fields
 */
function getExample(field: string): any {
  const examples: Record<string, any> = {
    domain: 'character',
    name: 'My Warrior',
    prompt: 'A brave warrior with golden armor',
    rate: 0.1,
    target_domain: 'sprite',
    gene_name: 'size',
    gene_type: 'scalar',
    value: 0.75,
    owner: '0x...',
    private_key: '<redacted>',
    public_key: '<your-public-key>',
  };
  return examples[field] || '...';
}

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e: any) => {
        const field = e.path.join('.') || 'body';
        const message = e.message;
        const code = e.code;
        const suggestion = getSuggestion(field, code, message);
        const example = getExample(field);
        
        return {
          field,
          message,
          code,
          suggestion,
          example: { [field]: example },
          docs: `/api/docs#${field}`,
        };
      });
      
      // Get the most critical error (first one)
      const primaryError = errors[0];
      
      return res.status(400).json({
        error: 'Validation failed',
        message: `${primaryError.message} for field '${primaryError.field}'`,
        details: errors,
        suggestion: primaryError.suggestion,
        example: primaryError.example,
        docs: primaryError.docs,
        help: 'Visit /api/docs for complete API documentation',
      });
    }
    // Replace body with parsed + defaulted values
    req.body = result.data;
    next();
  };
}
