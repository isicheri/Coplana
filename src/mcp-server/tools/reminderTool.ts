import { createTool } from "@mastra/core";
import { mistral } from "@ai-sdk/mistral";
import { generateText } from "ai";
import { getJson } from "serpapi";
import { z } from "zod";
import {Resend} from "resend";

const model = mistral("mistral-small-latest");

// 🔍 Web search helper
type SiteLink = {
  title: string;
  link: string;
  snippet?: string;
};

type SearchResult = {
  position: number;
  title: string;
  link: string;
  snippet: string;
  favicon?: string;
  sitelinks?: SiteLink[];
};

const search_web = async (query: string): Promise<SearchResult[]> => {
  try {
    const json = await getJson({
      api_key: process.env.SERP_API_KEY,
      engine: "duckduckgo",
      q: query,
      kl: "us-en",
    });

    const organicResults = (json.organic_results || []).slice(0, 3);

    const results: SearchResult[] = organicResults.map((r: any) => ({
      position: r.position,
      title: r.title ?? "Untitled",
      link: r.link ?? "",
      snippet: r.snippet ?? "",
      favicon: r.favicon ?? "",
      sitelinks: (r.sitelinks || []).slice(0, 3).map((s: any) => ({
        title: s.title ?? "",
        link: s.link ?? "",
        snippet: s.snippet ?? "",
      })),
    }));

    return results;
  } catch (err) {
    console.error("search_web error:", err);
    return [];
  }
};

// 💬 Prompt generator
function generatePrompt(username: string, currentSubTopic: string) {
  return `
You are a motivational AI study coach.
Write a short motivational email (4–6 lines) to ${username} encouraging them to stay focused while studying the topic "${currentSubTopic}". 
Keep the tone friendly and inspiring, and end with a short reminder like "Let's make progress today!".
`;
}

export const studyReminderTool = createTool({
  id: "study-reminder-tool",
  description: "Sends a motivational plain text email reminder to the user.",
  inputSchema: z.object({
    username: z.string(),
    email: z.string(),
    currentSubTopic: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ context }) => {
    const { username, email, currentSubTopic } = context;

    // ✨ Generate motivational message
  const prompt = generatePrompt(username, currentSubTopic);

let motivationalText = "Stay focused — you’re doing great! Every small effort compounds.";
try {
  const { text } = await generateText({
    model,
    prompt,
    maxOutputTokens: 800,
  });
  if (text) motivationalText = text.trim();
} catch (err) {
  console.error("Error generating motivational text:", err);
}
const resend = new Resend(process.env.RESEND_API_KEY);

    // 🔎 Search for helpful resources
   const links = await search_web(currentSubTopic);
   const formattedLinks = links
  .map((r, i) => {
    const mainLink = `${i + 1}. ${r.title}\n${r.link}`;
    const subLinks =
      r.sitelinks && r.sitelinks.length > 0
        ? r.sitelinks.map((s, j) => `   - ${s.title}\n     ${s.link}`).join("\n")
        : "";
    return [mainLink, subLinks].filter(Boolean).join("\n");
  })
  .join("\n\n");
    // 📧 Create email content
    const subject = `Keep pushing, ${username}! Let's conquer ${currentSubTopic} 💪`;
    const body = `
Hey ${username},

${motivationalText.trim()}

📘 Helpful study resources:
${formattedLinks || "No links found today — focus on your notes and stay consistent!"}

Let's make progress today 🚀
`;

    // ✉️ Send email

    const mailOptions = {
      from: 'onboarding@resend.dev',
      to: email,
      subject,
      text: body,
    };
resend.emails.send(mailOptions);
    return { success: true };
  },
});
