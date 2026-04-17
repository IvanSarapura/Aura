import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { fetchTips } from '@/lib/fetchTips';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address') ?? '';
  const type = (searchParams.get('type') ?? 'received') as 'received' | 'sent';

  if (!isAddress(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  try {
    const tips = await fetchTips(address, type);

    tips.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return NextResponse.json({ tips });
  } catch {
    return NextResponse.json({ tips: [] });
  }
}
