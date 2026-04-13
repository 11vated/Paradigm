import fs from 'fs/promises';
import path from 'path';
import { IntelligenceLayer } from '../intelligence/index.js';

interface DocumentChunk {
  id: string;
  content: string;
  embedding?: number[];
}

// ─── LRU Embedding Cache ──────────────────────────────────────────────────────
// Avoids recomputing embeddings for identical text across init cycles.

class EmbeddingCache {
  private cache = new Map<string, number[]>();
  private maxSize: number;

  constructor(maxSize = 512) { this.maxSize = maxSize; }

  get(text: string): number[] | undefined { return this.cache.get(text); }

  set(text: string, embedding: number[]): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(text, embedding);
  }
}

const embeddingCache = new EmbeddingCache();

// ─── Markdown-Aware Chunking ──────────────────────────────────────────────────
// Respects code fences, tables, and headers instead of naively splitting on \n\n.

function chunkMarkdown(content: string, maxChunkSize = 1200): string[] {
  const chunks: string[] = [];
  let current = '';
  let inCodeBlock = false;

  const lines = content.split('\n');
  for (const line of lines) {
    // Track code fence boundaries
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    }

    // Split at headings (but not inside code blocks) when chunk is large enough
    const isHeading = !inCodeBlock && /^#{1,4}\s/.test(line);
    if (isHeading && current.length > 100) {
      chunks.push(current.trim());
      current = '';
    }

    current += line + '\n';

    // If we're not inside a code block and the chunk is getting large,
    // split at the next blank line
    if (!inCodeBlock && current.length >= maxChunkSize && line.trim() === '') {
      chunks.push(current.trim());
      current = '';
    }
  }

  if (current.trim().length > 20) {
    chunks.push(current.trim());
  }

  return chunks.filter(c => c.length > 20);
}

// ─── RAG Retriever ────────────────────────────────────────────────────────────

export class RAGRetriever {
  private docsPath: string;
  private chunks: DocumentChunk[] = [];
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.docsPath = path.join(process.cwd(), 'docs');
  }

  async init() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const files = await fs.readdir(this.docsPath);
        for (const file of files) {
          if (file.endsWith('.md') || file.endsWith('.txt')) {
            const content = await fs.readFile(path.join(this.docsPath, file), 'utf-8');
            const fileChunks = chunkMarkdown(content);

            for (let i = 0; i < fileChunks.length; i++) {
              this.chunks.push({
                id: `${file}-chunk-${i}`,
                content: fileChunks[i],
              });
            }
          }
        }

        // Generate embeddings with caching
        for (const chunk of this.chunks) {
          const cached = embeddingCache.get(chunk.content);
          if (cached) {
            chunk.embedding = cached;
          } else {
            chunk.embedding = await IntelligenceLayer.generateTextEmbedding(chunk.content);
            embeddingCache.set(chunk.content, chunk.embedding);
          }
        }

        this.initialized = true;
        console.log(`RAG Retriever initialized with ${this.chunks.length} chunks.`);
      } catch (e) {
        console.error('Failed to initialize RAG Retriever:', e);
      }
    })();

    return this.initPromise;
  }

  async query(queryText: string, topK: number = 3): Promise<string[]> {
    await this.init();

    if (this.chunks.length === 0) {
      return [];
    }

    try {
      // Check embedding cache for query too
      let queryEmbedding = embeddingCache.get(queryText);
      if (!queryEmbedding) {
        queryEmbedding = await IntelligenceLayer.generateTextEmbedding(queryText);
        embeddingCache.set(queryText, queryEmbedding);
      }

      const scoredChunks = this.chunks
        .filter(c => c.embedding)
        .map(c => ({
          content: c.content,
          score: IntelligenceLayer.cosineSimilarity(queryEmbedding!, c.embedding!)
        }));

      scoredChunks.sort((a, b) => b.score - a.score);

      return scoredChunks.slice(0, topK).map(c => c.content);
    } catch (e) {
      console.warn('RAG query failed:', e);
      return [];
    }
  }
}

export const ragRetriever = new RAGRetriever();
