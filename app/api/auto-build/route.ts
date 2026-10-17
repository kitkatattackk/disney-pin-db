import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST() {
  const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
  const targetSite = "disneypinsblog.com"; 
  
  const characterSeeds = [
    'Mickey Mouse Sorcerer Hat', 
    'Stitch Loungefly Stained Glass', 
    'Haunted Mansion Limited Edition'
  ];

  let addedCount = 0;
  let logHistory: string[] = [];

  try {
    for (const character of characterSeeds) {
      // 1. Query Brave Web Search
      const textQuery = `site:${targetSite} "${character}" "retail price"`;
      const textRes = await fetch(
        `https://brave.com{encodeURIComponent(textQuery)}`,
        { headers: { 'X-Subscription-Token': BRAVE_API_KEY!, 'Accept': 'application/json' } }
      );
      const textData = await textRes.json();
      const resultsArray = textData.web?.results || [];
      
      // Grab the single first search result object safely
      const topMatch = resultsArray.length > 0 ? resultsArray[0] : null;

      if (!topMatch) {
        logHistory.push(`Skipped "${character}": No matching listings found on ${targetSite}`);
        continue;
      }

      const cleanName = topMatch.title.replace(/<\/?[^>]+(>|\$)/g, "");
      const cleanNotes = topMatch.description.replace(/<\/?[^>]+(>|\$)/g, "");

      // 2. Safely insert the main pin attributes into Supabase
      const { data: newPin, error: pinError } = await supabase
        .from('pins')
        .insert([
          {
            name: cleanName,
            notes: `Auto-Harvested: ${cleanNotes}`,
            release_year: 2026
          }
        ])
        .select()
        .single();

      if (pinError || !newPin) {
        logHistory.push(`Database error on "${cleanName}": ${pinError?.message || 'Could not select row'}`);
        continue;
      }
      
      addedCount++;
      logHistory.push(`Success: Created database entry for "${cleanName}"`);

      // 3. Query Brave Image Search
      const imgQuery = `site:${targetSite} "${character}" pin`;
      const imgRes = await fetch(
        `https://brave.com{encodeURIComponent(imgQuery)}&count=2`,
        { headers: { 'X-Subscription-Token': BRAVE_API_KEY!, 'Accept': 'application/json' } }
      );
      const imgData = await imgRes.json();
      const foundImages = imgData.results || [];

      for (const img of foundImages) {
        const imgUrl = img.properties?.url;
        if (!imgUrl) continue;

        await supabase
          .from('pin_images')
          .insert([
            {
              pin_id: newPin.id,
              storage_url: imgUrl,
              is_primary: foundImages.indexOf(img) === 0
            }
          ]);
      }
      
      // Prevent API rate limit caps
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return NextResponse.json({ 
      success: true, 
      message: `Data sync finished. Created ${addedCount} total pin profiles with photos!`,
      details: logHistory
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, details: logHistory }, { status: 500 });
  }
}
