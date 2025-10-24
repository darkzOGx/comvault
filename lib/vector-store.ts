import { pinecone } from "@/lib/ai";

const PINECONE_INDEX = process.env.PINECONE_INDEX;

export async function getVectorIndex() {
  if (!pinecone) return null;
  if (!PINECONE_INDEX) {
    console.warn("PINECONE_INDEX is not configured.");
    return null;
  }
  return pinecone.index(PINECONE_INDEX);
}

export async function upsertDocumentEmbedding(params: {
  userId: string;
  fileId: string;
  embedding: number[];
  content: string;
  metadata: Record<string, unknown>;
}) {
  const index = await getVectorIndex();
  if (!index) return;

  await index.upsert({
    namespace: params.userId,
    vectors: [
      {
        id: params.fileId,
        values: params.embedding,
        metadata: {
          content: params.content.slice(0, 8000),
          ...params.metadata
        }
      }
    ]
  });
}

export async function removeDocumentEmbedding(userId: string, fileId: string) {
  const index = await getVectorIndex();
  if (!index) return;

  await index.deleteOne({
    namespace: userId,
    id: fileId
  });
}
