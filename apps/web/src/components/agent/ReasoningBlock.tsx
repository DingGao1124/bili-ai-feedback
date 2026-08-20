import { useEffect, useRef, useState } from 'react';
import { BrainCircuit, ChevronRight } from 'lucide-react';
import { Markdown } from '@/components/common/Markdown';
import { Badge } from '@/components/ui/badge';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

export function ReasoningBlock({ reasoning, streaming }: { reasoning: string; streaming: boolean }) {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!streaming) {
      setLive(false);
      setOpen(false);
      return;
    }
    setLive(true);
    setOpen(true);
    const timer = window.setTimeout(() => { setLive(false); setOpen(false); }, 800);
    return () => window.clearTimeout(timer);
  }, [reasoning, streaming]);

  useEffect(() => {
    if (live && open && contentRef.current) contentRef.current.scrollTop = contentRef.current.scrollHeight;
  }, [live, open, reasoning]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="max-w-full">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-full justify-start">
          <ChevronRight className={cn('transition-transform', open && 'rotate-90')} data-icon="inline-start" />
          <BrainCircuit className="size-4" data-icon="inline-start" />思考过程
          {live ? <Badge variant="warning"><Spinner data-icon="inline-start" />live</Badge> : <Badge variant="outline">{reasoning.length} 字符</Badge>}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <Bubble variant="muted" className="max-w-full"><BubbleContent><Markdown ref={contentRef} content={reasoning} className="max-h-80 overflow-y-auto text-muted-foreground" /></BubbleContent></Bubble>
      </CollapsibleContent>
    </Collapsible>
  );
}
