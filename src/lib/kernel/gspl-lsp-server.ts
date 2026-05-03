/**
 * GSPL Language Server Protocol (LSP) Server
 * Phase I.3: Provides IDE features for GSPL language
 * 
 * Features:
 * - Text document synchronization
 * - Completion (keywords, builtins, gene types, domains)
 * - Hover (type info, documentation)
 * - Diagnostics (syntax errors, type errors)
 * - Go to Definition
 * - Document Symbols
 * - Semantic Tokens
 */

import { GsplLexer, TokenType, type Token } from './gspl-lexer.js';
import { GsplParser, ASTNodeType, type ASTNode } from './gspl-parser.js';
import { GeneType } from '../../seeds/types.js';

// LSP Protocol Types
interface Position {
  line: number;
  character: number;
}

interface Range {
  start: Position;
  end: Position;
}

interface Location {
  uri: string;
  range: Range;
}

interface Diagnostic {
  range: Range;
  severity: 1 | 2 | 3 | 4; // Error, Warning, Info, Hint
  message: string;
  source?: string;
}

interface CompletionItem {
  label: string;
  kind: number;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
}

interface Hover {
  contents: string | { kind: 'markdown'; value: string };
  range?: Range;
}

interface SymbolInformation {
  name: string;
  kind: number;
  location: Location;
}

interface SemanticToken {
  line: number;
  char: number;
  length: number;
  tokenType: number;
  tokenModifiers: number;
}

// LSP Message Types
interface LSPMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: { code: number; message: string };
}

// GSPL Language Data
const GSPL_KEYWORDS = [
  'seed', 'breed', 'mutate', 'compose', 'evolve', 'grow', 'export', 'import',
  'let', 'fn', 'if', 'else', 'match', 'for', 'while', 'return',
  'true', 'false', 'type', 'trait', 'impl', 'where', 'gene', 'domain', 'in', 'signed', 'null', 'pub', 'pure', 'as'
];

const GSPL_BUILTINS = [
  { name: 'random', signature: 'random() -> scalar', detail: 'Seeded random number' },
  { name: 'print', signature: 'print(value)', detail: 'Output to console' },
  { name: 'mutate', signature: 'mutate(seed, rate?)', detail: 'Kernel mutation operator' },
  { name: 'crossover', signature: 'crossover(seedA, seedB)', detail: 'Kernel crossover operator' },
  { name: 'select', signature: 'select(population, fitnessFn)', detail: 'Kernel selection operator' },
  { name: 'generate_character', signature: 'generate_character(seed)', detail: 'Generate character GLTF' },
  { name: 'generate_music', signature: 'generate_music(seed)', detail: 'Generate music WAV' },
  { name: 'generate_visual2d', signature: 'generate_visual2d(seed)', detail: 'Generate SVG' },
  { name: 'generate_game', signature: 'generate_game(seed)', detail: 'Generate HTML5 game' },
  { name: 'generate_geometry3d', signature: 'generate_geometry3d(seed)', detail: 'Generate 3D geometry GLTF' },
  { name: 'evolve', signature: 'evolve(args)', detail: 'Evolution algorithm (GA)' },
  { name: 'map_elites', signature: 'map_elites(args)', detail: 'MAP-Elites algorithm' },
  { name: 'cma_es', signature: 'cma_es(args)', detail: 'CMA-ES optimization' },
];

const GSPL_GENE_TYPES = Object.values(GeneType).map(g => ({
  name: g,
  detail: `Gene type: ${g}`
}));

const GSPL_DOMAINS = [
  'character', 'music', 'visual2d', 'game', 'geometry3d', 'audio', 'sprite',
  'animation', 'narrative', 'shader', 'physics', 'ui', 'typography',
  'architecture', 'vehicle', 'furniture', 'fashion', 'robotics', 'circuit',
  'food', 'choreography', 'agent', 'ecosystem', 'particle', '3d-printing',
  'biotechnology', 'publishing'
];

// Semantic Token Types (LSP standard)
const SEMANTIC_TOKEN_TYPES = [
  'keyword', 'comment', 'string', 'number', 'type', 'function',
  'variable', 'parameter', 'property', 'enum', 'enumMember', 'event',
  'operator', 'namespace', 'struct', 'gene', 'domain', 'builtin'
];

