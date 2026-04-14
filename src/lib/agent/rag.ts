import fs from 'fs/promises';
import path from 'path';
import { IntelligenceLayer } from '../intelligence/index.js';

interface DocumentChunk {
  id: string;
  content: string;
  embedding?: number[];
}

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
            // Simple chunking by paragraphs (double newline)
            const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
            
            for (let i = 0; i < paragraphs.length; i++) {
              const chunkText = paragraphs[i].trim();
              this.chunks.push({
                id: `${file}-chunk-${i}`,
                content: chunkText
              });
            }
          }
        }

        // Generate embeddings for all chunks
        // We do this sequentially to avoid rate limits, but could be batched
        for (const chunk of this.chunks) {
          chunk.embedding = await IntelligenceLayer.generateTextEmbedding(chunk.content);
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
      const queryEmbedding = await IntelligenceLayer.generateTextEmbedding(queryText);
      
      const scoredChunks = this.chunks
        .filter(c => c.embedding)
        .map(c => ({
          content: c.content,
          score: IntelligenceLayer.cosineSimilarity(queryEmbedding, c.embedding!)
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
