'use client';

import { useState, useEffect, useMemo } from 'react';
import { FileText, Loader2, MessageSquarePlus, Search, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { OrganizationNote } from '@/lib/types/contacts-organizations';
import { OrganizationNoteCard } from './organization-note-card';
import {
  createOrganizationNote,
  updateOrganizationNote,
  deleteOrganizationNote,
} from '@/lib/actions/organization-notes';
import { useRouter } from 'next/navigation';

interface OrganizationNotesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  companyId: string;
  profileId: string;
  userEmail: string;
  initialNotes: OrganizationNote[];
}

export function OrganizationNotesSheet({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  companyId,
  profileId,
  userEmail,
  initialNotes,
}: OrganizationNotesSheetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [notes, setNotes] = useState<OrganizationNote[]>(initialNotes);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const maxCharacters = 10000;

  // Update notes when initialNotes changes
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  // Filter notes based on search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) {
      return notes;
    }

    const query = searchQuery.toLowerCase().trim();
    return notes.filter((note) => {
      const email = (note.creator_email || '').toLowerCase();
      const content = note.content.toLowerCase();
      return email.includes(query) || content.includes(query);
    });
  }, [notes, searchQuery]);

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;

    setIsSubmitting(true);
    try {
      const newNote = await createOrganizationNote(
        organizationId,
        companyId,
        newNoteContent,
        profileId,
        userEmail
      );
      
      // Add new note to the top of the list
      setNotes([newNote, ...notes]);
      setNewNoteContent('');
      setCharacterCount(0);
      
      toast({
        title: 'Note added',
        description: 'Your note has been added successfully.',
      });

      // Refresh the page data
      router.refresh();
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add note',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditNote = async (noteId: string, content: string) => {
    try {
      const updatedNote = await updateOrganizationNote(noteId, content);
      
      // Update the note in the list
      setNotes(notes.map((note) => (note.id === noteId ? updatedNote : note)));
      
      toast({
        title: 'Note updated',
        description: 'Your note has been updated successfully.',
      });

      // Refresh the page data
      router.refresh();
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update note',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteOrganizationNote(noteId, organizationId);
      
      // Remove the note from the list
      setNotes(notes.filter((note) => note.id !== noteId));
      
      toast({
        title: 'Note deleted',
        description: 'Your note has been deleted successfully.',
      });

      // Refresh the page data
      router.refresh();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete note',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    if (content.length <= maxCharacters) {
      setNewNoteContent(content);
      setCharacterCount(content.length);
    }
  };

  const hasNotes = notes.length > 0;
  const hasSearchResults = filteredNotes.length > 0;
  const isSearching = searchQuery.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        {/* Shadcn-style Header */}
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="text-xs font-semibold">
            Notes{hasNotes && <span className="text-muted-foreground font-normal"> ({notes.length})</span>}
          </SheetTitle>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{organizationName}</p>
        </SheetHeader>

        {/* Search Input */}
        {hasNotes && (
          <div className="px-4 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs h-8 pl-8 pr-8"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {isSearching && (
              <p className="text-xs text-muted-foreground mt-2">
                {hasSearchResults 
                  ? `${filteredNotes.length} ${filteredNotes.length === 1 ? 'result' : 'results'}`
                  : 'No results found'}
              </p>
            )}
          </div>
        )}

        {/* Notes List */}
        <ScrollArea className="flex-1">
          {!hasNotes ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-12 w-12 rounded-lg border border-dashed flex items-center justify-center mb-3">
                <MessageSquarePlus className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium mb-1">No notes yet</p>
              <p className="text-xs text-muted-foreground">
                Get started by adding your first note
              </p>
            </div>
          ) : hasSearchResults ? (
            <div className="p-4 space-y-4">
              {filteredNotes.map((note, index) => (
                <OrganizationNoteCard
                  key={note.id}
                  note={note}
                  currentProfileId={profileId}
                  onEdit={handleEditNote}
                  onDelete={handleDeleteNote}
                  isFirst={index === 0}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Search className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-xs font-medium mb-1">No notes found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search</p>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="px-4 py-3 border-t">
          <div className="w-full space-y-2">
            <Textarea
              value={newNoteContent}
              onChange={handleContentChange}
              placeholder="Add a note..."
              rows={2}
              className="text-xs resize-none"
              disabled={isSubmitting}
              maxLength={maxCharacters}
            />
            <div className="flex items-center justify-between">
              {characterCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {characterCount.toLocaleString()}
                </span>
              )}
              <Button
                onClick={handleCreateNote}
                disabled={!newNoteContent.trim() || isSubmitting}
                size="sm"
                className="text-xs h-8 ml-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <MessageSquarePlus className="h-3.5 w-3.5 mr-1.5" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
