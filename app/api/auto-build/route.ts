import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST() {
  const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
  
  // A seed list of categories to kick off automated batch searching
  const designSeeds = [
    'Mickey Mouse 2025 open edition',
    'Stitch Disney trading pin',
    'Lion King limited edition pin',
    'Aladdin genie disney pin',
    'Disneyland haunted mansion pin'
  ];

  let addedCount = 0;

  try {
    for (const seed of designSeeds) {
      // 1. Ask Brave to find pin references matching our keyword
      const searchRes = await fetch(
        `https://brave.com{encodeURIComponent(seed)}+retail+price`,
        { headers: { 'X-Subscription-Token': BRAVE_API_KEY!, 'Accept': 'application/json' } }
      );
      const searchData = await searchRes.json();
      const webResults = searchData.web?.results || [];

      // 2. Loop through the web matches found by Brave and insert them directly into Supabase
      for (const result of webResults.slice(0, 3)) { // Limit to top 3 matches per seed to protect API limits
        // Strip out HTML formatting tags like <b> from Brave's highlights
        const cleanName = result.title.replace(/<\/?[^>]+(>|\$)/g, "");
        const cleanNotes = result.description.replace(/<\/?[^>]+(>|\$)/g, "");

        const { error } = await supabase
          .from('pins')
          .insert([
            {
              name: cleanName,
              notes: `Auto-generated via Brave pipeline scraper: ${cleanNotes}`,
              release_year: 2026
            }
          ]);
        
        if (!error) addedCount++;
      }
      
      // Minor delay to respect rate limiting rules
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({ success: true, message: `Automation complete! Auto-built ${addedCount} pin data records.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
