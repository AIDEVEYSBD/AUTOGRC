import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { AI_CONFIG } from "@/lib/ai/config";
import { executeTool, TOOL_DEFINITIONS, type ChartSpec, type RequestCache } from "@/lib/ai/tools";

const openai = new OpenAI({ apiKey: AI_CONFIG.OPENAI_API_KEY });

// ─── In-memory session store ──────────────────────────────────────────────────
const sessions = new Map<string, ChatCompletionMessageParam[]>();

// ─── Structured logger ────────────────────────────────────────────────────────
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
  console.error(`[ai/chat ${ts}] ❌ ${step}`, err);
}

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are AutoGRC Assistant, an AI analytics chatbot embedded in a Governance, Risk, and Compliance (GRC) platform.

You have three tools:
1. queryDatabase  — retrieve live compliance data from the database
2. analyzeDataset — perform statistical analysis (aggregation, ranking, trends, comparison)
3. generateChartSpec — produce a chart for visualization in the UI

MANDATORY RULES:
- NEVER invent, estimate, or hallucinate numbers. Every metric you cite MUST come from a tool result.
- For any question about compliance scores, application status, framework mapping, control failures, or security domains → call queryDatabase FIRST.
- After retrieving data, use analyzeDataset if the user wants rankings, trends, or statistics. Pass the 'data' array from the queryDatabase result, OR set 'dataRef' to a queryType (e.g. "applications_overview") so the tool fetches the data automatically — never call analyzeDataset without one of these two.
- Use generateChartSpec whenever the user requests a chart, graph, trend visualization, or says "show me".
- If data is insufficient or unavailable, state this explicitly — do not guess.
- Use conversation history to answer follow-up questions without re-fetching data unnecessarily.
- Format responses in clear markdown. Use bullet points, bold labels, and headers for readability.
- Lead with the key insight, then provide supporting detail.
- When mentioning numbers, provide context (e.g., "64% avg compliance across 10 assessed applications").
- If the user asks to export, tell them to click the Export button in the chat header.

CURRENT PAGE CONTEXT will be provided in the user message if relevant.`;

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const routeStart = Date.now();

  try {
    const body = await req.json() as { message: string; sessionId: string; pageContext?: string };
    const { message, sessionId, pageContext } = body;

    log("Request received", { sessionId, pageContext, messageLen: message?.length });

    if (!message?.trim() || !sessionId) {
      log("Bad request — missing message or sessionId");
      return NextResponse.json({ error: "Missing message or sessionId" }, { status: 400 });
    }

    if (!AI_CONFIG.OPENAI_API_KEY) {
      logErr("No API key configured", "OPENAI_API_KEY is empty");
      return NextResponse.json({
        text: "⚠️ OpenAI API key not configured. Add OPENAI_API_KEY to your .env.local file.",
        sessionId,
      });
    }

    const userContent = pageContext ? `[Current page: ${pageContext}]\n\n${message}` : message;
    let history = sessions.get(sessionId) ?? [];
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
      log(`── Attempt ${attempt}/${MAX_ATTEMPTS} ──`);

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

        // ── Call GPT ──────────────────────────────────────────────────────────
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

        // ── Tool-calling loop ─────────────────────────────────────────────────
        // Tool errors are returned to GPT as tool results so it can self-correct.
        // The outer retry loop only handles API-level exceptions (caught below).
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

            log(`  → Tool: ${fnCall.function.name}`, fnCall.function.arguments.slice(0, 200));

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

            log(`  ← Result: status=${result.status}`, {
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

          // Continue conversation — GPT sees all tool results (including errors) and self-corrects
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
          log(`⚠️ Hit tool loop limit (${MAX_TOOL_LOOPS}), forcing stop`);
        }

        // If the model ran out of tokens or produced empty content, force a final prose response
        const rawContent = response.choices[0].message.content;
        const truncated = response.choices[0].finish_reason === "length";
        let finalText: string;

        if (!rawContent?.trim() || truncated) {
          log("Empty or truncated response — forcing final non-tool call");
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
        sessions.set(sessionId, history.slice(-20));

        return NextResponse.json({ text: finalText, chartSpec: latestChartSpec, sessionId });

      } catch (err) {
        logErr(`Attempt ${attempt} threw`, err);
        lastErrorContext = err instanceof Error ? err.message : String(err);

        if (attempt >= MAX_ATTEMPTS) {
          const errorText = `I encountered an error after ${MAX_ATTEMPTS} attempts.\n\n**Error details:** ${lastErrorContext}\n\nPlease check the server logs for more detail.`;
          log("All attempts exhausted — returning error text");
          return NextResponse.json({ text: errorText, sessionId });
        }
      }
    }

    log("Fell through retry loop — returning fallback");
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
