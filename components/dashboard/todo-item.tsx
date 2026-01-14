'use client';

import { Todo, TAG_COLORS } from '@/lib/types/todo';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, Circle } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns';

interface TodoItemProps {
  todo: Todo;
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (todo: Todo) => void;
}

export function TodoItem({ todo, onToggleComplete, onEdit }: TodoItemProps) {
  const isOverdue = todo.due_date && !todo.completed && isPast(new Date(todo.due_date)) && !isToday(new Date(todo.due_date));
  const isDueToday = todo.due_date && isToday(new Date(todo.due_date));
  const isDueTomorrow = todo.due_date && isTomorrow(new Date(todo.due_date));

  const getDueDateColor = () => {
    if (todo.completed) return 'text-green-600/70';
    if (isOverdue) return 'text-red-600 font-semibold';
    if (isDueToday) return 'text-amber-600 font-semibold';
    return 'text-slate-600';
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM d');
  };

  // Add dynamic tags based on due date
  const displayTags = [...todo.tags];
  if (isDueToday && !displayTags.includes('Today')) {
    displayTags.unshift('Today');
  }
  if (isDueTomorrow && !displayTags.includes('Tomorrow')) {
    displayTags.unshift('Tomorrow');
  }
  if (isOverdue && !displayTags.includes('Overdue')) {
    displayTags.unshift('Overdue');
  }

  // Different styling for ongoing vs completed
  const containerClasses = todo.completed
    ? "flex items-start gap-2 py-1.5 px-2 cursor-pointer bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-all duration-200"
    : "flex items-start gap-2 py-1.5 px-2 cursor-pointer bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md";

  return (
    <div
      className={containerClasses}
      onClick={() => onEdit(todo)}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(todo.id, !todo.completed);
        }}
        className="mt-0 shrink-0"
        aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {todo.completed ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <Circle className="h-4 w-4 text-slate-400 hover:text-blue-600 transition-colors" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h3
          className={`font-semibold text-[10px] ${
            todo.completed ? 'line-through text-green-800/70' : 'text-slate-900'
          }`}
        >
          {todo.title}
        </h3>

        {/* Description */}
        {todo.description && (
          <p
            className={`text-[10px] mt-0.5 line-clamp-2 ${
              todo.completed ? 'line-through text-green-700/60' : 'text-slate-600'
            }`}
          >
            {todo.description}
          </p>
        )}

        {/* Tags and Date */}
        <div className="flex items-center gap-1 mt-1 flex-wrap w-full">
          {/* Tags */}
          {displayTags.map((tag, index) => (
            <Badge
              key={index}
              variant={TAG_COLORS[tag] || 'default'}
              className={`text-[10px] ${todo.completed ? 'opacity-60' : ''}`}
            >
              {tag}
            </Badge>
          ))}

          {/* Due Date */}
          {todo.due_date && (
            <div className={`flex items-center gap-0.5 text-[10px] ${getDueDateColor()}`}>
              <Calendar className="h-2.5 w-2.5" />
              <span>{formatDueDate(todo.due_date)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
