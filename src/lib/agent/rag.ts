import fs from 'fs/promises';
import path from 'path';
import { IntelligenceLayer } from '../intelligence/index.js';

interface DocumentChunk {
  id: string;
  content: string;
  embedding?: number[];
  metadata?: {
    file: string;
    section: string;
    codeBlock?: boolean;
  };
}

/**
 * Recursive document splitter that respects code blocks, tables, and markdown structure.
 * Unlike simple paragraph splitting, this preserves:
 * - Code blocks (```language ... ```)
 * - Tables (| col | col |)
 * - Headings hierarchy (#, ##, ###)
 * - Lists (bulleted and numbered)
 */
function splitDocumentRecursive(
  text: string,
  fileName: string,
  maxChunkSize: number = 1000,
  minChunkSize: number = 50
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkId = 0;

  // First: extract and preserve code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const codeBlocks: string[] = [];
  let match;
  let processedText = text;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const codeBlock = match[0];
    const placeholder = `%%CODE_BLOCK_${codeBlocks.length}%%`;
    codeBlocks.push(codeBlock);
    processedText = processedText.replace(codeBlock, placeholder);
  }

  // Split by sections (headings)
  const sections = processedText.split(/^(#{1,6}\s+.+)$/m).filter(s => s.trim());
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (section.length < minChunkSize) continue;

    // Check if this is a heading
    const isHeading = /^#{1,6}\s+/.test(section);
    const headingText = isHeading ? section.split('\n')[0] : '';

    // If section is too large, split by paragraphs
    if (section.length > maxChunkSize) {
      const paragraphs = section.split(/\n\s*\n/).filter(p => p.trim().length >= minChunkSize);
      
      let currentChunk = '';
      for (const para of paragraphs) {
        if (currentChunk.length + para.length > maxChunkSize) {
          // Save current chunk and start new one
          if (currentChunk.length >= minChunkSize) {
            chunks.push({
              id: `${fileName}-chunk-${chunkId++}`,
              content: currentChunk.trim(),
              metadata: {
                file: fileName,
                section: headingText.replace(/^#+\s+/, '') || 'Unknown',
                codeBlock: false
              }
            });
          }
          currentChunk = para + '\n\n';
        } else {
          currentChunk += para + '\n\n';
        }
      }
      
      // Don't forget the last chunk
      if (currentChunk.trim().length >= minChunkSize) {
        chunks.push({
          id: `${fileName}-chunk-${chunkId++}`,
          content: currentChunk.trim(),
          metadata: {
            file: fileName,
            section: headingText.replace(/^#+\s+/, '') || 'Unknown',
            codeBlock: false
          }
        });
      }
    } else {
      // Section fits in one chunk
      if (section.length >= minChunkSize) {
        chunks.push({
          id: `${fileName}-chunk-${chunkId++}`,
          content: section,
          metadata: {
            file: fileName,
            section: headingText.replace(/^#+\s+/, '') || 'Unknown',
            codeBlock: false
          }
        });
      }
    }
  }

  // Restore code blocks as separate chunks
  for (let i = 0; i < codeBlocks.length; i++) {
    const codeBlock = codeBlocks[i];
    if (codeBlock.trim().length >= minChunkSize) {
      chunks.push({
        id: `${fileName}-code-${chunkId++}`,
        content: codeBlock,
        metadata: {
          file: fileName,
          section: 'Code Example',
          codeBlock: true
        }
      });
    }
  }

  return chunks;
}

export class RAGRetriever {
  private docsPath: string;
  private chunks: DocumentChunk[] = [];
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  
  // LRU cache for embeddings (max 1000 entries)
  private embeddingCache = new Map<string, number[]>();
  private cacheAccessOrder: string[] = [];
  private readonly MAX_CACHE_SIZE = 1000;

  constructor() {
    this.docsPath = path.join(process.cwd(), 'docs');
  }

  /**
   * Get embedding from cache or generate new one
   */
  private async getEmbedding(text: string): Promise<number[]> {
    // Check cache first
    if (this.embeddingCache.has(text)) {
      // Move to end of access order (most recently used)
      const idx = this.cacheAccessOrder.indexOf(text);
      if (idx >= 0) {
        this.cacheAccessOrder.splice(idx, 1);
        this.cacheAccessOrder.push(text);
      }
      return this.embeddingCache.get(text)!;
    }

    // Generate new embedding
    const embedding = await IntelligenceLayer.generateTextEmbedding(text);
    
    // Add to cache
    this.embeddingCache.set(text, embedding);
    this.cacheAccessOrder.push(text);
    
    // Evict oldest if over capacity
    if (this.embeddingCache.size > this.MAX_CACHE_SIZE) {
      const oldestKey = this.cacheAccessOrder.shift();
      if (oldestKey) {
        this.embeddingCache.delete(oldestKey);
      }
    }
    
    return embedding;
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
            
            // Use recursive splitter that respects code blocks and structure
            const chunks = splitDocumentRecursive(content, file);
            this.chunks.push(...chunks);
          }
        }

        // Generate embeddings for all chunks (with caching)
        // Process in batches to avoid overwhelming the sidecar
        const BATCH_SIZE = 10;
        for (let i = 0; i < this.chunks.length; i += BATCH_SIZE) {
          const batch = this.chunks.slice(i, i + BATCH_SIZE);
          const promises = batch.map(async (chunk) => {
            chunk.embedding = await this.getEmbedding(chunk.content);
          });
          await Promise.all(promises);
        }

        this.initialized = true;
        console.log(`RAG Retriever initialized with ${this.chunks.length} chunks (cached embeddings: ${this.embeddingCache.size}).`);
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
      // Get query embedding (with caching)
      const queryEmbedding = await this.getEmbedding(queryText);

      const scoredChunks = this.chunks
        .filter(c => c.embedding)
        .map(c => ({
          content: c.content,
          score: IntelligenceLayer.cosineSimilarity(queryEmbedding, c.embedding!),
          metadata: c.metadata
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
