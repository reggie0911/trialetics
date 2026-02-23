import { AIAssistantButton } from '@/components/ai-assistant';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AIAssistantButton />
    </>
  );
}
