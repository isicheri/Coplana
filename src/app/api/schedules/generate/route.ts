
import { NextResponse } from "next/server";
import { studyPlannerAgent } from "@/mastra/agents";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, durationUnit, durationValue } = body ?? {};

    if (!topic || !durationUnit || !durationValue) {
      return NextResponse.json({ error: "topic, durationUnit and durationValue are required" }, { status: 400 });
    }

  // 🧠 Use the agent to call the tool with the inputs
    const result = await studyPlannerAgent.generateVNext([
      {
        role: "user",
        content: `Call the "study-planner-tool" with this exact JSON input:
        {
          "topic": "${topic}",
          "durationUnit": "${durationUnit}",
          "durationValue": ${durationValue}
        }

        Return ONLY the pure JSON output from the tool. Do not add text, markdown, or explanation. The final response must match this format:
        {
          "plan": [
            { "range": "string", "topic": "string", "subtopics": [{ "t": "string", "completed": false }] }
          ]
        }`
      },
    ]);

    // 🔹 Add this log
console.log("raw agent output:", result.text);

    const raw = (result.text ?? "").trim();
    if (!raw) return NextResponse.json({ error: "Agent returned no output" }, { status: 502 });

    // Try to parse JSON out of the raw text
    const match = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!match) return NextResponse.json({ error: "No JSON found in agent output" }, { status: 502 });

    const parsed = JSON.parse(match[0]);

    // 🔹 Add this log
console.log("parsed agent output:", parsed);

    // Expecting { plan: [...] }
    return NextResponse.json({ plan: parsed.plan ?? parsed }, { status: 200 });
  } catch (err: any) {
    console.error("generate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
