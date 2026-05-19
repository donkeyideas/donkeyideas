import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'authorization' && value) {
      headers[key] = value.length > 20 ? `${value.substring(0, 20)}...` : value;
    } else {
      headers[key] = value;
    }
  });
  return NextResponse.json({
    receivedHeaders: headers,
    cookies: request.cookies.getAll(),
    url: request.url,
  });
}
