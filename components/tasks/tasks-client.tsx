'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getTasks, getTaskStats } from '@/lib/actions/tasks';
import type { ProtocolTask, TaskFilters, TaskStats } from '@/lib/types/tasks';
import { TaskBoard } from './task-board';
import { TaskFormDialog } from './task-form-dialog';
import { TaskDetailSheet } from './task-detail-sheet';

interface TasksClientProps {
  companyId: string;
  profileId: string;
}

export function TasksClient({ companyId, profileId }: TasksClientProps) {
  const [activeTab, setActiveTab] = useState('board');
  const [tasks, setTasks] = useState<ProtocolTask[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProtocolTask | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({ page: 1, pageSize: 100 });
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [tasksResult, statsResult] = await Promise.all([
      getTasks(companyId, filters),
      getTaskStats(companyId, profileId),
    ]);

    if (tasksResult.success && tasksResult.data) {
      setTasks(tasksResult.data.items);
      setTotal(tasksResult.data.total);
    }
    if (statsResult.success && statsResult.data) setStats(statsResult.data);
    setIsLoading(false);
  }, [companyId, profileId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'my-tasks') {
      setFilters(prev => ({ ...prev, assigned_to_id: profileId, page: 1 }));
    } else {
      setFilters(prev => ({ ...prev, assigned_to_id: undefined, page: 1 }));
    }
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {stats && (
          <>
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Planned" value={stats.planned} color="text-blue-600" />
            <StatCard label="In Progress" value={stats.in_progress} color="text-yellow-600" />
            <StatCard label="Completed" value={stats.completed} color="text-green-600" />
            <StatCard label="On Hold" value={stats.on_hold} color="text-gray-500" />
            <StatCard label="Overdue" value={stats.overdue} color="text-red-600" />
            <StatCard label="Critical" value={stats.critical} color="text-red-700" />
          </>
        )}
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <TabsList>
              <TabsTrigger value="board">Board View</TabsTrigger>
              <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New Task
            </Button>
          </CardHeader>
          <CardContent>
            <TabsContent value="board" className="mt-0">
              <TaskBoard
                tasks={tasks}
                isLoading={isLoading}
                onSelect={setSelectedTask}
                onStatusChange={async (taskId, status) => {
                  const { updateTask } = await import('@/lib/actions/tasks');
                  await updateTask(taskId, { status });
                  loadData();
                }}
              />
            </TabsContent>
            <TabsContent value="my-tasks" className="mt-0">
              <TaskBoard
                tasks={tasks}
                isLoading={isLoading}
                onSelect={setSelectedTask}
                onStatusChange={async (taskId, status) => {
                  const { updateTask } = await import('@/lib/actions/tasks');
                  await updateTask(taskId, { status });
                  loadData();
                }}
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <TaskFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        companyId={companyId}
        onSuccess={() => {
          setShowCreateDialog(false);
          loadData();
          toast({ title: 'Task created' });
        }}
      />

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          profileId={profileId}
          open={!!selectedTask}
          onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
          onUpdate={() => {
            loadData();
            toast({ title: 'Task updated' });
          }}
        />
      )}
    </>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border bg-white p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${color || ''}`}>{value}</p>
    </div>
  );
}
