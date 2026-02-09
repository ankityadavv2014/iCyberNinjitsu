// Placeholder: NextAuth or session auth will be wired in T003/T005
import { NextResponse } from 'next/server';
export function GET() {
  return NextResponse.json({ message: 'Auth not yet configured' }, { status: 501 });
}
export function POST() {
  return NextResponse.json({ message: 'Auth not yet configured' }, { status: 501 });
}
