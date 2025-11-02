import { createTool } from "@mastra/core";
import { generateText } from "ai";
import { mistral } from "@ai-sdk/mistral";
import z from "zod";
const model = mistral("ministral-3b-latest");

const studyPlannerOutputSchema = z.object({
  plan: z.array(
    z.object({
      range: z.string(),
      topic: z.string(),
      subtopics: z.array(
        z.object({
          t: z.string(),
          completed: z.boolean().default(false),
        })
      ),
    })
  ),
});

// Helper function for dynamic examples
const generateExampleForDuration = (value: number, unit: string, topic: string) => {
  // For days (1-7 days)
  if (unit === "days" && value <= 7) {
    return `[
  {
    "range": "Day 1: 9:00am - 11:30am",
    "topic": "Foundations of ${topic}",
    "subtopics": [
      { "t": "Core concept 1", "completed": false },
      { "t": "Core concept 2", "completed": false },
      { "t": "Core concept 3", "completed": false },
      { "t": "Core concept 4", "completed": false }
    ]
  },
  {
    "range": "Day 1: 2:30pm - 5:00pm",
    "topic": "Advanced ${topic} Techniques",
    "subtopics": [
      { "t": "Technique 1", "completed": false },
      { "t": "Technique 2", "completed": false },
      { "t": "Technique 3", "completed": false }
    ]
  },
  {
    "range": "Day 2: 10:00am - 1:00pm",
    "topic": "Practical Applications of ${topic}",
    "subtopics": [
      { "t": "Application 1", "completed": false },
      { "t": "Application 2", "completed": false },
      { "t": "Application 3", "completed": false },
      { "t": "Practice problems", "completed": false }
    ]
  }
]`;
  }
  
  // For weeks (1-4 weeks)
  if (unit === "weeks" && value <= 4) {
    return `[
  {
    "range": "Week 1, Day 1: 8:30am - 11:00am",
    "topic": "Introduction to ${topic}",
    "subtopics": [
      { "t": "Fundamental concepts and definitions", "completed": false },
      { "t": "Basic principles and theories", "completed": false },
      { "t": "Initial examples and applications", "completed": false },
      { "t": "Practice exercises", "completed": false }
    ]
  },
  {
    "range": "Week 1, Day 2: 1:00pm - 3:30pm",
    "topic": "Core Techniques in ${topic}",
    "subtopics": [
      { "t": "Technique 1 explained", "completed": false },
      { "t": "Technique 2 with examples", "completed": false },
      { "t": "Hands-on practice", "completed": false }
    ]
  },
  {
    "range": "Week 1, Day 4: 9:30am - 12:30pm",
    "topic": "Advanced Concepts in ${topic}",
    "subtopics": [
      { "t": "Complex theory exploration", "completed": false },
      { "t": "Advanced problem-solving methods", "completed": false },
      { "t": "Real-world case studies", "completed": false },
      { "t": "Critical thinking exercises", "completed": false }
    ]
  },
  {
    "range": "Week 2, Day 1: 3:00pm - 6:00pm",
    "topic": "Practical Applications of ${topic}",
    "subtopics": [
      { "t": "Industry use cases", "completed": false },
      { "t": "Project-based learning", "completed": false },
      { "t": "Best practices", "completed": false },
      { "t": "Common pitfalls to avoid", "completed": false }
    ]
  }
]`;
  }
  
  // For longer durations (weeks > 4)
  if (unit === "weeks" && value > 4) {
    return `[
  {
    "range": "Week 1, Day 2: 10:30am - 1:30pm",
    "topic": "Foundations of ${topic}",
    "subtopics": [
      { "t": "Introduction and overview", "completed": false },
      { "t": "Historical context", "completed": false },
      { "t": "Key terminology", "completed": false },
      { "t": "Foundational principles", "completed": false }
    ]
  },
  {
    "range": "Week 2, Day 3: 2:00pm - 4:45pm",
    "topic": "Intermediate ${topic} Concepts",
    "subtopics": [
      { "t": "Building on fundamentals", "completed": false },
      { "t": "Intermediate techniques", "completed": false },
      { "t": "Problem-solving strategies", "completed": false },
      { "t": "Practical exercises", "completed": false }
    ]
  },
  {
    "range": "Week 4, Day 1: 9:00am - 12:15pm",
    "topic": "Advanced ${topic} Theory",
    "subtopics": [
      { "t": "Complex theoretical frameworks", "completed": false },
      { "t": "Advanced methodologies", "completed": false },
      { "t": "Research and analysis", "completed": false },
      { "t": "Critical evaluation", "completed": false },
      { "t": "Synthesis and integration", "completed": false }
    ]
  }
]`;
  }
  
  // For months
  if (unit === "months") {
    return `[
  {
    "range": "Month 1, Week 1, Day 1: 11:00am - 1:45pm",
    "topic": "Introduction to ${topic}",
    "subtopics": [
      { "t": "Course overview and objectives", "completed": false },
      { "t": "Fundamental concepts", "completed": false },
      { "t": "Basic terminology and notation", "completed": false },
      { "t": "Initial practice problems", "completed": false }
    ]
  },
  {
    "range": "Month 1, Week 2, Day 3: 8:00am - 10:30am",
    "topic": "Core Principles of ${topic}",
    "subtopics": [
      { "t": "Theoretical foundations", "completed": false },
      { "t": "Key principles explained", "completed": false },
      { "t": "Worked examples", "completed": false }
    ]
  },
  {
    "range": "Month 1, Week 3, Day 5: 3:30pm - 6:30pm",
    "topic": "Intermediate ${topic} Techniques",
    "subtopics": [
      { "t": "Building complexity", "completed": false },
      { "t": "Advanced problem types", "completed": false },
      { "t": "Multiple solution approaches", "completed": false },
      { "t": "Optimization strategies", "completed": false }
    ]
  },
  {
    "range": "Month 2, Week 2, Day 2: 1:30pm - 4:00pm",
    "topic": "Advanced Applications in ${topic}",
    "subtopics": [
      { "t": "Real-world applications", "completed": false },
      { "t": "Industry case studies", "completed": false },
      { "t": "Cross-disciplinary connections", "completed": false }
    ]
  },
  {
    "range": "Month 3, Week 3, Day 4: 10:00am - 1:30pm",
    "topic": "Mastery and Integration of ${topic}",
    "subtopics": [
      { "t": "Comprehensive review", "completed": false },
      { "t": "Complex problem solving", "completed": false },
      { "t": "Integration with other concepts", "completed": false },
      { "t": "Final assessment preparation", "completed": false }
    ]
  }
]`;
  }
  
  // Default fallback
  return `[
  {
    "range": "Day 1: 9:30am - 12:00pm",
    "topic": "Introduction to ${topic}",
    "subtopics": [
      { "t": "Fundamental concept", "completed": false },
      { "t": "Basic principles", "completed": false },
      { "t": "Initial practice", "completed": false }
    ]
  }
]`;
};

