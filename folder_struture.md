study-planner/
│
├── mastra-agent/           (AI Agents & Workflows)
│   ├── agents/
│   │   ├── study-assistant.agent.ts
│   │   ├── quiz-generator.agent.ts
│   │   └── progress-analyzer.agent.ts
│   ├── workflows/
│   │   ├── onboarding.workflow.ts
│   │   ├── quiz-completion.workflow.ts
│   │   └── reminder.workflow.ts
│   └── tools/
│       ├── getUserProgress.tool.ts
│       ├── generateQuiz.tool.ts
│       └── analyzeWeakAreas.tool.ts
│
├── mcp/                    (MCP Server/Tools)
│   ├── server.ts
│   └── tools/
│       └── studyPlannerTool.ts
│
├── api/                    (Express Backend)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── schedules.routes.ts
│   │   │   ├── quiz.routes.ts
│   │   │   ├── analytics.routes.ts
│   │   │   └── chat.routes.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── jobs/          (BullMQ)
│   │   │   ├── quiz-generation.job.ts
│   │   │   ├── reminders.job.ts
│   │   │   └── analytics.job.ts
│   │   └── queues/
│   │       └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
└── frontend/               (Next.js)
    ├── src/
    │   ├── app/
    │   ├── components/
    │   └── lib/
    │       └── api-client.ts  (calls Express API)
    └── package.json