export class GsplLspServer {
  private documents: Map<string, { text: string; version: number; ast?: ASTNode }> = new Map();
  private initialized = false;

  // LSP Message Handler
  handleMessage(message: LSPMessage): LSPMessage | null {
    if (!message.method) return null;

    switch (message.method) {
      case 'initialize':
        return this.handleInitialize(message);
      case 'initialized':
        this.initialized = true;
        return { jsonrpc: '2.0', id: message.id };
      case 'shutdown':
        return { jsonrpc: '2.0', id: message.id, result: null };
      case 'exit':
        process.exit(0);
      case 'textDocument/didOpen':
        return this.handleDidOpen(message);
      case 'textDocument/didChange':
        return this.handleDidChange(message);
      case 'textDocument/didClose':
        return this.handleDidClose(message);
      case 'textDocument/completion':
        return this.handleCompletion(message);
      case 'textDocument/hover':
        return this.handleHover(message);
      case 'textDocument/definition':
        return this.handleDefinition(message);
      case 'textDocument/documentSymbol':
        return this.handleDocumentSymbol(message);
      case 'textDocument/semanticTokens/full':
        return this.handleSemanticTokens(message);
      case 'textDocument/publishDiagnostics':
        return this.handleDiagnostics(message);
      default:
        return { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Method not found' } };
    }
  }

  private handleInitialize(msg: LSPMessage): LSPMessage {
    return {
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        capabilities: {
          textDocumentSync: 1, // Full sync
          completionProvider: {
            triggerCharacters: ['.', ':', ' '],
            resolveProvider: false
          },
          hoverProvider: true,
          definitionProvider: true,
          documentSymbolProvider: true,
          semanticTokensProvider: {
            legend: {
              tokenTypes: SEMANTIC_TOKEN_TYPES,
              tokenModifiers: []
            },
            full: true
          },
          publishDiagnosticsProvider: true
        },
        serverInfo: {
          name: 'gspl-lsp',
          version: '1.0.0'
        }
      }
    };
  }

  private handleDidOpen(msg: LSPMessage): LSPMessage | null {
    const params = msg.params;
    const uri = params.textDocument.uri;
    const text = params.textDocument.text;
    const version = params.textDocument.version;

    this.documents.set(uri, { text, version });
    this.validateDocument(uri, text);

    return null; // Notification, no response
  }

  private handleDidChange(msg: LSPMessage): LSPMessage | null {
    const params = msg.params;
    const uri = params.textDocument.uri;
    const changes = params.contentChanges;

    const doc = this.documents.get(uri);
    if (!doc) return null;

    // Apply changes (full document sync)
    if (changes.length > 0) {
      doc.text = changes[0].text;
      doc.version = params.textDocument.version;
      this.validateDocument(uri, doc.text);
    }

    return null;
  }

  private handleDidClose(msg: LSPMessage): LSPMessage | null {
    const uri = msg.params.textDocument.uri;
    this.documents.delete(uri);
    return null;
  }

