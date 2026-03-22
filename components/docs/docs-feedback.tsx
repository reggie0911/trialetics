'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { submitDocsFeedback } from '@/lib/actions/docs-feedback';

interface DocsFeedbackProps {
  docSlug: string;
}

export function DocsFeedback({ docSlug }: DocsFeedbackProps) {
  const [submitted, setSubmitted] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleVote(helpful: boolean) {
    setIsHelpful(helpful);
    setShowComment(true);
  }

  async function handleSubmit() {
    if (isHelpful === null) return;
    setSubmitting(true);
    try {
      await submitDocsFeedback({
        docSlug,
        isHelpful,
        comment: comment.trim() || null,
      });
      setSubmitted(true);
    } catch {
      // Silently handle -- feedback is non-critical
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkipComment() {
    if (isHelpful === null) return;
    setSubmitting(true);
    try {
      await submitDocsFeedback({
        docSlug,
        isHelpful,
        comment: null,
      });
      setSubmitted(true);
    } catch {
      // Silently handle
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="border-t border-border mt-8 pt-6 text-center">
        <p className="text-[13px] text-muted-foreground">
          Thank you for your feedback!
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border mt-8 pt-6">
      <div className="text-center">
        <p className="text-[13px] font-medium mb-3">Was this page helpful?</p>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Button
            variant={isHelpful === true ? 'default' : 'outline'}
            size="sm"
            className="text-[11px] h-8 gap-1.5"
            onClick={() => handleVote(true)}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            Yes
          </Button>
          <Button
            variant={isHelpful === false ? 'default' : 'outline'}
            size="sm"
            className="text-[11px] h-8 gap-1.5"
            onClick={() => handleVote(false)}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            No
          </Button>
        </div>

        {showComment && (
          <div className="max-w-md mx-auto space-y-3">
            <Textarea
              placeholder="Any additional feedback? (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="text-[12px] min-h-[60px] resize-none"
            />
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                className="text-[11px] h-7"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit feedback'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] h-7"
                onClick={handleSkipComment}
                disabled={submitting}
              >
                Skip
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
