import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { pinName } = await request.json();
    const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

    if (!BRAVE_API_KEY) {
      return NextResponse.json({ error: 'Brave API Key configuration is missing.' }, { status: 500 });
    }

    // Query Brave Web Search for structural descriptions & pricing hints
    const searchRes = await fetch(
      `https://brave.com{encodeURIComponent(pinName)}+original+retail+price`,
      {
        headers: {
          'X-Subscription-Token': BRAVE_API_KEY,
          'Accept': 'application/json'
        }
      }
    );
    
    const searchData = await searchRes.json();

    return NextResponse.json({
      searchResults: searchData.web?.results || []
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to query Brave Search pipeline' }, { status: 500 });
  }
}
