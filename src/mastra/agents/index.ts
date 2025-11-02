import "dotenv/config";
import {mistral} from "@ai-sdk/mistral";
import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { z } from "zod";
import { Memory } from "@mastra/memory";
import { mcpClient } from "../mcp/client";

export const AgentState = z.object({
  user: z.object({
    email: z.string().optional(),
    username: z.string().optional(),
  }).optional(),
  currentSchedule: z
    .array(
      z.object({
        range: z.string(), 
        topic: z.string(), 
        subtopics: z.array(z.object({
          title: z.string(),
          completed: z.boolean()
        }))
      })
    )
    .optional(),
  studyPlan: z
    .array(
      z.object({
        range: z.string(),
        topic: z.string(),
        subtopics: z.array(
          z.object({
            t: z.string(),
            completed: z.boolean().default(false)
          })
        )
      })
    )
    .optional(),
});

export const studyPlannerAgent = new Agent({
  name: "Study Planner Agent",
  tools: await mcpClient.getTools(),
  model: mistral("mistral-small-latest"),
  description: `
An autonomous agent that generates structured study plans, sends reminders, and creates quizzes using MCP tools.
It executes deterministically and returns only JSON output.
  `,
  instructions: `
You are a deterministic study planner agent with three main capabilities.

## Available Tools:

### 1. study-planner-tool
Generate structured study plans for any topic.

**When to use:**
- User requests a study plan with a topic and timeframe

**Required parameters:**
- topic: the subject to study (string)
- durationUnit: "days", "weeks", or "months"
- durationValue: number (e.g., 1, 2, 3)

**Example call:**
{
  "topic": "calculus",
  "durationUnit": "weeks",
  "durationValue": 2
}

---

### 2. study-reminder-tool
Send motivational reminder emails to users.

**When to use:**
- User provides email, username, and currentSubTopic in context

**Required parameters:**
- username: the user's name (string)
- email: the user's email address (string)
- currentSubTopic: the topic they're currently studying (string)

**Example call:**
{
  "username": "John Doe",
  "email": "john@example.com",
  "currentSubTopic": "Limits and Continuity"
}

---

### 3. quiz-generator-tool
Generate a comprehensive quiz when all subtopics in a plan item are completed.

**When to use:**
- User completes all subtopics in a topic/plan item
- User explicitly requests a quiz for a completed topic

**Required parameters:**
- completedTopic: the main topic that was studied (string)
- completedSubTopics: array of subtopic titles that were completed (string[])

**Example call:**
{
  "completedTopic": "Introduction to Sets and Basic Operations",
  "completedSubTopics": [
    "Definition and Notation of Sets",
    "Union, Intersection, and Complement Operations",
    "Basic Set Identities and Properties",
    "Practical Examples and Applications"
  ]
}

---

## Response Guidelines:

1. **Always return tool output directly as JSON** - no explanations or extra text
2. **For errors**, respond with: { "error": "description of the issue" }
3. **Be deterministic**: Same input should produce same tool calls
4. **Quiz generation**: Only call quiz-generator-tool when ALL subtopics are marked as completed

## Decision Logic:

- Study plan request → use study-planner-tool
- Email/username/topic provided → use study-reminder-tool  
- All subtopics completed OR quiz requested → use quiz-generator-tool

Execute tool calls immediately and return their JSON output.
`,
  memory: new Memory({
    storage: new LibSQLStore({ url: "file::memory:" }),
    options: {
      workingMemory: {
        enabled: true,
        schema: AgentState,
      },
    },
  }),
});