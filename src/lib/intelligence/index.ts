import { GoogleGenAI, Type, Schema } from '@google/genai';

// Initialize the Gemini API client
// We use the environment variable provided by the AI Studio environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class IntelligenceLayer {
  /**
   * Generates a high-dimensional vector embedding for a seed.
   * This embedding represents the semantic "meaning" and physical traits of the seed,
   * allowing for similarity search and latent space navigation.
   */
  static async generateEmbedding(seed: any): Promise<number[]> {
    try {
      // Construct a rich textual representation of the seed for the embedding model
      const seedDescription = `
        Domain: ${seed.$domain}
        Name: ${seed.$name || 'Untitled'}
        Generation: ${seed.$lineage?.generation || 0}
        Genes: ${Object.entries(seed.genes || {}).map(([k, v]: [string, any]) => `${k} (${v.type}): ${JSON.stringify(v.value)}`).join(', ')}
      `;

      // Use the recommended text-embedding-004 model
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: seedDescription,
      });

      if (response.embeddings && response.embeddings.length > 0 && response.embeddings[0].values) {
        return response.embeddings[0].values;
      }
      
      throw new Error("No embedding values returned from Gemini API");
    } catch (error) {
      console.error("Error generating embedding:", error);
      // Fallback: Generate a deterministic pseudo-embedding based on the seed hash
      // This ensures the system doesn't crash if the API is unavailable or rate-limited
      return this.generatePseudoEmbedding(seed.$hash || seed.id);
    }
  }

  /**
   * Generates a high-dimensional vector embedding for a text string.
   */
  static async generateTextEmbedding(text: string): Promise<number[]> {
    try {
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      });

      if (response.embeddings && response.embeddings.length > 0 && response.embeddings[0].values) {
        return response.embeddings[0].values;
      }
      
      throw new Error("No embedding values returned from Gemini API");
    } catch (error) {
      console.error("Error generating text embedding:", error);
      return this.generatePseudoEmbedding(text);
    }
  }

  /**
   * Generates a complete GSPL seed using Gemini based on a prompt and domain.
   */
  static async generateSeed(prompt: string, domain: string): Promise<any> {
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "A creative name for the seed" },
        genes: {
          type: Type.OBJECT,
          description: "A dictionary of genes. Keys are gene names. Values must be objects with 'type' ('scalar', 'vector', or 'categorical') and 'value'.",
        }
      },
      required: ['name', 'genes']
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate a creative GSPL seed for the domain '${domain}' based on this prompt: "${prompt}". 
        Include 5-10 interesting genes that define its physical, behavioral, or aesthetic properties.
        For scalars, provide a single number in the value array. For vectors, provide 2-4 numbers. For categoricals, provide a single string.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.7,
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      // Clean up the genes format
      const cleanGenes: Record<string, any> = {};
      if (result.genes) {
        for (const [k, v] of Object.entries(result.genes) as [string, any][]) {
          if (v.type === 'scalar') {
            cleanGenes[k] = { type: 'scalar', value: Number(v.value[0]) || 0 };
          } else if (v.type === 'vector') {
            cleanGenes[k] = { type: 'vector', value: v.value.map((x: any) => Number(x) || 0) };
          } else {
            cleanGenes[k] = { type: 'categorical', value: String(v.value[0] || '') };
          }
        }
      }

      return {
        name: result.name || `Generated ${domain}`,
        genes: cleanGenes
      };
    } catch (e) {
      console.error("Gemini generation failed:", e);
      throw e;
    }
  }

  /**
   * Mutates an existing seed using Gemini to intelligently alter its genes.
   */
  static async mutateSeed(seed: any, rate: number): Promise<any> {
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "A new name reflecting the mutation" },
        genes: {
          type: Type.OBJECT,
          description: "The mutated genes. Keep the same structure but alter values.",
        }
      },
      required: ['name', 'genes']
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Mutate this GSPL seed. The mutation rate is ${rate} (0.0 to 1.0, where 1.0 is extreme mutation).
        Intelligently alter the gene values to create a logical but distinct variation.
        
        Original Seed:
        Name: ${seed.$name}
        Domain: ${seed.$domain}
        Genes: ${JSON.stringify(seed.genes)}
        `,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.5 + (rate * 0.5), // Higher rate = higher temperature
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      // Clean up the genes format
      const cleanGenes: Record<string, any> = {};
      if (result.genes) {
        for (const [k, v] of Object.entries(result.genes) as [string, any][]) {
          if (v.type === 'scalar') {
            cleanGenes[k] = { type: 'scalar', value: Number(v.value[0]) || 0 };
          } else if (v.type === 'vector') {
            cleanGenes[k] = { type: 'vector', value: v.value.map((x: any) => Number(x) || 0) };
          } else {
            cleanGenes[k] = { type: 'categorical', value: String(v.value[0] || '') };
          }
        }
      }

      return {
        name: result.name || `${seed.$name} (Mutated)`,
        genes: Object.keys(cleanGenes).length > 0 ? cleanGenes : seed.genes
      };
    } catch (e) {
      console.error("Gemini mutation failed:", e);
      throw e;
    }
  }

  /**
   * Breeds two seeds using Gemini to intelligently combine their traits.
   */
  static async breedSeeds(seedA: any, seedB: any): Promise<any> {
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "A creative name for the offspring" },
        genes: {
          type: Type.OBJECT,
          description: "The combined genes.",
        }
      },
      required: ['name', 'genes']
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Crossbreed these two GSPL seeds to create a logical offspring.
        Combine their traits, taking dominant features from both. You can blend values or pick from one parent.
        
        Parent A (${seedA.$domain}):
        Name: ${seedA.$name}
        Genes: ${JSON.stringify(seedA.genes)}
        
        Parent B (${seedB.$domain}):
        Name: ${seedB.$name}
        Genes: ${JSON.stringify(seedB.genes)}
        `,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.6,
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      // Clean up the genes format
      const cleanGenes: Record<string, any> = {};
      if (result.genes) {
        for (const [k, v] of Object.entries(result.genes) as [string, any][]) {
          if (v.type === 'scalar') {
            cleanGenes[k] = { type: 'scalar', value: Number(v.value[0]) || 0 };
          } else if (v.type === 'vector') {
            cleanGenes[k] = { type: 'vector', value: v.value.map((x: any) => Number(x) || 0) };
          } else {
            cleanGenes[k] = { type: 'categorical', value: String(v.value[0] || '') };
          }
        }
      }

      return {
        name: result.name || `Offspring of ${seedA.$name} and ${seedB.$name}`,
        genes: Object.keys(cleanGenes).length > 0 ? cleanGenes : seedA.genes
      };
    } catch (e) {
      console.error("Gemini breeding failed:", e);
      throw e;
    }
  }

  /**
   * Calculates the cosine similarity between two vector embeddings.
   * Returns a value between -1 and 1, where 1 means identical direction.
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Finds the K most similar seeds to a target seed based on their embeddings.
   */
  static findSimilarSeeds(targetSeed: any, allSeeds: any[], k: number = 5): any[] {
    if (!targetSeed.$embedding) return [];

    const scoredSeeds = allSeeds
      .filter(s => s.id !== targetSeed.id && s.$embedding) // Exclude self and seeds without embeddings
      .map(s => ({
        seed: s,
        similarity: this.cosineSimilarity(targetSeed.$embedding, s.$embedding)
      }));

    // Sort descending by similarity
    scoredSeeds.sort((a, b) => b.similarity - a.similarity);

    return scoredSeeds.slice(0, k).map(s => ({
      ...s.seed,
      _similarityScore: s.similarity // Attach score for UI purposes if needed
    }));
  }

  /**
   * Generates a deterministic pseudo-embedding (768 dimensions to match text-embedding-004)
   * based on a string hash. Used as a fallback.
   */
  private static generatePseudoEmbedding(hashStr: string): number[] {
    const vec = new Array(768).fill(0);
    let seed = 0;
    for (let i = 0; i < hashStr.length; i++) {
      seed = (seed * 31 + hashStr.charCodeAt(i)) % 1000000007;
    }
    
    // Simple linear congruential generator for pseudo-random values [-1, 1]
    let current = seed;
    for (let i = 0; i < 768; i++) {
      current = (current * 1103515245 + 12345) % 2147483648;
      vec[i] = (current / 2147483648) * 2 - 1;
    }
    
    // Normalize
    let norm = 0;
    for (let i = 0; i < 768; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < 768; i++) vec[i] /= norm;
    }
    
    return vec;
  }
}
