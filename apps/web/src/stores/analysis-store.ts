import { create } from 'zustand';
import type { AnalysisJobView, AnalysisStreamEvent, ToolTrace } from '@/types';

interface AnalysisState {
  job?: AnalysisJobView;
  events: AnalysisStreamEvent[];
  assistantMessage: string;
  reasoning: string;
  tools: ToolTrace[];
  lastSeq: number;
  setJob: (job: AnalysisJobView) => void;
  applyEvent: (event: AnalysisStreamEvent) => void;
  applyEvents: (events: AnalysisStreamEvent[]) => void;
  reset: (job?: AnalysisJobView) => void;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function reduceEvents(state: AnalysisState, incoming: AnalysisStreamEvent[]) {
  let reasoning = state.reasoning;
  let assistantMessage = state.assistantMessage;
  let tools = state.tools;
  let lastSeq = state.lastSeq;
  const accepted: AnalysisStreamEvent[] = [];

  for (const event of incoming) {
    if (event.seq <= lastSeq) continue;
    lastSeq = event.seq;
    accepted.push(event);

    if (event.type === 'message_delta') {
      assistantMessage += asString(event.data.delta);
    } else if (event.type === 'reasoning_delta') {
      reasoning += asString(event.data.delta);
    } else if (event.type === 'tool_call') {
      tools = [
        ...tools,
        {
          id: `${event.seq}-${asString(event.data.name)}`,
          name: asString(event.data.name) || 'unknown_tool',
          status: 'running',
          input: event.data.input,
        },
      ];
    } else if (event.type === 'tool_result') {
      const name = asString(event.data.name);
      let index = -1;
      for (let cursor = tools.length - 1; cursor >= 0; cursor -= 1) {
        if (tools[cursor].name === name && tools[cursor].status === 'running') {
          index = cursor;
          break;
        }
      }
        if (index >= 0) {
          tools = tools.map((tool, toolIndex) =>
            toolIndex === index
              ? {
                  ...tool,
                  status: event.data.success === false ? ('failed' as const) : ('completed' as const),
                  output: event.data.output,
                }
              : tool,
          );
      }
    }
  }

  if (accepted.length === 0) return state;
  return {
    lastSeq,
    events: [...state.events, ...accepted].slice(-200),
    assistantMessage,
    reasoning,
    tools,
  };
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  events: [],
  assistantMessage: '',
  reasoning: '',
  tools: [],
  lastSeq: 0,
  setJob: (job) => set({ job }),
  reset: (job) => set({ job, events: [], assistantMessage: '', reasoning: '', tools: [], lastSeq: 0 }),
  applyEvent: (event) => set((state) => reduceEvents(state, [event])),
  applyEvents: (events) => set((state) => reduceEvents(state, events)),
}));
