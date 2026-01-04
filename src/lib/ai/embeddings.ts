import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// OpenAI text-embedding-3-small dimension
const EMBEDDING_DIMENSION = 1536

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: EMBEDDING_DIMENSION,
  })

  return response.data[0].embedding
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
    dimensions: EMBEDDING_DIMENSION,
  })

  return response.data.map(d => d.embedding)
}

// Chunk text for embedding
export function chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + maxChunkSize

    // Try to break at a sentence or paragraph boundary
    if (end < text.length) {
      const breakPoints = ['\n\n', '\n', '. ', '! ', '? ', '; ']
      for (const bp of breakPoints) {
        const bpIndex = text.lastIndexOf(bp, end)
        if (bpIndex > start + maxChunkSize / 2) {
          end = bpIndex + bp.length
          break
        }
      }
    }

    chunks.push(text.substring(start, end).trim())
    start = end - overlap

    // Avoid tiny last chunks
    if (text.length - start < overlap) {
      break
    }
  }

  return chunks.filter(chunk => chunk.length > 0)
}

export { EMBEDDING_DIMENSION }
