'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import {
  createClusterAction,
  updateClusterSettingsAction,
  type ClusterActionState,
} from './actions';
import { ENTITY_PHRASE_MAX, PILLAR_INTRO_MAX, SERIES_DESCRIPTION_MAX } from './validation';

function useResultToast(state: ClusterActionState, success: string, onSuccess?: () => void) {
  useEffect(() => {
    if (!state) return;
    if ('error' in state) toast.error(state.error);
    else {
      toast.success(success);
      onSuccess?.();
    }
    // Only react to a new result object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

export function ClusterSettingsForm(props: {
  kind: 'pillar' | 'cluster';
  id: string;
  entityPhrase: string | null;
  fallbackPhrase: string;
  intro?: string | null;
  seriesEnabled?: boolean;
  seriesDescription?: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateClusterSettingsAction, null);
  useResultToast(state, 'Settings saved');
  const [description, setDescription] = useState(props.seriesDescription ?? '');
  const isCluster = props.kind === 'cluster';

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <input type="hidden" name="id" value={props.id} />
      <FormField
        label="Linking phrase (Malay)"
        htmlFor="entityPhrase"
        hint={`The words used whenever the site links to this ${props.kind}${
          isCluster ? ', and the title of its series box' : ''
        }. Leave empty to use “${props.fallbackPhrase}”.`}
      >
        <Input
          id="entityPhrase"
          name="entityPhrase"
          defaultValue={props.entityPhrase ?? ''}
          maxLength={ENTITY_PHRASE_MAX}
          placeholder={props.fallbackPhrase}
        />
      </FormField>

      {props.kind === 'pillar' && (
        <FormField
          label="Pillar page introduction (Malay)"
          htmlFor="intro"
          hint="Shown at the top of the pillar page. Leave a blank line between paragraphs."
        >
          <Textarea
            id="intro"
            name="intro"
            rows={6}
            defaultValue={props.intro ?? ''}
            maxLength={PILLAR_INTRO_MAX}
          />
        </FormField>
      )}

      {isCluster && (
        <>
          <div className="flex items-start gap-3">
            <Checkbox
              id="seriesEnabled"
              name="seriesEnabled"
              defaultChecked={props.seriesEnabled ?? false}
              className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <label htmlFor="seriesEnabled" className="text-[12.5px] font-semibold">
                Show the “Dalam siri ini” box on this cluster’s articles
              </label>
              <p className="text-muted-foreground text-[11.5px]">
                Readers see it near the top of each live article in the cluster, once there is at
                least one other live article to link to.
              </p>
            </div>
          </div>
          <FormField
            label="Series box description (Malay, optional)"
            htmlFor="seriesDescription"
            hint={`One short line under the box title. Plain text. ${description.length}/${SERIES_DESCRIPTION_MAX} characters.`}
          >
            <Textarea
              id="seriesDescription"
              name="seriesDescription"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={SERIES_DESCRIPTION_MAX}
            />
          </FormField>
        </>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}

export function CreateClusterForm({ pillarId }: { pillarId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createClusterAction, null);
  useResultToast(state, 'Cluster added', () => formRef.current?.reset());

  return (
    <form ref={formRef} action={formAction} className="flex max-w-2xl flex-col gap-5">
      <input type="hidden" name="pillarId" value={pillarId} />
      <FormField
        label="Cluster name"
        htmlFor="cluster-name"
        hint="Shown in the admin and on the pillar page."
        required
      >
        <Input
          id="cluster-name"
          name="name"
          required
          maxLength={ENTITY_PHRASE_MAX}
          placeholder="e.g. Mas kahwin ikut negeri"
        />
      </FormField>
      <FormField
        label="Linking phrase (Malay, optional)"
        htmlFor="cluster-phrase"
        hint="The words used whenever the site links to this cluster. Leave empty to use the name."
      >
        <Input id="cluster-phrase" name="entityPhrase" maxLength={ENTITY_PHRASE_MAX} />
      </FormField>
      <FormField
        label="Web address (optional)"
        htmlFor="cluster-slug"
        hint="Made from the name when left empty. Letters, numbers and dashes only."
      >
        <Input id="cluster-slug" name="slug" maxLength={120} placeholder="mas-kahwin-ikut-negeri" />
      </FormField>
      <p className="text-muted-foreground text-[11.5px]">
        The cluster code (such as C3.5) is assigned automatically. The series box starts off.
      </p>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add cluster'}
        </Button>
      </div>
    </form>
  );
}
