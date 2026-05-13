/**
 * GSPL Module Redirect
 * 
 * @deprecated This module is kept for backward compatibility only.
 * All GSPL functionality is now available from src/lib/gspl/
 * 
 * Migration: Change imports from './gspl/' to '../lib/gspl/'
 */

export { tokenize, parse, executeGSPL, typeCheck, TokenType } from '../lib/gspl/index.js';
export type { Token, ASTNode, Program } from '../lib/gspl/index.js';