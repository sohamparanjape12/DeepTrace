const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/assets/test-id-123/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Asset',
        ownerOrg: 'Test Org',
        rightsTier: 'commercial',
        selectedTags: [],
        assetDescription: '',
        selectedMatchUrls: []
      })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (e) {
    console.error(e);
  }
}

test();
