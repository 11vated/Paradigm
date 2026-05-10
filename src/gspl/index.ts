/**
 * GSPL Module Redirect
 * 
 * DEPRECATED: This module is kept for backward compatibility.
 * All GSPL functionality is now available from src/lib/gspl/
 * 
 * Migration: Change imports from './gspl/' to '../lib/gspl/'
 */

export * from '../lib/gspl/index.js';
export { Lexer, TokenType } from './lexer';
export type { Token } from './lexer';
export { Parser, ASTNodeType } from './parser';
export type { ASTNode, Program } from './parser';
export { Interpreter, GSPLRuntimeError } from './interpreter';
export { TypeChecker } from './type-checker';