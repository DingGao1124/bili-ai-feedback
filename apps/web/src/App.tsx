import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';

const WorkspacePage = lazy(() =>
  import('@/pages/WorkspacePage').then((module) => ({ default: module.WorkspacePage })),
);
const ReportPage = lazy(() =>
  import('@/pages/ReportPage').then((module) => ({ default: module.ReportPage })),
);

export default function App() {
  return (
    <div className="min-h-screen bg-muted/35">
      <AppHeader />
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">正在加载页面…</div>}>
        <Routes>
          <Route path="/" element={<WorkspacePage />} />
          <Route path="/workspace/:jobId" element={<WorkspacePage />} />
          <Route path="/report/:jobId" element={<ReportPage />} />
          <Route path="*" element={<WorkspacePage />} />
        </Routes>
      </Suspense>
    </div>
  );
}
