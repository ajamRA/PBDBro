import { NextResponse } from "next/server";
import { SKILLS, type OptionKey, type Question, type SkillId } from "@/data/questions";

type GenerateRequest = {
  skillId?: string;
  topicText?: string;
  imageDataUrl?: string;
};

type GeneratedQuestion = {
  stem: string;
  options: Array<{ key: OptionKey; text: string }>;
  correctAnswer: OptionKey;
  difficulty: "mudah" | "sederhana" | "tinggi";
};

type AiProvider = "gemini" | "openai" | "openrouter";

const optionKeys = ["A", "B", "C", "D"];
const skillIds = SKILLS.map((skill) => skill.id);
const questionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["stem", "options", "correctAnswer", "difficulty"],
        properties: {
          stem: { type: "string" },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["key", "text"],
              properties: {
                key: { type: "string", enum: ["A", "B", "C", "D"] },
                text: { type: "string" },
              },
            },
          },
          correctAnswer: { type: "string", enum: ["A", "B", "C", "D"] },
          difficulty: { type: "string", enum: ["mudah", "sederhana", "tinggi"] },
        },
      },
    },
  },
};

const geminiQuestionSchema = {
  type: "object",
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        required: ["stem", "options", "correctAnswer", "difficulty"],
        properties: {
          stem: { type: "string" },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "object",
              required: ["key", "text"],
              properties: {
                key: { type: "string", enum: ["A", "B", "C", "D"] },
                text: { type: "string" },
              },
            },
          },
          correctAnswer: { type: "string", enum: ["A", "B", "C", "D"] },
          difficulty: { type: "string", enum: ["mudah", "sederhana", "tinggi"] },
        },
      },
    },
  },
};

function isOptionKey(value: unknown): value is OptionKey {
  return typeof value === "string" && optionKeys.includes(value);
}

function isSkillId(value: string | undefined): value is SkillId {
  return Boolean(value && skillIds.includes(value as SkillId));
}

function getAiProvider(): AiProvider {
  if (process.env.AI_PROVIDER === "openrouter") return "openrouter";
  return process.env.AI_PROVIDER === "openai" ? "openai" : "gemini";
}

function parseImageDataUrl(imageDataUrl: string) {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Format screenshot tidak sah.");
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
}

function extractOpenAiResponseText(data: unknown) {
  if (typeof data !== "object" || data === null) return "";

  const response = data as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }>;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .filter((content) => content.type === "output_text" && typeof content.text === "string")
      .map((content) => content.text as string)
      .join("\n") ?? ""
  );
}

function extractGeminiResponseText(data: unknown) {
  if (typeof data !== "object" || data === null) return "";

  const response = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
  };

  return (
    response.candidates?.[0]?.content?.parts
      ?.map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("\n") ?? ""
  );
}

function validateGeneratedQuestions(value: unknown): GeneratedQuestion[] {
  if (typeof value !== "object" || value === null) {
    throw new Error("Format jawapan AI tidak sah.");
  }

  const parsed = value as { questions?: unknown };

  if (!Array.isArray(parsed.questions) || parsed.questions.length !== 5) {
    throw new Error("AI perlu jana tepat 5 soalan.");
  }

  return parsed.questions.map((question, index) => {
    const item = question as Partial<GeneratedQuestion>;

    if (
      typeof item.stem !== "string" ||
      !Array.isArray(item.options) ||
      item.options.length !== 4 ||
      !isOptionKey(item.correctAnswer)
    ) {
      throw new Error(`Soalan AI #${index + 1} tidak lengkap.`);
    }

    const normalizedOptions = item.options.map((option) => ({
      key: option.key,
      text: String(option.text ?? "").trim(),
    }));

    const hasAllOptions = optionKeys.every((key) =>
      normalizedOptions.some((option) => option.key === key && option.text.length > 0),
    );

    if (!hasAllOptions) {
      throw new Error(`Pilihan jawapan soalan AI #${index + 1} tidak lengkap.`);
    }

    return {
      stem: item.stem.trim(),
      options: normalizedOptions,
      correctAnswer: item.correctAnswer,
      difficulty: item.difficulty ?? "sederhana",
    };
  });
}

