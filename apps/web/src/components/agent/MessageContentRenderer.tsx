import type { ToolTrace } from '@/types';
import { Markdown } from '@/components/common/Markdown';
import { ReasoningBlock } from '@/components/agent/ReasoningBlock';
import { ToolCallCard } from '@/components/agent/ToolCallCard';
import { Bubble, BubbleContent } from '@/components/ui/bubble';

export function MessageContentRenderer({ reasoning, message, tools, streaming }: { reasoning: string; message: string; tools: ToolTrace[]; streaming: boolean }) {
  return (
    <>
      {reasoning ? <ReasoningBlock reasoning={reasoning} streaming={streaming} /> : null}
      {tools.map((trace) => <ToolCallCard key={trace.id} trace={trace} />)}
      {message ? <Bubble variant="ghost"><BubbleContent className="w-full"><Markdown content={message} /></BubbleContent></Bubble> : null}
    </>
  );
}
