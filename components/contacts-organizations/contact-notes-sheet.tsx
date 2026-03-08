'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, MessageSquarePlus, Search, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ContactNote, NOTE_TYPE_LABELS, OrganizationNoteType } from '@/lib/types/contacts-organizations';
import { OrganizationNoteCard } from './organization-note-card';
import {
  createContactNote,
  updateContactNote,
  deleteContactNote,
} from '@/lib/actions/contact-notes';
import { useRouter } from 'next/navigation';

interface ContactNotesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  companyId: string;
  profileId: string;
  userEmail: string;
  initialNotes: ContactNote[];
}

export function ContactNotesSheet({
  open,
  onOpenChange,
  contactId,
  contactName,
  companyId,
  profileId,
  userEmail,
  initialNotes,
}: ContactNotesSheetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [notes, setNotes] = useState<ContactNote[]>(initialNotes);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<OrganizationNoteType | 'general'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const maxCharacters = 10000;

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const query = searchQuery.toLowerCase().trim();
    return notes.filter((note) => {
      const email = (note.creator_email || '').toLowerCase();
      const content = note.content.toLowerCase();
      const noteTypeLabel = (note.note_type && NOTE_TYPE_LABELS[note.note_type as OrganizationNoteType])
        ? NOTE_TYPE_LABELS[note.note_type as OrganizationNoteType].toLowerCase()
        : '';
      return email.includes(query) || content.includes(query) || noteTypeLabel.includes(query);
    });
  }, [notes, searchQuery]);

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;
    setIsSubmitting(true);
    try {
      const newNote = await createContactNote(contactId, companyId, newNoteContent, profileId, userEmail, newNoteType);
      setNotes([newNote, ...notes]);
      setNewNoteContent('');
      setCharacterCount(0);
      setNewNoteType('general');
      toast({ title: 'Note added', description: 'Your note has been added successfully.' });
      router.refresh();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to add note', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditNote = async (noteId: string, content: string) => {
    try {
      const updatedNote = await updateContactNote(noteId, content);
      setNotes(notes.map((n) => (n.id === noteId ? updatedNote : n)));
      toast({ title: 'Note updated', description: 'Your note has been updated successfully.' });
      router.refresh();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update note', variant: 'destructive' });
      throw error;
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteContactNote(noteId, contactId);
      setNotes(notes.filter((n) => n.id !== noteId));
      toast({ title: 'Note deleted', description: 'Your note has been deleted successfully.' });
      router.refresh();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete note', variant: 'destructive' });
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
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="text-xs font-semibold">
            Notes{hasNotes && <span className="text-muted-foreground font-normal"> ({notes.length})</span>}
          </SheetTitle>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{contactName}</p>
        </SheetHeader>

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

        <ScrollArea className="flex-1">
          {!hasNotes ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-12 w-12 rounded-lg border border-dashed flex items-center justify-center mb-3">
                <MessageSquarePlus className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium mb-1">No notes yet</p>
              <p className="text-xs text-muted-foreground">Get started by adding your first note</p>
            </div>
          ) : hasSearchResults ? (
            <div className="p-4 space-y-4">
              {filteredNotes.map((note, index) => (
                <OrganizationNoteCard
                  key={note.id}
                  note={note as any}
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

        <SheetFooter className="px-4 py-3 border-t">
          <div className="w-full space-y-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Note type</label>
              <Select value={newNoteType} onValueChange={(v) => setNewNoteType((v as OrganizationNoteType) || 'general')}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                <span className="text-xs text-muted-foreground">{characterCount.toLocaleString()}</span>
              )}
              <Button onClick={handleCreateNote} disabled={!newNoteContent.trim() || isSubmitting} size="sm" className="text-xs h-8 ml-auto">
                {isSubmitting ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Posting...</>
                ) : (
                  <><MessageSquarePlus className="h-3.5 w-3.5 mr-1.5" />Post</>
                )}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
