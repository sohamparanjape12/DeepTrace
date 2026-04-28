const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/assets/some-dummy-id-12345/finalize', {
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
    const data = await res.json();
    console.log('Response:', data);
  } catch (e) {
    console.error(e);
  }
}

test();
