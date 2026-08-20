import { forwardRef, type ComponentProps } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

const components: Components = {
  p: ({ className, ...props }) => <p className={cn('leading-7', className)} {...props} />,
  h1: ({ className, ...props }) => <h1 className={cn('mt-5 text-2xl font-semibold first:mt-0', className)} {...props} />,
  h2: ({ className, ...props }) => <h2 className={cn('mt-5 text-xl font-semibold first:mt-0', className)} {...props} />,
  h3: ({ className, ...props }) => <h3 className={cn('mt-4 text-base font-semibold first:mt-0', className)} {...props} />,
  ul: ({ className, ...props }) => (
    <ul className={cn('ml-5 flex list-disc flex-col gap-1', className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn('ml-5 flex list-decimal flex-col gap-1', className)} {...props} />
  ),
  code: ({ className, ...props }) => (
    <code className={cn('rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]', className)} {...props} />
  ),
  pre: ({ className, ...props }) => <pre className={cn('max-w-full overflow-x-auto rounded-xl border bg-muted/60 p-4 text-xs leading-6', className)} {...props} />,
  blockquote: ({ className, ...props }) => <blockquote className={cn('border-l-2 pl-4 italic text-muted-foreground', className)} {...props} />,
  a: ({ className, ...props }) => (
    <a
      className={cn('font-medium text-primary underline underline-offset-4', className)}
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    />
  ),
};

export const Markdown = forwardRef<
  HTMLDivElement,
  ComponentProps<'div'> & { content: string }
>(function Markdown({ content, className, ...props }, ref) {
  return (
    <div ref={ref} className={cn('min-w-0 flex flex-col gap-3 text-sm leading-7', className)} {...props}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>{content}</ReactMarkdown>
    </div>
  );
});