function buildLocalFallbackQuestions(skillName: string, topicText: string): GeneratedQuestion[] {
  const topic = topicText.trim().replace(/[.!?]+$/, "") || `topik ${skillName}`;

  return [
    {
      stem: `Apakah idea utama yang dipelajari dalam ${topic}?`,
      options: [
        { key: "A", text: `Konsep berkaitan ${topic}` },
        { key: "B", text: "Cara menghias buku latihan" },
        { key: "C", text: "Nama semua planet secara rawak" },
        { key: "D", text: "Peraturan permainan di padang" },
      ],
      correctAnswer: "A",
      difficulty: "mudah",
    },
    {
      stem: `Antara berikut, manakah pernyataan yang paling sesuai tentang ${topic}?`,
      options: [
        { key: "A", text: "Ia tidak berkaitan dengan Sains" },
        { key: "B", text: `Ia boleh diperhatikan atau diterangkan melalui pembelajaran ${skillName}` },
        { key: "C", text: "Ia hanya boleh dipelajari oleh orang dewasa" },
        { key: "D", text: "Ia tidak berlaku dalam kehidupan harian" },
      ],
      correctAnswer: "B",
      difficulty: "mudah",
    },
    {
      stem: `Jika guru menunjukkan gambar atau nota tentang ${topic}, apakah tindakan murid yang paling sesuai?`,
      options: [
        { key: "A", text: "Meneka tanpa melihat maklumat" },
        { key: "B", text: "Membuat pemerhatian dan membaca maklumat penting" },
        { key: "C", text: "Menyalin jawapan rakan" },
        { key: "D", text: "Mengabaikan gambar atau nota" },
      ],
      correctAnswer: "B",
      difficulty: "sederhana",
    },
    {
      stem: `Mengapa ${topic} penting dipelajari oleh murid Tahun 3?`,
      options: [
        { key: "A", text: "Supaya murid boleh mengaitkan Sains dengan kehidupan harian" },
        { key: "B", text: "Supaya murid tidak perlu membuat pemerhatian" },
        { key: "C", text: "Supaya murid hanya menghafal tanpa faham" },
        { key: "D", text: "Supaya murid tidak bertanya soalan" },
      ],
      correctAnswer: "A",
      difficulty: "sederhana",
    },
    {
      stem: `Apakah contoh kemahiran berfikir yang boleh digunakan semasa mempelajari ${topic}?`,
      options: [
        { key: "A", text: "Membanding, memerhati dan membuat kesimpulan ringkas" },
        { key: "B", text: "Berlari di dalam kelas" },
        { key: "C", text: "Menutup buku sebelum membaca" },
        { key: "D", text: "Memilih jawapan secara rawak sahaja" },
      ],
      correctAnswer: "A",
      difficulty: "tinggi",
    },
  ];
}

function parseGeneratedQuestionsPayload(rawText: string) {
  const withoutFence = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  const cleaned = withoutFence.trim();

  if (!cleaned) {
    throw new Error("Jawapan model kosong.");
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start >= 0 && end > start) {
      const slice = cleaned.slice(start, end + 1);
      return JSON.parse(slice);
    }

    throw new Error("Format JSON jawapan model tidak sah.");
  }
}

async function generateWithOpenAI(prompt: string, imageDataUrl: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY belum diset. Bank asas masih boleh digunakan.");
  }

  const content: Array<
    { type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "high" }
  > = [{ type: "input_text", text: prompt }];

  if (imageDataUrl) {
    content.push({ type: "input_image", image_url: imageDataUrl, detail: "high" });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content }],
      instructions:
        "Anda ialah pembantu guru Sains sekolah rendah. Pulangkan JSON sahaja mengikut schema. Elakkan fakta meragukan dan elakkan kandungan yang tidak sesuai untuk murid Tahun 3.",
      text: {
        format: {
          type: "json_schema",
          name: "tphelper_questions",
          strict: true,
          schema: questionSchema,
        },
      },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? (data as { error?: { message?: string } }).error?.message
        : "";
    throw new Error(message || "Gagal jana soalan AI dengan OpenAI.");
  }

  return extractOpenAiResponseText(data);
}

async function generateWithGemini(prompt: string, imageDataUrl: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum diset. Bank asas masih boleh digunakan.");
  }

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];

  if (imageDataUrl) {
    const image = parseImageDataUrl(imageDataUrl);
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.data,
      },
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "Anda ialah pembantu guru Sains sekolah rendah. Pulangkan JSON sahaja mengikut schema. Elakkan fakta meragukan dan elakkan kandungan yang tidak sesuai untuk murid Tahun 3.",
            },
          ],
        },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: geminiQuestionSchema,
        },
      }),
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? (data as { error?: { message?: string } }).error?.message
        : "";
    throw new Error(message || "Gagal jana soalan AI dengan Gemini.");
  }

  return extractGeminiResponseText(data);
}

