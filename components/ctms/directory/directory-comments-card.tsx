"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  addDirectoryComment,
  deleteDirectoryComment,
  updateDirectoryComment,
  type DirectoryCommentRow,
  type DirectoryEntityType,
} from "@/lib/actions/directory-comments";

function authorLabel(c: DirectoryCommentRow): string {
  const p = c.profiles;
  if (!p) return "Unknown";
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (p.email) return p.email;
  return "User";
}

function authorInitials(c: DirectoryCommentRow): string {
  const p = c.profiles;
  if (!p) return "?";
  const a = (p.first_name?.[0] ?? "").toUpperCase();
  const b = (p.last_name?.[0] ?? "").toUpperCase();
  if (a && b) return a + b;
  if (a) return a;
  if (p.email?.[0]) return p.email[0].toUpperCase();
  return "?";
}

export interface DirectoryCommentsProps {
  entityType: DirectoryEntityType;
  entityId: string;
  canEdit: boolean;
  currentUserId: string;
  initialComments: DirectoryCommentRow[];
}

export function DirectoryComments({
  entityType,
  entityId,
  canEdit,
  currentUserId,
  initialComments,
}: DirectoryCommentsProps) {
  const [comments, setComments] = useState<DirectoryCommentRow[]>(initialComments);
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canMutate = (authorId: string) => canEdit && authorId === currentUserId;

  const handlePost = () => {
    const body = draft.trim();
    if (!body) return;
    startTransition(async () => {
      const prev = comments;
      const optimistic: DirectoryCommentRow = {
        id: `temp-${Date.now()}`,
        company_id: "",
        entity_type: entityType,
        entity_id: entityId,
        author_id: currentUserId,
        body,
        created_at: new Date().toISOString(),
        edited_at: null,
        profiles: null,
      };
      setComments((c) => [...c, optimistic]);
      setDraft("");
      const { data, error } = await addDirectoryComment(entityType, entityId, body);
      if (error || !data) {
        setComments(prev);
        toast.error(error ?? "Could not post comment.");
        return;
      }
      setComments((c) => c.filter((x) => x.id !== optimistic.id).concat(data));
    });
  };

  const startEdit = (c: DirectoryCommentRow) => {
    setEditingId(c.id);
    setEditText(c.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = () => {
    if (!editingId) return;
    const body = editText.trim();
    if (!body) {
      toast.error("Comment cannot be empty.");
      return;
    }
    const id = editingId;
    startTransition(async () => {
      const prev = comments;
      setComments((rows) =>
        rows.map((r) => (r.id === id ? { ...r, body, edited_at: new Date().toISOString() } : r))
      );
      setEditingId(null);
      setEditText("");
      const { error } = await updateDirectoryComment(id, body);
      if (error) {
        setComments(prev);
        toast.error(error);
        return;
      }

    });
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    const id = deleteId;
    startTransition(async () => {
      const prev = comments;
      setComments((rows) => rows.filter((r) => r.id !== id));
      setDeleteId(null);
      const { error } = await deleteDirectoryComment(id);
      if (error) {
        setComments(prev);
        toast.error(error);
        return;
      }

    });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <h2 id="directory-notes-heading" className="text-base font-medium leading-none">
            Notes
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-[min(24rem,50vh)] overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="flex gap-3 rounded-md border border-border/60 bg-muted/30 p-3 text-xs"
                >
                  <Avatar size="sm" className="shrink-0">
                    {c.profiles?.avatar_url ? (
                      <AvatarImage src={c.profiles.avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback className="text-[10px]">{authorInitials(c)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-foreground">{authorLabel(c)}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {format(new Date(c.created_at), "PPp")}
                        {c.edited_at ? (
                          <span className="ml-1 text-muted-foreground/80">(edited)</span>
                        ) : null}
                      </span>
                    </div>
                    {editingId === c.id ? (
                      <div className="space-y-2 pt-1">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="text-xs min-h-[72px]"
                        />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" className="text-xs h-7" onClick={saveEdit} disabled={pending}>
                            Save
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={cancelEdit} disabled={pending}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground whitespace-pre-wrap break-words">{c.body}</p>
                    )}
                    {canMutate(c.author_id) && editingId !== c.id ? (
                      <div className="flex gap-1 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => startEdit(c)}
                          disabled={pending}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(c.id)}
                          disabled={pending}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          {canEdit ? (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <Textarea
                placeholder="Write a comment…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                className="text-xs min-h-[72px]"
              />
              <Button type="button" size="sm" className="text-xs" onClick={handlePost} disabled={pending || !draft.trim()}>
                Post comment
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}