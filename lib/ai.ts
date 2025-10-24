import OpenAI from "openai";
import type { FileType } from "@prisma/client";
import { toFile } from "openai/uploads";
import { Pinecone } from "@pinecone-database/pinecone";
import { getVectorIndex } from "@/lib/vector-store";

const openAiKey = process.env.OPENAI_API_KEY;

export const openai = openAiKey ? new OpenAI({ apiKey: openAiKey }) : null;

const pineconeKey = process.env.PINECONE_API_KEY;
export const pinecone = pineconeKey ? new Pinecone({ apiKey: pineconeKey }) : null;

export type DocumentSummary = {
  summary: string;
  keyPoints: string[];
};

export async function summarizeContent(
  content: string,
  {
    title,
    fileType
  }: {
    title: string;
    fileType: FileType;
  }
): Promise<DocumentSummary> {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }
  const prompt = [
    `You are summarizing a ${fileType.toLowerCase()} titled "${title}".`,
    "Produce:",
    "1. A concise summary (max 120 words).",
    "2. 3-5 bullet key points capturing the most actionable insights.",
    "",
    "Respond in valid JSON format with keys `summary` and `keyPoints` (array of strings).",
    "",
    "Content:",
    content.slice(0, 30000)
  ].join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 600,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a world-class knowledge management assistant. Respond in valid JSON with keys `summary` and `keyPoints` (array of strings)."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const jsonText = response.choices[0]?.message?.content?.trim() || "{}";

  try {
    const parsed = JSON.parse(jsonText) as DocumentSummary;
    if (!parsed.summary || !Array.isArray(parsed.keyPoints)) {
      throw new Error("Invalid summary payload");
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse summary output", jsonText, error);
    return {
      summary: jsonText,
      keyPoints: []
    };
  }
}

export async function summarizeProject(
  files: Array<{ title: string; summary: string; keyPoints?: string[] }>
): Promise<DocumentSummary> {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const combined = files
    .map(
      (file) =>
        `Title: ${file.title}\nSummary: ${file.summary}\nKey Points: ${(file.keyPoints ?? []).join(", ")}`
    )
    .join("\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 600,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You combine multiple document summaries into one cohesive overview. Return JSON with keys `summary` (<= 180 words) and `keyPoints` (array of strings)."
      },
      {
        role: "user",
        content: `Summaries:\n${combined}`
      }
    ]
  });

  const jsonText = response.choices[0]?.message?.content?.trim() || "{}";

  try {
    return JSON.parse(jsonText) as DocumentSummary;
  } catch (error) {
    console.error("Failed to parse project summary", jsonText, error);
    return {
      summary: jsonText,
      keyPoints: []
    };
  }
}

export async function buildEmbeddingVector(input: string): Promise<number[]> {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: input.slice(0, 8000)
  });

  return response.data[0].embedding;
}

export async function transcribeAudioBuffer(buffer: Buffer, filename: string): Promise<string> {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  const file = await toFile(buffer, filename);
  const result = await openai.audio.transcriptions.create({
    model: "gpt-4o-mini-transcribe",
    file
  });

  return result.text;
}

export async function queryKnowledgeBase(params: {
  userId: string;
  query: string;
  topK?: number;
}): Promise<
  Array<{
    fileId: string;
    score: number;
    content: string;
    metadata: Record<string, unknown>;
  }>
> {
  if (!pinecone) {
    throw new Error("Pinecone API key not configured");
  }
  const index = await getVectorIndex();
  if (!index) {
    throw new Error("Vector index not configured");
  }

  const embedding = await buildEmbeddingVector(params.query);
  const topK = params.topK ?? 6;
  const results = await index.query({
    vector: embedding,
    namespace: params.userId,
    topK,
    includeMetadata: true
  });

  return (
    results.matches?.map((match) => ({
      fileId: String(match.id),
      score: match.score ?? 0,
      content: (match.metadata?.content as string) ?? "",
      metadata: match.metadata ?? {}
    })) ?? []
  );
}

export async function answerQuestionWithContext(params: {
  userId: string;
  question: string;
}): Promise<{ answer: string; references: Array<{ fileId: string; score: number }> }> {
  const context = await queryKnowledgeBase({
    userId: params.userId,
    query: params.question
  });

  if (!anthropic) {
    throw new Error("Anthropic API key not configured");
  }

  const contextText = context
    .map(
      (item, index) =>
        `Source ${index + 1} (File ${item.fileId}, score ${item.score.toFixed(2)}):\n${item.content}`
    )
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    temperature: 0.3,
    max_tokens: 800,
    system:
      "You are Community Vault's AI copilot. Answer clearly, cite sources when relevant, and mention if information is unavailable.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Context:\n${contextText}\n\nQuestion: ${params.question}`
          }
        ]
      }
    ]
  });

  const answer = response.content
    .map((chunk) => ("text" in chunk ? chunk.text : ""))
    .join("\n")
    .trim();

  return {
    answer,
    references: context.map((item) => ({
      fileId: item.fileId,
      score: item.score
    }))
  };
}
