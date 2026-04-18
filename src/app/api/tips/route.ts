import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { fetchTips } from '@/lib/fetchTips';

const PAGE_SIZE = 3;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address') ?? '';
  const type = (searchParams.get('type') ?? 'received') as 'received' | 'sent';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));

  if (!isAddress(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  try {
    const all = await fetchTips(address, type);

    all.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const start = (page - 1) * PAGE_SIZE;
    const tips = all.slice(start, start + PAGE_SIZE);
    const hasMore = start + PAGE_SIZE < all.length;

    return NextResponse.json({
      tips,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      total: all.length,
    });
  } catch (err) {
    console.error('[tips]', err);
    return NextResponse.json(
      {
        error: 'fetch_failed',
        tips: [],
        hasMore: false,
        nextPage: null,
        total: 0,
      },
      { status: 500 },
    );
  }
}
