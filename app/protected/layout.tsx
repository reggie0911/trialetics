import dynamic from 'next/dynamic';

const AIAssistantButton = dynamic(
  () => import('@/components/ai-assistant').then(mod => ({ default: mod.AIAssistantButton }))
);

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AIAssistantButton />
    </>
  );
}
