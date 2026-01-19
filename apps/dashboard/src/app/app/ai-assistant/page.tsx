'use client';

import { AIAssistantFull } from '@/components/ai/ai-assistant-full';

export default function AIAssistantPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">AI Assistant</h1>
        <p className="text-white/60 [.light_&]:text-slate-600">
          Get help with pitch decks, financial analysis, and project management
        </p>
      </div>

      <AIAssistantFull />
    </div>
  );
}