const generatePrompt = (topic: string, durationUnit: string, durationValue: number) => {
  const breakdownMap = {
    days: "hours",
    weeks: "days",
    months: "weeks",
  };
  const breakdown = breakdownMap[durationUnit as keyof typeof breakdownMap];

  return `
You are an expert study planner. Create a study plan for "${topic}" over ${durationValue} ${durationUnit}.

CRITICAL REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:

1. TIME RANGES - MANDATORY FORMAT:
   - For days: Use format "Day X: HH:MMam/pm - HH:MMam/pm"
   - For weeks: Use format "Week X, Day Y: HH:MMam/pm - HH:MMam/pm"
   - For months: Use format "Month X, Week Y, Day Z: HH:MMam/pm - HH:MMam/pm"
   - NEVER use vague ranges like "Week 1 - Day 7" or "Day 1-7"
   - ALWAYS include specific clock times with am/pm

2. SESSION PLANNING:
   - Each subtopic = 25-40 minutes of study
   - 3 subtopics = 1.5-2.5 hours → Example: "Day 1: 10:00am - 12:00pm"
   - 4 subtopics = 2-3 hours → Example: "Day 1: 10:00am - 1:00pm"
   - 5 subtopics = 2.5-3.5 hours → Example: "Day 1: 2:00pm - 5:30pm"
   - Plan MULTIPLE sessions per ${breakdown}
   - Vary start times: 8am, 9am, 10am, 1pm, 2pm, 3pm etc.

3. TOPIC NAMING:
   - Each topic MUST be specific and capitalized properly
   - BAD: "set operations" 
   - GOOD: "Introduction to Sets and Basic Operations"
   - BAD: "calculus"
   - GOOD: "Limits and Continuity Fundamentals"
   - Make each topic DISTINCT and focused on a specific aspect

4. OUTPUT FORMAT:
   - Return ONLY a JSON array
   - NO markdown, NO code fences, NO explanations
   - Start with [ and end with ]

EXAMPLE OUTPUT for ${durationValue} ${durationUnit}:
${generateExampleForDuration(durationValue, durationUnit, topic)}

Now generate the complete study plan following this EXACT format:
`;
};