async function generateWithOpenRouter(prompt: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? "openrouter/free";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY belum diset. Bank asas masih boleh digunakan.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Anda ialah pembantu guru Sains sekolah rendah. Pulangkan JSON sahaja dalam format {\"questions\":[...]} dengan 5 soalan MCQ A/B/C/D. Elakkan fakta meragukan.",
        },
        {
          role: "user",
          content: `${prompt}\n\nFormat JSON wajib:\n{"questions":[{"stem":"...","options":[{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],"correctAnswer":"A","difficulty":"mudah"}]}`,
        },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? (data as { error?: { message?: string } }).error?.message
        : "";
    throw new Error(message || "Gagal jana soalan AI dengan OpenRouter.");
  }

  const content =
    typeof data === "object" &&
    data !== null &&
    "choices" in data &&
    Array.isArray((data as { choices?: Array<{ message?: { content?: unknown } }> }).choices)
      ? (data as { choices: Array<{ message?: { content?: unknown } }> }).choices[0]?.message?.content
      : "";

  return typeof content === "string" ? content : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as GenerateRequest;
  const topicText = body.topicText?.trim() ?? "";
  const imageDataUrl = body.imageDataUrl?.trim() ?? "";
  const provider = getAiProvider();

  if (!isSkillId(body.skillId)) {
    return NextResponse.json({ error: "Kemahiran tidak sah." }, { status: 400 });
  }

  const skillId = body.skillId;

  if (!topicText && !imageDataUrl) {
    return NextResponse.json({ error: "Masukkan topik/nota atau screenshot dahulu." }, { status: 400 });
  }

  if (imageDataUrl && !imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Fail screenshot mesti dalam format imej." }, { status: 400 });
  }

  const skillName = SKILLS.find((skill) => skill.id === skillId)?.name ?? skillId;
  const prompt = [
    `Subjek: Sains Tahun 3`,
    `Kemahiran: ${skillName}`,
    `Topik/nota guru: ${topicText || "(Rujuk screenshot yang dilampirkan.)"}`,
    `Bahasa wajib: Bahasa Melayu Malaysia.`,
    "Guna ejaan dan istilah Malaysia: murid, cikgu, mata pelajaran, kebarangkalian, membiak, pemerhatian.",
    "Elakkan gaya Bahasa Indonesia seperti: siswa, pelajaran, kemungkinan, berkembang biak, pengamatan.",
    "Jana 5 soalan objektif A/B/C/D untuk murid Tahun 3.",
    "Soalan mesti berdasarkan konsep/topik yang diberi, bukan bank soalan umum.",
    "Jangan salin ayat buku teks bulat-bulat. Jana soalan baharu yang mudah difahami.",
    "Pastikan hanya satu jawapan betul untuk setiap soalan.",
    "Gunakan Bahasa Melayu yang sesuai untuk sekolah rendah.",
  ].join("\n");

  try {
    const responseText =
      provider === "openai"
        ? await generateWithOpenAI(prompt, imageDataUrl)
        : provider === "openrouter"
          ? await generateWithOpenRouter(prompt)
          : await generateWithGemini(prompt, imageDataUrl);
    const generated = validateGeneratedQuestions(parseGeneratedQuestionsPayload(responseText));
    const questions: Question[] = generated.map((question, index) => ({
      ...question,
      id: `ai-${skillId}-${Date.now()}-${index + 1}`,
      subjectId: "sains-t3",
      skillId,
      topic: topicText || "Berdasarkan screenshot",
      generatedByAi: true,
    }));

    return NextResponse.json({ questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membaca jawapan AI.";
    const canUseLocalFallback =
      message.includes("API_KEY belum diset") ||
      message.toLowerCase().includes("api key not valid") ||
      message.toLowerCase().includes("quota exceeded") ||
      message.toLowerCase().includes("expected") ||
      message.toLowerCase().includes("json") ||
      message.toLowerCase().includes("format");

    if (canUseLocalFallback) {
      const fallbackQuestions = buildLocalFallbackQuestions(skillName, topicText).map((question, index) => ({
        ...question,
        id: `local-ai-fallback-${skillId}-${Date.now()}-${index + 1}`,
        subjectId: "sains-t3" as const,
        skillId,
        topic: topicText || "Berdasarkan screenshot",
        generatedByAi: true,
      }));

      return NextResponse.json({
        questions: fallbackQuestions,
        warning: `Output AI tidak stabil untuk permintaan ini. Set soalan fallback digunakan sementara. (${message})`,
      });
    }

    return NextResponse.json(
      { error: message },
      { status: 502 },
    );
  }
}
