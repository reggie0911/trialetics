'use client';

import { useState } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { Edit, Trash2, Check, X, Loader2, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { OrganizationNote } from '@/lib/types/contacts-organizations';

interface OrganizationNoteCardProps {
  note: OrganizationNote;
  currentProfileId: string;
  onEdit: (noteId: string, content: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
  isFirst?: boolean;
}

/**
 * Extracts the performer's name from email
 */
function getAuthorName(email: string | null | undefined): string {
  if (!email) return 'Unknown User';
  const namePart = email.split('@')[0];
  return namePart
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Formats the note timestamp
 */
function formatNoteTime(date: Date): string {
  if (isToday(date)) {
    const hoursAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hoursAgo < 1) {
      const minutesAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
      return minutesAgo === 0 ? 'Just now' : `${minutesAgo}m ago`;
    }
    return `${hoursAgo}h ago`;
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'dd MMM yyyy');
}

export function OrganizationNoteCard({
  note,
  currentProfileId,
  onEdit,
  onDelete,
  isFirst = false,
}: OrganizationNoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isAuthor = note.created_by_id === currentProfileId;
  const authorEmail = note.creator_email || 'unknown@example.com';
  const noteDate = new Date(note.created_at);
  const timeDisplay = formatNoteTime(noteDate);
  const isEdited = note.updated_at !== note.created_at;

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    
    setIsLoading(true);
    try {
      await onEdit(note.id, editContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete(note.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting note:', error);
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="group relative">
        {/* Timeline connector */}
        {!isFirst && (
          <div className="absolute left-4 -top-4 w-[1px] h-4 bg-border" />
        )}
        
        <div className="flex gap-3">
          {/* Icon Avatar */}
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full border border-border bg-muted flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate">{authorEmail}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{timeDisplay}</span>
                  {isEdited && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground italic">edited</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              {isAuthor && !isEditing && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsEditing(true)}
                    className="h-7 w-7"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="h-7 w-7 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Note content or edit mode */}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                  placeholder="Edit your note..."
                  maxLength={10000}
                  disabled={isLoading}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isLoading}
                    className="text-xs h-7"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim() || isLoading}
                    className="text-xs h-7"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                {note.content}
              </p>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xs">Delete Note</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This note will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading} className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isLoading}
              className="text-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
