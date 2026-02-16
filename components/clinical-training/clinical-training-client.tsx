'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainingTopicsTab } from './training-topics-tab';
import { TrainingPlansTab } from './training-plans-tab';
import { SiteTrainingSitesList } from './site-training-sites-list';

interface ClinicalTrainingClientProps {
  companyId: string;
}

export function ClinicalTrainingClient({ companyId }: ClinicalTrainingClientProps) {
  const [activeTab, setActiveTab] = useState('topics');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex h-full flex-col gap-4 bg-[#E9E9E9] p-6">
      <Card className="flex-1">
        {mounted ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <CardHeader>
              <TabsList className="grid w-full max-w-3xl grid-cols-3">
                <TabsTrigger value="topics" className="text-xs">
                  Training Topics
                </TabsTrigger>
                <TabsTrigger value="plans" className="text-xs">
                  Training Plans
                </TabsTrigger>
                <TabsTrigger value="sites" className="text-xs">
                  Site Training
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="h-[calc(100%-5rem)] overflow-auto">
              <TabsContent value="topics" className="mt-0 h-full">
                {activeTab === 'topics' && (
                  <TrainingTopicsTab companyId={companyId} />
                )}
              </TabsContent>
              <TabsContent value="plans" className="mt-0 h-full">
                {activeTab === 'plans' && (
                  <TrainingPlansTab companyId={companyId} />
                )}
              </TabsContent>
              <TabsContent value="sites" className="mt-0 h-full">
                {activeTab === 'sites' && (
                  <SiteTrainingSitesList companyId={companyId} />
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        )}
      </Card>
    </div>
  );
}
