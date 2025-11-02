import { NextResponse } from "next/server";
import { studyPlannerAgent } from "@/mastra/agents";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {  } = body ?? {};


    // Use the agent to send reminder
     await studyPlannerAgent.generateVNext([
      {
        role: "user",
        content: ``
      }
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


