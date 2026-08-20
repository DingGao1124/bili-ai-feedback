import { Link } from 'react-router-dom';
import { BarChart3, Tv } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function AppHeader() {
  return (
    <header className="sticky top-0 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Tv className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold sm:text-base">B站观众反馈助手</span>
            <span className="hidden text-xs text-muted-foreground sm:block">让每一条反馈都能指导下一次创作</span>
          </span>
        </Link>
        <Badge variant="secondary" className="gap-1.5">
          <BarChart3 className="size-3.5" />
          创作复盘工作台
        </Badge>
      </div>
    </header>
  );
}