  private handleCompletion(msg: LSPMessage): LSPMessage {
    const params = msg.params;
    const uri = params.textDocument.uri;
    const position = params.position;

    const doc = this.documents.get(uri);
    if (!doc) {
      return { jsonrpc: '2.0', id: msg.id, result: { items: [] } };
    }

    const items: CompletionItem[] = [];

    // Add keywords
    for (const kw of GSPL_KEYWORDS) {
      items.push({
        label: kw,
        kind: 14, // Keyword
        detail: `GSPL keyword: ${kw}`,
        sortText: `0_${kw}`
      });
    }

    // Add builtins
    for (const builtin of GSPL_BUILTINS) {
      items.push({
        label: builtin.name,
        kind: 3, // Function
        detail: builtin.signature,
        documentation: builtin.detail,
        sortText: `1_${builtin.name}`
      });
    }

    // Add gene types
    for (const gene of GSPL_GENE_TYPES) {
      items.push({
        label: gene.name,
        kind: 22, // Enum
        detail: gene.detail,
        sortText: `2_${gene.name}`
      });
    }

    // Add domains
    for (const domain of GSPL_DOMAINS) {
      items.push({
        label: domain,
        kind: 6, // Module
        detail: `Domain: ${domain}`,
        sortText: `3_${domain}`
      });
    }

    // Add snippets
    items.push(
      {
        label: 'seed',
        kind: 15, // Snippet
        detail: 'seed "Name" in domain { ... }',
        insertText: 'seed "${1:name}" in ${2:domain} {\n\t$0\n}',
        sortText: '4_seed'
      },
      {
        label: 'fn',
        kind: 15,
        detail: 'fn name(params) -> returnType { ... }',
        insertText: 'fn ${1:name}(${2:params}) -> ${3:returnType} {\n\t$0\n}',
        sortText: '4_fn'
      },
      {
        label: 'let',
        kind: 15,
        detail: 'let name = value',
        insertText: 'let ${1:name} = ${2:value}',
        sortText: '4_let'
      },
      {
        label: '@gpu',
        kind: 15,
        detail: '@gpu fn name(params) -> returnType { ... }',
        insertText: '@gpu\nfn ${1:name}(${2:params}) -> ${3:returnType} {\n\t$0\n}',
        sortText: '4_gpu'
      }
    );

    return {
      jsonrpc: '2.0',
      id: msg.id,
      result: { items, isIncomplete: false }
    };
  }

