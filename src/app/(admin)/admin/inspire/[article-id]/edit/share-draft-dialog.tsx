'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { CheckIcon, CopyIcon, Link2Icon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { generateArticleShareLinkAction, revokeArticleShareLinkAction } from './actions';

/**
 * Client review link dialog (spec-article-draft-client-review).
 *
 * Generates on first open — an admin who never opens this never mints a token,
 * so drafts don't accumulate live public URLs nobody asked for. Regenerating
 * returns the SAME url by design (see `generateArticleShareLinkAction`); the
 * only way to invalidate is the explicit Revoke below, which is behind a
 * confirm step because the link may already be in a client's inbox.
 */
export function ShareDraftDialog({
  articleId,
  open,
  onOpenChange,
}: {
  articleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [isPending, startTransition] = useTransition();
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Absolute URL for display/copy — the client pastes this into a browser, so a
   * bare `/draft/...` path would be useless.
   *
   * Derived from `window.location.origin`, NOT `NEXT_PUBLIC_SITE_URL`. This is a
   * client component, so the browser's own origin is available and is by
   * definition the host the admin is actually looking at. The env var is not:
   * on a preview deploy or on localhost it is either unset (falling back to the
   * production domain) or pointing somewhere else entirely, so the admin would
   * copy a `hellokahwin.com` URL for a token that only exists in the dev
   * database — the client then gets a bare 404 with nothing to explain it.
   *
   * `sharePath` only ever becomes non-null from a client-side action result, so
   * this never reads `window` during the server render or first hydration pass.
   */
  const shareUrl = sharePath ? `${window.location.origin}${sharePath}` : '';

  // Mint the link on first open. Re-opening reuses whatever we already hold.
  // The `isPending` guard matters as much as the `sharePath` one: without it a
  // fast open/close/open (or strict mode's double-mount) fires a second
  // generate while the first is still in flight.
  useEffect(() => {
    if (!open || sharePath || isPending) return;

    startTransition(async () => {
      const result = await generateArticleShareLinkAction(articleId);
      if ('error' in result && result.error) {
        toast.error(result.error);
        return;
      }
      if (result.shareUrl) setSharePath(result.shareUrl);
    });
  }, [open, sharePath, isPending, articleId]);

  // Drop any pending "Copied" reset when the dialog goes away, so it can't fire
  // against an unmounted component and leave the next open flickering back to
  // "Copy" mid-read.
  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  /**
   * Close + reset the transient UI, so the next open never starts mid-confirm
   * or still reading "Copied". Done in the close handler rather than a
   * close-watching effect: the close IS the event, and setting state from an
   * effect body just to observe it would cascade an extra render.
   */
  function handleOpenChange(next: boolean) {
    if (!next) {
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current);
        copyResetRef.current = null;
      }
      setCopied(false);
      setConfirmingRevoke(false);
    }
    onOpenChange(next);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      // Keep a handle on the reset so closing the dialog (or unmounting) can
      // cancel it — an orphaned timer fires into a dead component and makes a
      // reopen within 2s flip from "Copied" back to "Copy" under the cursor.
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => {
        copyResetRef.current = null;
        setCopied(false);
      }, 2000);
    } catch {
      toast.error('Could not copy — select the link and copy it manually');
    }
  }

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokeArticleShareLinkAction(articleId);
      if ('error' in result && result.error) {
        toast.error(result.error);
        return;
      }
      // Clearing the path re-arms the generate-on-open effect, so the next open
      // mints a fresh token rather than showing the dead one.
      setSharePath(null);
      setConfirmingRevoke(false);
      toast.success('Share link revoked');
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share with client</DialogTitle>
          <DialogDescription>
            Anyone with this link can read the draft — no account needed. It stays valid until you
            revoke it, and search engines are blocked from indexing it.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={isPending && !sharePath ? 'Generating link…' : shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 font-mono text-xs"
            />
            <Button
              variant="quiet"
              size="sm"
              onClick={handleCopy}
              disabled={!sharePath || isPending}
            >
              {copied ? (
                <>
                  <CheckIcon className="mr-1 size-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <CopyIcon className="mr-1 size-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {confirmingRevoke ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                This breaks the link for anyone already holding it.
              </span>
              <Button variant="quiet" size="sm" onClick={() => setConfirmingRevoke(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleRevoke} disabled={isPending}>
                {isPending ? 'Revoking…' : 'Revoke'}
              </Button>
            </div>
          ) : (
            <Button
              variant="quiet"
              size="sm"
              onClick={() => setConfirmingRevoke(true)}
              disabled={!sharePath || isPending}
            >
              <Trash2Icon className="mr-1 size-3.5" />
              Revoke link
            </Button>
          )}

          <Button variant="quiet" size="sm" onClick={() => handleOpenChange(false)}>
            <Link2Icon className="mr-1 size-3.5" />
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
