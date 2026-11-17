// The crop editor works in whole degrees (HK-2): media-tools on Cloudflare
// only rotates by integer angles, so the preview, the crop coordinates and the
// angle sent to /api/v1/inspire/crop must all be the same integer.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { snapRotation } from '../snap-rotation';

type CropperProps = {
  rotation: number;
  onRotationChange: (r: number) => void;
  onCropComplete: (a: unknown, px: { x: number; y: number; width: number; height: number }) => void;
};
let cropper: CropperProps;
vi.mock('react-easy-crop', () => ({
  default: (props: CropperProps) => {
    cropper = props;
    return <div data-testid="cropper" data-rotation={props.rotation} />;
  },
}));
vi.mock('@/app/(admin)/admin/inspire/media/actions', () => ({
  createMediaRecordAction: vi.fn(async () => ({ success: true, data: { id: 'm2' } })),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// jsdom has no ResizeObserver; the Radix slider measures itself with one.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const { MediaImageEditor } = await import('../media-image-editor');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('snapRotation', () => {
  it('rounds to whole degrees and keeps the sign', () => {
    expect(snapRotation(15.5)).toBe(16);
    expect(snapRotation(15.4)).toBe(15);
    expect(snapRotation(-10.6)).toBe(-11);
    expect(snapRotation(-0.4)).toBe(0);
    expect(Object.is(snapRotation(-0.4), 0)).toBe(true);
  });

  it('turns an emptied or invalid input into 0, and parses typed text', () => {
    expect(snapRotation('')).toBe(0);
    expect(snapRotation('abc')).toBe(0);
    expect(snapRotation(Number.NaN)).toBe(0);
    expect(snapRotation('22.7')).toBe(23);
  });
});

describe('MediaImageEditor rotation', () => {
  const media = {
    id: 'm1',
    url: 'https://img.example/inspire/2026/photo/original.jpg',
    variants: null,
    originalArticleId: null,
  } as unknown as Parameters<typeof MediaImageEditor>[0]['media'];

  it('previews, edits and saves the same whole-degree angle', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ success: false, error: { message: 'stop here' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<MediaImageEditor media={media} onBack={() => {}} onSaved={() => {}} />);

    // The rotate gesture reports a fractional angle: the preview gets 16.
    act(() => cropper.onRotationChange(15.5));
    expect(screen.getByTestId('cropper').getAttribute('data-rotation')).toBe('16');
    // The rotation number box (the other spinbuttons are the custom aspect W/H).
    const box = (screen.getAllByRole('spinbutton') as HTMLInputElement[]).find(
      (el) => el.max === '360',
    )!;
    expect(box.value).toBe('16');
    expect(box.step).toBe('1');

    // Typing a fraction into the number box snaps too.
    fireEvent.change(box, { target: { value: '22.7' } });
    expect(screen.getByTestId('cropper').getAttribute('data-rotation')).toBe('23');

    // The crop is measured at 23 deg, and 23 is what the server receives.
    act(() => cropper.onCropComplete({}, { x: 1, y: 2, width: 300, height: 200 }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.rotation).toBe(23);
  });
});