  private handleHover(msg: LSPMessage): LSPMessage {
    const params = msg.params;
    const uri = params.textDocument.uri;
    const position = params.position;

    const doc = this.documents.get(uri);
    if (!doc) {
      return { jsonrpc: '2.0', id: msg.id, result: null };
    }

    const word = this.getWordAtPosition(doc.text, position);
    if (!word) {
      return { jsonrpc: '2.0', id: msg.id, result: null };
    }

    // Check keywords
    if (GSPL_KEYWORDS.includes(word)) {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          contents: { kind: 'markdown', value: `**GSPL Keyword**: \`${word}\`` }
        }
      };
    }

    // Check builtins
    const builtin = GSPL_BUILTINS.find(b => b.name === word);
    if (builtin) {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          contents: {
            kind: 'markdown',
            value: `**${builtin.name}**\n\n\`${builtin.signature}\`\n\n${builtin.detail}`
          }
        }
      };
    }

    // Check gene types
    if (Object.values(GeneType).includes(word as any)) {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          contents: { kind: 'markdown', value: `**Gene Type**: \`${word}\`` }
        }
      };
    }

    // Check domains
    if (GSPL_DOMAINS.includes(word)) {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          contents: { kind: 'markdown', value: `**Domain**: \`${word}\`\n\nOutput format: ${this.getDomainOutput(word)}` }
        }
      };
    }

    return { jsonrpc: '2.0', id: msg.id, result: null };
  }

  private handleDefinition(msg: LSPMessage): LSPMessage {
    const params = msg.params;
    const uri = params.textDocument.uri;
    const position = params.position;

    const doc = this.documents.get(uri);
    if (!doc) {
      return { jsonrpc: '2.0', id: msg.id, result: [] };
    }

    // Parse AST if not cached
    if (!doc.ast) {
      try {
        const lexer = new GsplLexer(doc.text);
        const tokens = lexer.tokenize();
        const parser = new GsplParser(tokens);
        doc.ast = parser.parse();
      } catch {
        return { jsonrpc: '2.0', id: msg.id, result: [] };
      }
    }

    const word = this.getWordAtPosition(doc.text, position);
    if (!word) {
      return { jsonrpc: '2.0', id: msg.id, result: [] };
    }

    // Find definition in AST
    const locations: Location[] = [];
    this.findDefinitionInAST(doc.ast, word, uri, locations);

    return { jsonrpc: '2.0', id: msg.id, result: locations };
  }

  private handleDocumentSymbol(msg: LSPMessage): LSPMessage {
    const params = msg.params;
    const uri = params.textDocument.uri;

    const doc = this.documents.get(uri);
    if (!doc) {
      return { jsonrpc: '2.0', id: msg.id, result: [] };
    }

    // Parse AST
    let ast: ASTNode;
    try {
      const lexer = new GsplLexer(doc.text);
      const tokens = lexer.tokenize();
      const parser = new GsplParser(tokens);
      ast = parser.parse();
    } catch {
      return { jsonrpc: '2.0', id: msg.id, result: [] };
    }

    const symbols: SymbolInformation[] = [];
    this.collectSymbolsFromAST(ast, uri, symbols);

    return { jsonrpc: '2.0', id: msg.id, result: symbols };
  }

  private handleSemanticTokens(msg: LSPMessage): LSPMessage {
    const params = msg.params;
    const uri = params.textDocument.uri;

    const doc = this.documents.get(uri);
    if (!doc) {
      return { jsonrpc: '2.0', id: msg.id, result: { data: [] } };
    }

    try {
      const lexer = new GsplLexer(doc.text);
      const tokens = lexer.tokenize();

      const semanticTokens: number[] = [];
      let prevLine = 0;
      let prevChar = 0;

      for (const token of tokens) {
        const tokenType = this.getTokenType(token.type);
        if (tokenType === -1) continue;

        const line = token.line - 1;
        const char = token.column - 1;
        const length = token.value.length;

        // LSP semantic tokens are delta-encoded
        const deltaLine = line - prevLine;
        const deltaChar = deltaLine === 0 ? char - prevChar : char;

        semanticTokens.push(deltaLine, deltaChar, length, tokenType, 0);

        prevLine = line;
        prevChar = char;
      }

      return {
        jsonrpc: '2.0',
        id: msg.id,
        result: { data: semanticTokens }
      };
    } catch {
      return { jsonrpc: '2.0', id: msg.id, result: { data: [] } };
    }
  }

  private handleDiagnostics(msg: LSPMessage): LSPMessage {
    // This is a notification, we publish diagnostics via the server
    return { jsonrpc: '2.0', id: msg.id, result: null };
  }

  private validateDocument(uri: string, text: string): void {
    const diagnostics: Diagnostic[] = [];

    try {
      const lexer = new GsplLexer(text);
      const tokens = lexer.tokenize();

      // Check for lexer errors
      const errorTokens = tokens.filter(t => t.type === TokenType.ERROR);
      for (const err of errorTokens) {
        diagnostics.push({
          range: {
            start: { line: err.line - 1, character: err.column - 1 },
            end: { line: err.line - 1, character: err.column - 1 + err.value.length }
          },
          severity: 1, // Error
          message: `Lexer error: ${err.value}`,
          source: 'gspl-lsp'
        });
      }

      // Try to parse
      const parser = new GsplParser(tokens.filter(t => t.type !== TokenType.ERROR));
      parser.parse();
    } catch (e: any) {
      const msg = e.message || String(e);
      const match = msg.match(/line (\d+), column (\d+)/);
      const line = match ? parseInt(match[1]) - 1 : 0;
      const col = match ? parseInt(match[2]) - 1 : 0;

      diagnostics.push({
        range: {
          start: { line, character: col },
          end: { line, character: col + 10 }
        },
        severity: 1,
        message: msg,
        source: 'gspl-lsp'
      });
    }

    // Publish diagnostics (in real LSP, this would be sent as notification)
    this.publishDiagnostics(uri, diagnostics);
  }

  private publishDiagnostics(uri: string, diagnostics: Diagnostic[]): void {
    // In a real implementation, send textDocument/publishDiagnostics notification
    // For now, we'll store them for retrieval
    const doc = this.documents.get(uri);
    if (doc) {
      (doc as any).diagnostics = diagnostics;
    }
  }

  // Helper methods
  private getWordAtPosition(text: string, position: Position): string | null {
    const lines = text.split('\n');
    if (position.line >= lines.length) return null;

    const line = lines[position.line];
    if (position.character >= line.length) return null;

    // Find word boundaries
    const wordRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    let match;
    while ((match = wordRegex.exec(line)) !== null) {
      if (match.index <= position.character && position.character <= match.index + match[0].length) {
        return match[0];
      }
    }

    return null;
  }

  private getDomainOutput(domain: string): string {
    const outputs: Record<string, string> = {
      'character': 'gltf-binary',
      'music': 'wav/mp3/flac',
      'visual2d': 'svg/png/jpeg',
      'game': 'html5/wasm',
      'geometry3d': 'gltf-binary',
      'audio': 'wav/mp3/ogg',
      'sprite': 'png/gif',
      'animation': 'png-sequence/gif/webp',
      'narrative': 'txt/json/html',
      'shader': 'glsl/wgsl',
      'physics': 'json',
      'ui': 'html/figma'
    };
    return outputs[domain] || 'custom';
  }

  private getTokenType(tokenType: TokenType): number {
    switch (tokenType) {
      case TokenType.KEYWORD: return SEMANTIC_TOKEN_TYPES.indexOf('keyword');
      case TokenType.STRING: return SEMANTIC_TOKEN_TYPES.indexOf('string');
      case TokenType.INT:
      case TokenType.FLOAT: return SEMANTIC_TOKEN_TYPES.indexOf('number');
      case TokenType.IDENTIFIER: return SEMANTIC_TOKEN_TYPES.indexOf('variable');
      case TokenType.COMMENT: return SEMANTIC_TOKEN_TYPES.indexOf('comment');
      default: return -1;
    }
  }

  private findDefinitionInAST(node: ASTNode, word: string, uri: string, locations: Location[]): void {
    if (!node) return;

    // Check seed declarations
    if (node.type === ASTNodeType.SEED_DECL && node.name === word) {
      locations.push({
        uri,
        range: {
          start: { line: (node as any).line - 1 || 0, character: 0 },
          end: { line: (node as any).line - 1 || 0, character: 100 }
        }
      });
    }

    // Check function declarations
    if (node.type === ASTNodeType.FN_DECL && node.name === word) {
      locations.push({
        uri,
        range: {
          start: { line: (node as any).line - 1 || 0, character: 0 },
          end: { line: (node as any).line - 1 || 0, character: 100 }
        }
      });
    }

    // Recurse
    if (node.children) {
      for (const child of node.children) {
        this.findDefinitionInAST(child, word, uri, locations);
      }
    }
  }

  private collectSymbolsFromAST(node: ASTNode, uri: string, symbols: SymbolInformation[]): void {
    if (!node) return;

    const kindMap: Record<string, number> = {
      [ASTNodeType.SEED_DECL]: 2, // Function (seed is like a function)
      [ASTNodeType.FN_DECL]: 12, // Function
      [ASTNodeType.TYPE_DECL]: 5, // Class/Type
      [ASTNodeType.LET_DECL]: 13, // Variable
    };

    const kind = kindMap[node.type];
    if (kind && node.name) {
      symbols.push({
        name: node.name,
        kind,
        location: {
          uri,
          range: {
            start: { line: (node as any).line - 1 || 0, character: 0 },
            end: { line: (node as any).line - 1 || 0, character: 100 }
          }
        }
      });
    }

    if (node.children) {
      for (const child of node.children) {
        this.collectSymbolsFromAST(child, uri, symbols);
      }
    }
  }
}

