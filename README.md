This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Pin & Pop import

`npm run import:pinandpop` loads `.env.local`, discovers individual Pin & Pop
listings with Brave Search, and upserts pins and original image URLs into the
existing Supabase `pins` and `pin_images` tables. It does not copy image files
into Supabase Storage. The website searches the saved collection without Brave.

The import allows **1,000 total Brave request attempts**, estimated at **$5** at
$5/1,000 requests. Failed attempts count too. This is the importer’s budget;
it cannot account for other applications using the same key or pricing changes.

Progress, raw responses, and the durable spend ledger live in the gitignored
`.imports/` folder. Keep this folder to preserve the budget across restarts.
Requests are reserved on disk before they are sent. An interrupted reservation
still consumes budget conservatively. A lock prevents two runners sharing this
folder. After a crash, inspect the PID in `.imports/pinandpop.lock` and only
remove that lock if its process is gone. Resume with the same command.

Pin IDs derive from Pin & Pop IDs; image IDs derive from pin ID plus image URL,
so reruns upsert the same records. Listings/categories, logos, and images without
an exact Pin & Pop pin source page are rejected. Release years and editions are
filled only when explicitly present in indexed descriptions. Full cached API
responses stay local for later enrichment.

`npm run test:import` checks budget enforcement, source validation, identity,
metadata parsing, and image filtering. `lib/pinandpop-import.json` is the latest
saved import report. Deploy after completion to publish the final spend/image
counts; the pin count is read live from Supabase.

The runner persists a halt on Brave HTTP 401/402/403/429 responses. A later
invocation reconciles cached records but sends no more Brave requests while that
halt remains. The completed run stopped on HTTP 402 (account credit limit).

## Personal web app

Pinfolio now provides owner-only sign-in, catalog browsing, photo input, pin details, local collection/wishlist, backup/restore, and history. See [PERSONAL_SETUP.md](PERSONAL_SETUP.md) for the prepared Supabase access migration, sign-in redirects, AI matching configuration and current eBay integration limits.
