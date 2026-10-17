import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ebayQuery, ebayLinks, normalizeListings, ebayMarket } from '../lib/ebay.ts';
test('search links encode pin title and sold filters', () => {
  assert(ebayQuery('Stitch & Angel').includes('Disney pin'));
  assert(ebayQuery('x'.repeat(500)).length <= 100);
  const url = new URL(ebayLinks('Stitch & Angel').soldUrl);
  assert.equal(url.searchParams.get('LH_Sold'), '1');
  assert.equal(url.searchParams.get('LH_Complete'), '1');
});
test('listings reject unsafe links and missing price without fabricating values', () => {
  const item = { itemId: '1', title: 'Pin', itemWebUrl: 'https://www.ebay.com/itm/1', price: { value: '12.50', currency: 'USD' }, image: { imageUrl: 'https://i.ebayimg.com/images/1.jpg' } };
  const rows = normalizeListings([item, { ...item, itemWebUrl: 'javascript:alert(1)' }, { ...item, price: {} }, { ...item, itemWebUrl: 'https://ebay.com.attacker.example' }]);
  assert.equal(rows.length, 1); assert.equal(rows[0].price, '12.50');
});
test('production OAuth and browse results, cache, unavailable status', async () => {
  const original = globalThis.fetch;
  const oldId = process.env.EBAY_CLIENT_ID, oldSecret = process.env.EBAY_CLIENT_SECRET;
  delete process.env.EBAY_CLIENT_ID; delete process.env.EBAY_CLIENT_SECRET;
  assert.equal((await ebayMarket('Missing')).status, 'not_configured');
  process.env.EBAY_CLIENT_ID = 'test-app'; process.env.EBAY_CLIENT_SECRET = 'test-secret';
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert(String(url).startsWith('https://api.ebay.com/'));
    if (String(url).includes('/oauth2/token')) {
      assert.equal(options.method, 'POST');
      return Response.json({ access_token: 'test-token', expires_in: 7200 });
    }
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return Response.json({ itemSummaries: [{ itemId: '1', title: 'Stitch pin', itemWebUrl: 'https://www.ebay.com/itm/1', price: { value: '15', currency: 'USD' } }] });
  };
  try {
    const market = await ebayMarket('Stitch'); assert.equal(market.status, 'live'); assert.equal(market.listings.length, 1);
    await ebayMarket('Stitch'); assert.equal(calls, 2);
    globalThis.fetch = async () => new Response('', { status: 403 });
    assert.equal((await ebayMarket('Mickey')).status, 'unavailable');
  } finally {
    globalThis.fetch = original;
    if (oldId === undefined) delete process.env.EBAY_CLIENT_ID; else process.env.EBAY_CLIENT_ID = oldId;
    if (oldSecret === undefined) delete process.env.EBAY_CLIENT_SECRET; else process.env.EBAY_CLIENT_SECRET = oldSecret;
  }
});