// LSP Server STDIO Transport
class LspStdioTransport {
  private server: GsplLspServer;
  private buffer = '';

  constructor() {
    this.server = new GsplLspServer();
  }

  start(): void {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => this.onData(chunk));
    process.stdin.on('end', () => process.exit(0));
  }

  private onData(chunk: string): void {
    this.buffer += chunk;

    while (true) {
      // Check for Content-Length header
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const header = this.buffer.substring(0, headerEnd);
      const contentLengthMatch = header.match(/Content-Length:\s*(\d+)/i);
      if (!contentLengthMatch) {
        this.buffer = this.buffer.substring(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1]);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;

      if (this.buffer.length < messageEnd) break; // Wait for more data

      const messageStr = this.buffer.substring(messageStart, messageEnd);
      this.buffer = this.buffer.substring(messageEnd);

      try {
        const message: LSPMessage = JSON.parse(messageStr);
        const response = this.server.handleMessage(message);

        if (response) {
          this.sendMessage(response);
        }
      } catch (e) {
        console.error('Error processing message:', e);
      }
    }
  }

  private sendMessage(message: LSPMessage): void {
    const json = JSON.stringify(message);
    const contentLength = Buffer.byteLength(json, 'utf8');
    const header = `Content-Length: ${contentLength}\r\n\r\n`;
    process.stdout.write(header + json);
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const transport = new LspStdioTransport();
  transport.start();
}
