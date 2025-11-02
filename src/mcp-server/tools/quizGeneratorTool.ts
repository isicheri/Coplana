import { createTool } from "@mastra/core/tools";
import { mistral } from "@ai-sdk/mistral";
import { generateText } from "ai";
import { z } from "zod";

const model = mistral("mistral-small-latest");

const generatePrompt = (topic: string, subtopics: string[]) => {
  return `
You are an expert quiz creator specializing in educational assessment.

Generate a comprehensive quiz for the topic: "${topic}"

The quiz should cover these subtopics:
${subtopics.map((st, i) => `${i + 1}. ${st}`).join('\n')}

CRITICAL REQUIREMENTS:

1. QUIZ STRUCTURE:
   - Create ${Math.min(subtopics.length * 2, 10)} multiple-choice questions
   - Each question must have EXACTLY 4 options (A, B, C, D)
   - Questions should cover ALL subtopics evenly
   - Mix difficulty levels: 40% easy, 40% medium, 20% hard

2. QUESTION QUALITY:
   - Questions must be clear, specific, and unambiguous
   - Test understanding, not just memorization
   - Avoid "all of the above" or "none of the above" options
   - Make incorrect options plausible but clearly wrong

3. ANSWER FORMAT:
   - The "answer" field must be the LETTER ONLY (A, B, C, or D)
   - Do NOT include the full answer text, ONLY the letter

4. OUTPUT FORMAT:
   - Return ONLY valid JSON
   - NO markdown, NO code fences, NO explanations
   - Follow this EXACT structure:

{
  "title": "Quiz: <descriptive title based on topic>",
  "questions": [
    {
      "question": "Clear, specific question text?",
      "options": [
        "Option A text",
        "Option B text",
        "Option C text",
        "Option D text"
      ],
      "answer": "B"
    }
  ]
}

EXAMPLE OUTPUT:

{
  "title": "Quiz: Set Operations Fundamentals",
  "questions": [
    {
      "question": "What is the result of the union of sets A = {1, 2, 3} and B = {3, 4, 5}?",
      "options": [
        "{1, 2, 3, 4, 5}",
        "{3}",
        "{1, 2, 4, 5}",
        "{1, 2, 3, 3, 4, 5}"
      ],
      "answer": "A"
    },
    {
      "question": "Which set operation represents elements that are in A but not in B?",
      "options": [
        "Union",
        "Intersection",
        "Difference",
        "Complement"
      ],
      "answer": "C"
    },
    {
      "question": "If set A is a subset of set B, what can we conclude about A ∩ B?",
      "options": [
        "A ∩ B = B",
        "A ∩ B = A",
        "A ∩ B = ∅",
        "A ∩ B = A ∪ B"
      ],
      "answer": "B"
    }
  ]
}

Now generate a quiz for "${topic}" covering the provided subtopics. Return ONLY the JSON output:
`;
};

export const quizGeneratorTool = createTool({
  id: "quiz-generator-tool",
  description: "Generates a comprehensive quiz with multiple-choice questions based on completed study topics and subtopics.",
  inputSchema: z.object({
    completedTopic: z.string().min(1, "Topic is required"),
    completedSubTopics: z.array(z.string()).min(1, "At least one subtopic is required"),
  }),
  outputSchema: z.object({
    title: z.string(),
    questions: z.array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).length(4), // Enforce exactly 4 options
        answer: z.string().regex(/^[A-D]$/, "Answer must be A, B, C, or D"), // Validate answer is a letter
      })
    ),
  }),
  execute: async ({ context }) => {
    const { completedSubTopics, completedTopic } = context;

    const maxAttempts = 3;
    let lastError = "";

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxAttempts} to generate quiz...`);

        const prompt = generatePrompt(completedTopic, completedSubTopics);
        const aiResult = await generateText({
          model,
          prompt,
          maxOutputTokens: 3000, // Increased for multiple questions
          temperature: 0.7, // Higher creativity for diverse questions
        });

        console.log("Raw AI output:", aiResult.text);

        // Clean the output
        let cleaned = aiResult.text.trim();
        cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");
        cleaned = cleaned.trim();
        cleaned = cleaned.replace(/[\u0000-\u001F]+/g, " ");
        cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

        console.log("Cleaned output:", cleaned);

        let parsed: unknown;
        try {
          parsed = JSON.parse(cleaned);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);

          // Fallback: try to extract JSON object
          const objectMatch = cleaned.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            parsed = JSON.parse(objectMatch[0]);
          } else {
            lastError = `JSON parsing failed: ${parseError}`;
            continue;
          }
        }

        // Validate schema
        const validated = z
          .object({
            title: z.string(),
            questions: z.array(
              z.object({
                question: z.string(),
                options: z.array(z.string()).length(4),
                answer: z.string().regex(/^[A-D]$/),
              })
            ),
          })
          .parse(parsed);

        // Quality validation
        if (validated.questions.length < 3) {
          lastError = "Quiz has too few questions (minimum 3 required)";
          continue;
        }

        // Verify all questions have valid answers
        for (const q of validated.questions) {
          if (!["A", "B", "C", "D"].includes(q.answer)) {
            lastError = `Invalid answer format: ${q.answer}`;
            continue;
          }
        }

        console.log("✅ Quiz validated successfully!");
        return validated;

      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error instanceof Error ? error.message : String(error);

        if (attempt === maxAttempts) {
          throw new Error(
            `Failed to generate valid quiz after ${maxAttempts} attempts. Last error: ${lastError}`
          );
        }
      }
    }

    throw new Error(`Failed to generate valid quiz. Last error: ${lastError}`);
  },
});