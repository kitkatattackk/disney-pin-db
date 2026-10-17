import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST() {
  const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
  const targetSite = "disneypinsblog.com"; 
  
  // Specific targets to trigger the dual engine
  const characterSeeds = [
    'Mickey Mouse Sorcerer Hat', 
    'Stitch Loungefly Stained Glass', 
    'Haunted Mansion Limited Edition', 
    'Zero Nightmare Before Christmas'
  ];

  let addedCount = 0;

  try {
    for (const character of characterSeeds) {
      // --- STAGE 1: GATHER DETAILS FROM WEB SEARCH ---
      const textQuery = `site:${targetSite} "${character}" "retail price"`;
      const textRes = await fetch(
        `https://brave.com{encodeURIComponent(textQuery)}`,
        { headers: { 'X-Subscription-Token': BRAVE_API_KEY!, 'Accept': 'application/json' } }
      );
      const textData = await textRes.json();
      const topMatch = textData.web?.results?.[0]; // Grab the best matching structural text page

      if (!topMatch) continue;

      const cleanName = topMatch.title.replace(/<\/?[^>]+(>|\$)/g, "");
      const cleanNotes = topMatch.description.replace(/<\/?[^>]+(>|\$)/g, "");

      // Insert primary pin attributes into Supabase
      const { data: newPin, error: pinError } = await supabase
        .from('pins')
        .insert([
          {
            name: cleanName,
            notes: `Auto-Harvested Details: ${cleanNotes}`,
            release_year: 2026
          }
        ])
        .select()
        .single();

      if (pinError || !newPin) continue;
      addedCount++;

      // --- STAGE 2: GATHER VISUAL IMAGES FROM IMAGE SEARCH ---
      const imgQuery = `site:${targetSite} "${character}" pin`;
      const imgRes = await fetch(
        `https://brave.com{encodeURIComponent(imgQuery)}&count=2`,
        { headers: { 'X-Subscription-Token': BRAVE_API_KEY!, 'Accept': 'application/json' } }
      );
      const imgData = await imgRes.json();
      const foundImages = imgData.results || [];

      // Loop through pictures found and link them directly to our fresh pin entry
      for (const img of foundImages) {
        const imgUrl = img.properties?.url;
        if (!imgUrl) continue;

        await supabase
          .from('pin_images')
          .insert([
            {
              pin_id: newPin.id,
              storage_url: imgUrl,
              is_primary: foundImages.indexOf(img) === 0 // Mark the first image as primary
            }
          ]);
      }
      
      // Delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    return NextResponse.json({ 
      success: true, 
      message: `Success! Fully mapped ${addedCount} pins with complete descriptions and photos from ${targetSite}.` 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
