import { NextResponse } from 'next/server';

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 500, code?: string) {
  return NextResponse.json({ success: false, error: { message, code } }, { status });
}

export function apiPaginated<T>(data: T[], total: number, page: number, limit: number) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * Cursor-pagination envelope for the `/api/v2` surface (AD-9). `nextCursor` is an
 * opaque, signed token (or `null` on the last page) — clients round-trip it
 * verbatim and never construct it themselves.
 */
export function apiCursor<T>(data: T[], nextCursor: string | null, status = 200) {
  return NextResponse.json({ success: true, data, meta: { nextCursor } }, { status });
}
