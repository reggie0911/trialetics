'use client';

import { useState, useEffect } from 'react';
import { Todo } from '@/lib/types/todo';
import { TodoItem } from './todo-item';
import { TodoModal } from './todo-modal';
import { getTodos, toggleTodoComplete } from '@/lib/actions/todos';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';

interface TodoListProps {
  projectId: string;
}

type SortBy = 'due_date' | 'created_at' | 'title';
type SortOrder = 'asc' | 'desc';

export function TodoList({ projectId }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('due_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showAllOngoing, setShowAllOngoing] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  useEffect(() => {
    loadTodos();
  }, [projectId]);

  const loadTodos = async () => {
    setLoading(true);
    const { data, error } = await getTodos(projectId);
    if (data) {
      setTodos(data);
    }
    setLoading(false);
  };

  const sortTodos = (todosToSort: Todo[]): Todo[] => {
    return [...todosToSort].sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'due_date') {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        comparison = dateA - dateB;
      } else if (sortBy === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    // Optimistic update
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, completed } : todo))
    );

    const { error } = await toggleTodoComplete(id, completed);
    if (error) {
      // Revert on error
      setTodos((prev) =>
        prev.map((todo) => (todo.id === id ? { ...todo, completed: !completed } : todo))
      );
    }
  };

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingTodo(null);
    setModalOpen(true);
  };

  const handleModalClose = (refresh: boolean) => {
    setModalOpen(false);
    setEditingTodo(null);
    if (refresh) {
      loadTodos();
    }
  };

  const toggleSort = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const ongoingTodos = sortTodos(todos.filter((todo) => !todo.completed));
  const completedTodos = sortTodos(todos.filter((todo) => todo.completed));

  const displayedOngoing = showAllOngoing ? ongoingTodos : ongoingTodos.slice(0, 5);
  const displayedCompleted = showAllCompleted ? completedTodos : completedTodos.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header with Add Button and Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleAddNew}
          className="bg-neutral-700 hover:bg-neutral-800 text-white font-medium text-[10px] sm:text-xs px-2 py-1 h-6 sm:h-7"
        >
          + New Task
        </Button>
        
        <div className="flex items-center gap-1">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="text-[10px] sm:text-xs rounded-md px-2 py-1 bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-neutral-300 flex-1 sm:flex-none border-0"
          >
            <option value="due_date">Sort by Due Date</option>
            <option value="created_at">Sort by Created</option>
            <option value="title">Sort by Title</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSort}
            className="h-6 sm:h-7 w-6 sm:w-7 p-0 border-0 bg-neutral-50 hover:bg-neutral-100 flex-shrink-0"
          >
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Ongoing Tasks */}
      <div className="bg-neutral-50 rounded-lg p-2">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="h-1 w-1 rounded-full bg-neutral-600"></div>
          <h2 className="text-[10px] sm:text-xs font-semibold text-neutral-900">Ongoing Tasks</h2>
          {ongoingTodos.length > 0 && (
            <span className="ml-auto bg-neutral-600 text-white text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {ongoingTodos.length}
            </span>
          )}
        </div>
        {ongoingTodos.length === 0 ? (
          <div className="text-center py-4 bg-white rounded-lg">
            <p className="text-[10px] sm:text-xs text-neutral-500">No ongoing tasks</p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {displayedOngoing.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleEdit}
                />
              ))}
            </div>
            {ongoingTodos.length > 5 && !showAllOngoing && (
              <Button
                variant="link"
                onClick={() => setShowAllOngoing(true)}
                className="mt-1 text-[10px] sm:text-xs text-neutral-700 hover:text-neutral-900 h-auto p-0"
              >
                View all {ongoingTodos.length} items →
              </Button>
            )}
          </>
        )}
      </div>

      {/* Completed Tasks */}
      <div className="bg-neutral-100 rounded-lg p-2">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="h-1 w-1 rounded-full bg-neutral-600"></div>
          <h2 className="text-[10px] sm:text-xs font-semibold text-neutral-900">Completed Tasks</h2>
          {completedTodos.length > 0 && (
            <span className="ml-auto bg-neutral-600 text-white text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {completedTodos.length}
            </span>
          )}
        </div>
        {completedTodos.length === 0 ? (
          <div className="text-center py-4 bg-white rounded-lg">
            <p className="text-[10px] sm:text-xs text-neutral-500">No completed tasks</p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {displayedCompleted.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleEdit}
                />
              ))}
            </div>
            {completedTodos.length > 5 && !showAllCompleted && (
              <Button
                variant="link"
                onClick={() => setShowAllCompleted(true)}
                className="mt-1 text-[10px] sm:text-xs text-neutral-700 hover:text-neutral-900 h-auto p-0"
              >
                View all {completedTodos.length} items →
              </Button>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <TodoModal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) handleModalClose(false);
        }}
        todo={editingTodo}
        projectId={projectId}
        onSuccess={() => handleModalClose(true)}
      />
    </div>
  );
}
