/**
 * GSPL REPL (Read-Eval-Print Loop) with Live Preview
 * Phase I.3: Interactive GSPL coding environment with real-time output
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { executeGspl, type GSPLContext } from '../../lib/kernel/gspl-interpreter';
import { growSeed, type Seed, type Artifact } from '../../lib/kernel/engines';
import { GsplLexer, TokenType } from '../../lib/kernel/gspl-lexer';
import { GsplParser, ASTNodeType } from '../../lib/kernel/gspl-parser';
import { Play, RotateCcw, Download, Eye, Code2, FileText, AlertCircle, CheckCircle } from 'lucide-react';

// Default GSPL example
const DEFAULT_CODE = `// GSPL REPL - Try it live!
// Generate a character seed and grow it

seed "Demo Hero" in character {
  name = "Hero"
  archetype = "warrior"
  species = "human"
  color = [0.8, 0.2, 0.2]
}

let hero = grow(seed, "character")

// Generate music
seed "Demo Music" in music {
  tempo = 120
  key = "C"
  scale = "major"
}

let track = generate_music(seed)
`;

interface Diagnostic {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface ExecutionResult {
  output: any;
  artifacts: Artifact[];
  diagnostics: Diagnostic[];
  tokens: number;
  astNodes: number;
  executionTime: number;
}

export function GsplRepl() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'output' | 'tokens' | 'ast' | 'preview'>('output');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Execute GSPL code
  const execute = useCallback(async () => {
    setIsExecuting(true);
    const startTime = performance.now();

    try {
      // Lexical analysis
      const lexer = new GsplLexer(code);
      const tokens = lexer.tokenize();
      const tokenCount = tokens.length;

      // Parse
      const parser = new GsplParser(tokens.filter(t => t.type !== TokenType.ERROR));
      const ast = parser.parse();
      const astNodeCount = countNodes(ast);

      // Collect diagnostics
      const diagnostics: Diagnostic[] = [];

      // Lexer errors
      const errorTokens = tokens.filter(t => t.type === TokenType.ERROR);
      for (const err of errorTokens) {
        diagnostics.push({
          line: err.line,
          column: err.column,
          message: `Lexer error: ${err.value}`,
          severity: 'error'
        });
      }

      // Execute
      const context: GSPLContext = {
        seeds: {},
        functions: {},
        variables: {},
        types: {},
        rng: { next: () => Math.random() } // TODO: Use Xoshiro256**
      };

      const output = executeGspl(code, context);

      // Collect artifacts from context
      const artifacts: Artifact[] = [];
      for (const seed of Object.values(context.seeds)) {
        try {
          const artifact = await growSeed(seed as Seed);
          if (artifact) artifacts.push(artifact);
        } catch (e) {
          // Ignore grow errors
        }
      }

      const executionTime = performance.now() - startTime;

      setResult({
        output,
        artifacts,
        diagnostics,
        tokens: tokenCount,
        astNodes: astNodeCount,
        executionTime
      });

      // Generate preview for first artifact
      if (artifacts.length > 0) {
        generatePreview(artifacts[0]);
      }

    } catch (e: any) {
      const executionTime = performance.now() - startTime;
      setResult({
        output: null,
        artifacts: [],
        diagnostics: [{
          line: 0,
          column: 0,
          message: e.message || String(e),
          severity: 'error'
        }],
        tokens: 0,
        astNodes: 0,
        executionTime
      });
    }

    setIsExecuting(false);
  }, [code]);

  // Generate preview URL for artifact
  const generatePreview = (artifact: Artifact) => {
    if (!artifact || !artifact.data) return;

    let blob: Blob;
    let type: string;

    switch (artifact.format) {
      case 'gltf-binary':
        blob = new Blob([artifact.data], { type: 'model/gltf-binary' });
        break;
      case 'wav':
        blob = new Blob([artifact.data], { type: 'audio/wav' });
        break;
      case 'svg':
        blob = new Blob([artifact.data], { type: 'image/svg+xml' });
        break;
      case 'html5':
        blob = new Blob([artifact.data], { type: 'text/html' });
        break;
      default:
        blob = new Blob([JSON.stringify(artifact.data, null, 2)], { type: 'application/json' });
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  // Clear preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  // Syntax highlighting (simple)
  const highlightCode = (code: string): string => {
    return code
      .replace(/(\/\/.*)/g, '<span class="text-green-500">$1</span>')
      .replace(/\b(seed|breed|mutate|compose|evolve|grow|export|import|let|fn|if|else|match|for|while|return|type|trait|impl|where|gene|domain|in|signed)\b/g,
        '<span class="text-purple-500 font-semibold">$1</span>')
      .replace(/\b(true|false|null)\b/g, '<span class="text-orange-500">$1</span>')
      .replace(/"([^"]*)"/g, '<span class="text-yellow-500">"$1"</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-blue-500">$1</span>');
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold">GSPL REPL</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCode(DEFAULT_CODE)}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={execute}
            disabled={isExecuting}
            className="px-4 py-1 text-sm bg-purple-600 hover:bg-purple-500 rounded flex items-center gap-1 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {isExecuting ? 'Executing...' : 'Run'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Code Editor */}
        <div className="flex-1 flex flex-col border-r border-gray-700">
          <div className="px-4 py-1 bg-gray-800 text-sm text-gray-400 border-b border-gray-700">
            main.gspl
          </div>
          <div className="flex-1 relative">
            <textarea
              ref={editorRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="absolute inset-0 w-full h-full bg-gray-900 text-gray-100 font-mono text-sm p-4 resize-none outline-none leading-relaxed"
              spellCheck={false}
              style={{ tabSize: 2 }}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="flex px-4 bg-gray-800 border-b border-gray-700">
            {(['output', 'tokens', 'ast', 'preview'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm capitalize ${
                  activeTab === tab
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'output' && (
              <OutputPanel result={result} />
            )}
            {activeTab === 'tokens' && (
              <TokensPanel code={code} />
            )}
            {activeTab === 'ast' && (
              <ASTPanel code={code} />
            )}
            {activeTab === 'preview' && (
              <PreviewPanel previewUrl={previewUrl} result={result} />
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-1 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          {result && (
            <>
              <span>{result.tokens} tokens</span>
              <span>{result.astNodes} AST nodes</span>
              <span>{result.executionTime.toFixed(2)}ms</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {result?.diagnostics.length === 0 && (
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle className="w-3 h-3" />
              No errors
            </span>
          )}
          {result?.diagnostics.length > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertCircle className="w-3 h-3" />
              {result.diagnostics.length} error(s)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Output Panel
function OutputPanel({ result }: { result: ExecutionResult | null }) {
  if (!result) {
    return (
      <div className="text-gray-500 italic">
        Click "Run" to execute GSPL code...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Diagnostics */}
      {result.diagnostics.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-400">Diagnostics</h3>
          {result.diagnostics.map((d, i) => (
            <div key={i} className={`text-sm p-2 rounded ${
              d.severity === 'error' ? 'bg-red-900/30 text-red-300' :
              d.severity === 'warning' ? 'bg-yellow-900/30 text-yellow-300' :
              'bg-blue-900/30 text-blue-300'
            }`}>
              Line {d.line}:{d.column} - {d.message}
            </div>
          ))}
        </div>
      )}

      {/* Output */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Output</h3>
        <pre className="text-sm bg-gray-800 p-3 rounded overflow-auto">
          {JSON.stringify(result.output, null, 2)}
        </pre>
      </div>

      {/* Artifacts */}
      {result.artifacts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Artifacts</h3>
          {result.artifacts.map((artifact, i) => (
            <div key={i} className="text-sm bg-gray-800 p-3 rounded mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-purple-400">{artifact.domain}</span>
                <span className="text-gray-500">{artifact.format}</span>
              </div>
              <div className="text-xs text-gray-400">
                {artifact.metadata?.generator && `Generator: ${artifact.metadata.generator}`}
              </div>
              {artifact.data && (
                <button
                  onClick={() => {
                    const blob = new Blob([artifact.data]);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `artifact-${i}.${getExtension(artifact.format)}`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="mt-2 px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Tokens Panel
function TokensPanel({ code }: { code: string }) {
  try {
    const lexer = new GsplLexer(code);
    const tokens = lexer.tokenize();

    return (
      <div className="space-y-1">
        <div className="text-sm text-gray-400 mb-2">{tokens.length} tokens</div>
        {tokens.map((token, i) => (
          <div key={i} className="text-xs font-mono flex gap-2">
            <span className="text-gray-500 w-8">{i}</span>
            <span className="text-purple-400 w-24">{TokenType[token.type]}</span>
            <span className="text-gray-300">{token.value}</span>
            <span className="text-gray-600 ml-auto">L{token.line}:C{token.column}</span>
          </div>
        ))}
      </div>
    );
  } catch (e: any) {
    return <div className="text-red-400">Error: {e.message}</div>;
  }
}

// AST Panel
function ASTPanel({ code }: { code: string }) {
  try {
    const lexer = new GsplLexer(code);
    const tokens = lexer.tokenize();
    const parser = new GsplParser(tokens.filter(t => t.type !== TokenType.ERROR));
    const ast = parser.parse();

    return (
      <div className="space-y-1">
        <div className="text-sm text-gray-400 mb-2">Abstract Syntax Tree</div>
        <pre className="text-xs bg-gray-800 p-3 rounded overflow-auto">
          {JSON.stringify(ast, null, 2)}
        </pre>
      </div>
    );
  } catch (e: any) {
    return <div className="text-red-400">Error: {e.message}</div>;
  }
}

// Preview Panel
function PreviewPanel({ previewUrl, result }: { previewUrl: string | null; result: ExecutionResult | null }) {
  if (!previewUrl || !result?.artifacts.length) {
    return (
      <div className="text-gray-500 italic flex items-center justify-center h-full">
        <div className="text-center">
          <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Run code to see preview</p>
        </div>
      </div>
    );
  }

  const artifact = result.artifacts[0];

  return (
    <div className="h-full">
      {artifact.format === 'html5' && (
        <iframe
          src={previewUrl}
          className="w-full h-full border-0"
          title="Preview"
        />
      )}
      {artifact.format === 'svg' && (
        <div className="w-full h-full flex items-center justify-center bg-white rounded">
          <img src={previewUrl} alt="SVG Preview" className="max-w-full max-h-full" />
        </div>
      )}
      {artifact.format === 'wav' && (
        <div className="flex items-center justify-center h-full">
          <audio controls src={previewUrl} className="w-full max-w-md" />
        </div>
      )}
      {artifact.format === 'gltf-binary' && (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <p>GLTF Preview (3D viewer not yet integrated)</p>
            <a href={previewUrl} download className="text-purple-400 hover:underline">
              Download .glb file
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function countNodes(node: any): number {
  if (!node) return 0;
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

function getExtension(format: string): string {
  const map: Record<string, string> = {
    'gltf-binary': 'glb',
    'wav': 'wav',
    'svg': 'svg',
    'html5': 'html',
    'json': 'json'
  };
  return map[format] || 'bin';
}