// Validation function to check if output is "cringe"
const validatePlanQuality = (plan: Array<{range: string, topic: string, subtopics: any[]}>, durationUnit: string): { valid: boolean, reason?: string } => {
  // Check 1: Time format validation
  const timeRegex = /\d{1,2}:\d{2}(am|pm)/i;
  
  for (const session of plan) {
    // Must have specific time ranges
    if (!timeRegex.test(session.range)) {
      return { valid: false, reason: `Invalid time format in range: "${session.range}"` };
    }
    
    // Must not have vague ranges like "Week 1 - Day 7"
    if (session.range.includes('-') && !timeRegex.test(session.range.split('-')[1])) {
      return { valid: false, reason: `Vague range format: "${session.range}"` };
    }
    
    // Topic must be capitalized
    if (session.topic[0] !== session.topic[0].toUpperCase()) {
      return { valid: false, reason: `Topic not capitalized: "${session.topic}"` };
    }
    
    // Topic should not be too generic (single word in lowercase)
    if (session.topic.split(' ').length === 1 || session.topic === session.topic.toLowerCase()) {
      return { valid: false, reason: `Topic too generic: "${session.topic}"` };
    }
    
    // Subtopics should be reasonable (3-6)
    if (session.subtopics.length < 3 || session.subtopics.length > 6) {
      return { valid: false, reason: `Unreasonable subtopic count: ${session.subtopics.length}` };
    }
  }
  
  // Check 2: Must have multiple sessions for days/weeks
  if (durationUnit === "days" && plan.length < 2) {
    return { valid: false, reason: "Too few sessions for days duration" };
  }
  
  if (durationUnit === "weeks" && plan.length < 3) {
    return { valid: false, reason: "Too few sessions for weeks duration" };
  }
  
  return { valid: true };
};

export const studyPlannerTool = createTool({
  id: "study-planner-tool",
  description: "Generates a structured study plan for a given topic and time span.",
  inputSchema: z.object({
    topic: z.string().min(1, "Topic is required"),
    durationUnit: z.enum(["days", "weeks", "months"]),
    durationValue: z.number().min(1, "Duration must be at least 1"),
  }),
  outputSchema: studyPlannerOutputSchema,
  execute: async ({ context }) => {
    const { topic, durationUnit, durationValue } = context;
    
    const maxAttempts = 3;
    let lastError = "";
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxAttempts} to generate study plan...`);
        
        const prompt = generatePrompt(topic, durationUnit, durationValue);
        const aiResult = await generateText({
          model,
          prompt,
          maxOutputTokens: 2000,
          temperature: 0.2 + (attempt - 1) * 0.1,
        });

        console.log("Raw AI output:", aiResult.text);
        
        // Clean the output
let cleaned = aiResult.text.trim();
cleaned = cleaned.replace(/```json\s*/g, "").replace(/```\s*/g, "");
cleaned = cleaned.trim();

// 🔥 ADD THESE LINES - Fix problematic characters before parsing
// Remove or replace mathematical symbols that might break JSON
cleaned = cleaned.replace(/∪/g, 'U');
cleaned = cleaned.replace(/∩/g, 'n');
cleaned = cleaned.replace(/×/g, 'x');
cleaned = cleaned.replace(/Δ/g, 'Delta');

// Fix unescaped backslashes (like in "A \ B")
// This regex finds backslashes that aren't already part of valid escape sequences
cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

cleaned = cleaned.replace(/[\u0000-\u001F]+/g, " ");
cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

console.log("Cleaned output:", cleaned);

        let parsed: unknown;
        try {
          parsed = JSON.parse(cleaned);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          
          // Fallback: try to extract JSON array
          const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
          if (arrayMatch) {
            parsed = JSON.parse(arrayMatch[0]);
          } else {
            lastError = `JSON parsing failed: ${parseError}`;
            continue; // Try again
          }
        }

        // Validate schema
        const validated = z
          .array(
            z.object({
              range: z.string(),
              topic: z.string(),
              subtopics: z.array(
                z.object({
                  t: z.string(),
                  completed: z.boolean(),
                })
              ),
            })
          )
          .parse(parsed);

        // Quality validation
        const qualityCheck = validatePlanQuality(validated, durationUnit);
        
        if (!qualityCheck.valid) {
          console.warn(`Quality check failed: ${qualityCheck.reason}`);
          lastError = qualityCheck.reason || "Quality validation failed";
          continue; // Try again
        }

        console.log("✅ Plan validated successfully!");
        return { plan: validated };
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error instanceof Error ? error.message : String(error);
        
        if (attempt === maxAttempts) {
          throw new Error(`Failed to generate valid study plan after ${maxAttempts} attempts. Last error: ${lastError}`);
        }
      }
    }
    
    throw new Error(`Failed to generate valid study plan. Last error: ${lastError}`);
  },
});