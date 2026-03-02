import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { AI_CONFIG } from "@/lib/ai/config";
import { executeTool, TOOL_DEFINITIONS, type ChartSpec, type RequestCache } from "@/lib/ai/tools";

const openai = new OpenAI({ apiKey: AI_CONFIG.OPENAI_API_KEY });

// In-memory session store
const sessions = new Map<string, ChatCompletionMessageParam[]>();

// Structured logger
function log(step: string, data?: unknown) {
  const ts = new Date().toISOString().slice(11, 23);
  if (data !== undefined) {
    console.log(`[ai/chat ${ts}] ${step}`, typeof data === "object" ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(`[ai/chat ${ts}] ${step}`);
  }
}
function logErr(step: string, err: unknown) {
  const ts = new Date().toISOString().slice(11, 23);
  console.error(`[ai/chat ${ts}] ERROR ${step}`, err);
}

const SYSTEM_PROMPT = `You are AutoGRC Assistant, a knowledgeable AI embedded in a live GRC platform with real-time database access.

You have four tools:
1. queryDatabase - retrieve live compliance and integration data (scores, controls, applications, frameworks)
2. analyzeDataset - statistical analysis (aggregation, ranking, trends, comparison)
3. generateChartSpec - produce charts and visualizations
4. manageIntegrationStatus - activate/deactivate integrations (write action)

WHEN TO USE TOOLS
Use queryDatabase when the user asks about:
- Organization-specific compliance scores, controls, applications, frameworks
- Least compliant controls (portfolio-wide or app-specific)
- Integration status/catalog and integration recommendations
- Which applications are failing or at risk
- Controls for a SPECIFIC application → use queryType "app_controls" with params.applicationName
- Details about a specific application → use queryType "app_details" with params.applicationName
- Framework mapping percentages, domain breakdowns, or KPI summaries

Do not use tools for:
- General GRC concept questions ("What is NIST CSF?", "Explain the Protect domain", "What does a SOC 2 audit involve?")
- Explanations based only on already retrieved conversation data
- Follow-up questions about data already in the chat history

CRITICAL RULES
- Never invent organization-specific numbers.
- Scope awareness is mandatory:
  - If user specifies an application, run app-scoped queries with params.applicationName/applicationId.
  - Otherwise run portfolio-wide queries.
- For app-specific control questions, call queryDatabase with queryType "app_controls".
- For least compliant control questions, call queryDatabase with queryType "least_compliant_controls", app-scoped when applicable.
- For integration recommendation questions, call queryDatabase with queryType "control_integration_recommendations".
- Use analyzeDataset for rankings/statistics and generateChartSpec for visual requests.
- Never call manageIntegrationStatus unless user explicitly confirms action (e.g., "yes activate it", "ok add it", "go ahead").
- Use conversation history and avoid redundant fetches.

RESPONSE STYLE
- Be conversational, warm, and genuinely helpful — not robotic or overly formal
- Answer general GRC questions directly from your knowledge without always hitting the database
- Format responses with clear markdown: ## headers, **bold** labels, bullet points for lists
- Lead with the key insight, then detail. Keep responses focused and scannable.
- When citing numbers, always add context ("64% avg — below the 80% Compliant threshold")
- For complex analyses, walk through your reasoning step by step
- If you can't retrieve data for a specific app, explain exactly what to look for (e.g., "Open the Controls tab filtered to [App Name]")
- Export hint: remind users about the Export button in the chat header when they ask about saving results

CURRENT PAGE CONTEXT may be provided in the user message when relevant.`;

export async function POST(req: NextRequest) {
  const routeStart = Date.now();

  try {
    const body = await req.json() as { message: string; sessionId: string; pageContext?: string };
    const { message, sessionId, pageContext } = body;

    log("Request received", { sessionId, pageContext, messageLen: message?.length });

    if (!message?.trim() || !sessionId) {
      log("Bad request - missing message or sessionId");
      return NextResponse.json({ error: "Missing message or sessionId" }, { status: 400 });
    }

    if (!AI_CONFIG.OPENAI_API_KEY) {
      logErr("No API key configured", "OPENAI_API_KEY is empty");
      return NextResponse.json({
        text: "OpenAI API key not configured. Add OPENAI_API_KEY to your .env.local file.",
        sessionId,
      });
    }

    const userContent = pageContext ? `[Current page: ${pageContext}]\n\n${message}` : message;
    let history = sessions.get(sessionId) ?? [];

    // If no in-memory session, try to restore from DB (handles cold starts)
    if (history.length === 0) {
      try {
        const dbRes = await fetch(`${req.nextUrl.origin}/api/ai/chat-history?sessionId=${sessionId}`);
        if (dbRes.ok) {
          const dbData = await dbRes.json() as { history: ChatCompletionMessageParam[] };
          if (dbData.history?.length) {
            history = dbData.history;
            sessions.set(sessionId, history);
            log(`Restored ${history.length} messages from DB for session ${sessionId}`);
          }
        }
      } catch {
        // non-critical
      }
    }

    history = [...history, { role: "user", content: userContent }];
    log(`Session history length: ${history.length} messages`);

    const MAX_ATTEMPTS = 3;
    let attempt = 0;
    let lastErrorContext = "";
    let latestChartSpec: ChartSpec | null = null;
    // Per-request cache: queryDatabase results keyed by queryType.
    // analyzeDataset and generateChartSpec read from this cache automatically.
    const requestCache: RequestCache = new Map();

    while (attempt < MAX_ATTEMPTS) {
      attempt++;
      log(`-- Attempt ${attempt}/${MAX_ATTEMPTS} --`);

      try {
        let currentMessages: ChatCompletionMessageParam[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
        ];

        if (lastErrorContext && attempt > 1) {
          log("Appending retry context", lastErrorContext);
          currentMessages = [
            ...currentMessages,
            {
              role: "user",
              content: `Note: a previous tool attempt failed (${lastErrorContext}). Please try a different approach or use different parameters.`,
            },
          ];
        }

        log(`Calling OpenAI (model=${AI_CONFIG.MODEL}, messages=${currentMessages.length})`);
        let response = await openai.chat.completions.create({
          model: AI_CONFIG.MODEL,
          messages: currentMessages,
          tools: TOOL_DEFINITIONS,
          tool_choice: "auto",
          max_completion_tokens: 16000,
        });

        const firstChoice = response.choices[0];
        log("OpenAI response", {
          finish_reason: firstChoice.finish_reason,
          has_tool_calls: !!firstChoice.message.tool_calls?.length,
          tool_call_count: firstChoice.message.tool_calls?.length ?? 0,
          content_length: firstChoice.message.content?.length ?? 0,
          usage: response.usage,
        });

        let toolLoopCount = 0;
        const MAX_TOOL_LOOPS = 10;

        while (response.choices[0].finish_reason === "tool_calls" && toolLoopCount < MAX_TOOL_LOOPS) {
          toolLoopCount++;
          const assistantMsg = response.choices[0].message;
          const toolCalls = assistantMsg.tool_calls ?? [];
          log(`Tool loop ${toolLoopCount}: ${toolCalls.length} tool call(s)`);
          currentMessages.push(assistantMsg);

          const toolResultMsgs: ChatCompletionMessageParam[] = [];

          for (const call of toolCalls) {
            if (call.type !== "function") {
              log(`Skipping non-function tool call: ${call.type}`);
              continue;
            }

            const fnCall = call as unknown as {
              id: string;
              type: "function";
              function: { name: string; arguments: string };
            };

            log(`  -> Tool: ${fnCall.function.name}`, fnCall.function.arguments.slice(0, 200));

            let callArgs: Record<string, unknown> = {};
            try {
              callArgs = JSON.parse(fnCall.function.arguments);
            } catch (parseErr) {
              logErr(`Failed to parse tool args for ${fnCall.function.name}`, parseErr);
              callArgs = {};
            }

            let result;
            try {
              result = await executeTool(fnCall.function.name, callArgs, requestCache);
            } catch (toolErr) {
              logErr(`Tool execution threw for ${fnCall.function.name}`, toolErr);
              result = {
                status: "error" as const,
                error_type: "execution_exception",
                message: toolErr instanceof Error ? toolErr.message : "Unknown tool error",
              };
            }

            log(`  <- Result: status=${result.status}`, {
              error_type: result.status === "error" ? result.error_type : undefined,
              message: result.status === "error" ? result.message : undefined,
              data_length: result.data ? JSON.stringify(result.data).length : 0,
              has_chart: !!result.chartSpec,
            });

            if (result.chartSpec) {
              latestChartSpec = result.chartSpec;
              log("  Chart spec captured", result.chartSpec.chartType);
            }

            if (result.status === "error") {
              log("  Tool error (returning to GPT for self-correction)", `${result.error_type}: ${result.message}`);
            }

            toolResultMsgs.push({
              role: "tool",
              tool_call_id: fnCall.id,
              content: JSON.stringify(result),
            });
          }

          currentMessages.push(...toolResultMsgs);

          log(`Continuing GPT call after tools (messages=${currentMessages.length})`);
          response = await openai.chat.completions.create({
            model: AI_CONFIG.MODEL,
            messages: currentMessages,
            tools: TOOL_DEFINITIONS,
            tool_choice: "auto",
            max_completion_tokens: 16000,
          });

          log("GPT continuation response", {
            finish_reason: response.choices[0].finish_reason,
            has_tool_calls: !!response.choices[0].message.tool_calls?.length,
            content_length: response.choices[0].message.content?.length ?? 0,
          });
        }

        if (toolLoopCount >= MAX_TOOL_LOOPS) {
          log(`Hit tool loop limit (${MAX_TOOL_LOOPS}), forcing stop`);
        }

        const rawContent = response.choices[0].message.content;
        const truncated = response.choices[0].finish_reason === "length";
        let finalText: string;

        if (!rawContent?.trim() || truncated) {
          log("Empty or truncated response - forcing final non-tool call");
          currentMessages.push(response.choices[0].message);
          currentMessages.push({
            role: "user",
            content:
              "Based on all the data you have gathered above, please write your final analysis. " +
              "Be concise and use markdown formatting. Do not call any more tools.",
          });
          const forced = await openai.chat.completions.create({
            model: AI_CONFIG.MODEL,
            messages: currentMessages,
            tools: TOOL_DEFINITIONS,
            tool_choice: "none",
            max_completion_tokens: 8000,
          });
          finalText =
            forced.choices[0].message.content?.trim() ||
            "Analysis complete. Data was retrieved successfully but I was unable to generate a summary. Please try again.";
          log(`Forced final response (${finalText.length} chars)`);
        } else {
          finalText = rawContent;
        }

        log(`Final response ready (${finalText.length} chars, ${Date.now() - routeStart}ms total)`);

        history = [...history, { role: "assistant", content: finalText }];
        const trimmedHistory = history.slice(-20);
        sessions.set(sessionId, trimmedHistory);

        fetch(`${req.nextUrl.origin}/api/ai/chat-history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, history: trimmedHistory, uiMessages: [] }),
        }).catch(() => {
          // non-critical
        });

        return NextResponse.json({ text: finalText, chartSpec: latestChartSpec, sessionId });
      } catch (err) {
        logErr(`Attempt ${attempt} threw`, err);
        lastErrorContext = err instanceof Error ? err.message : String(err);

        if (attempt >= MAX_ATTEMPTS) {
          const errorText = `I encountered an error after ${MAX_ATTEMPTS} attempts.\n\n**Error details:** ${lastErrorContext}\n\nPlease check the server logs for more detail.`;
          log("All attempts exhausted - returning error text");
          return NextResponse.json({ text: errorText, sessionId });
        }
      }
    }

    log("Fell through retry loop - returning fallback");
    return NextResponse.json({
      text: "I was unable to complete your request. Please try again.",
      sessionId,
    });
  } catch (err) {
    logErr("Unhandled outer error", err);
    return NextResponse.json(
      { text: `An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}`, error: true },
      { status: 500 }
    );
  }
}

