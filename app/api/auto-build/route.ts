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
    'Mickey Mouse Sorcerer', 
    'Stitch Loungefly Stained Glass', 
    'Haunted Mansion Limited Edition'
  ];

  let addedCount = 0;
  let logHistory: string[] = [];

  try {
    for (const character of characterSeeds) {
      // 1. Gather text details from Brave Web Search
      const textQuery = `site:${targetSite} "${character}"`;
      const textRes = await fetch(
        `https://brave.com{encodeURIComponent(textQuery)}`,
        { headers: { 'X-Subscription-Token': BRAVE_API_KEY!, 'Accept': 'application/json' } }
      );
      const textData = await textRes.json();
      const resultsArray = textData.web?.results || [];
      
      // FIX: Explicitly target the first result object at index 0
      const topMatch = resultsArray.length > 0 ? resultsArray[0] : null;

      if (!topMatch) {
        logHistory.push(`Skipped "${character}": No web references found on ${targetSite}`);
        continue;
      }

      const cleanName = topMatch.title.replace(/<\/?[^>]+(>|\$)/g, "");
      const cleanNotes = topMatch.description.replace(/<\/?[^>]+(>|\$)/g, "");

      // 2. Insert primary row into Supabase
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
        logHistory.push(`Database error on "${cleanName}": ${pinError?.message || 'Insert rejected'}`);
        continue;
      }
      
      addedCount++;
      logHistory.push(`Success: Saved pin data for "${cleanName}"`);

      // 3. Gather photos across broad web index
      const imgQuery = `"${character}" disney trading pin`;
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
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return NextResponse.json({ 
      success: true, 
      message: `Database sync complete! Created ${addedCount} pin profiles with photo references.`,
      details: logHistory
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, details: logHistory }, { status: 500 });
  }
}
