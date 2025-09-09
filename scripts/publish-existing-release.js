#!/usr/bin/env node

const args = process.argv.slice(2);
const version = args[0];

if (!version) {
  console.error('Usage: node scripts/publish-existing-release.js <version>');
  console.error('Example: node scripts/publish-existing-release.js 1.0.0');
  process.exit(1);
}

const token = 'fvttp_W*#fv257N@VQj*AKSGtZU$lU';

const releaseData = {
  id: 'daggerheart-plus',
  release: {
    version: version,
    manifest: `https://github.com/featureJosh/daggerheart-plus/releases/download/v${version}/module.json`,
    notes: `https://github.com/featureJosh/daggerheart-plus/releases/tag/v${version}`,
    compatibility: {
      minimum: '13',
      verified: '13',
      maximum: ''
    }
  }
};

console.log(`🚀 Publishing version ${version} to Foundry VTT...`);
console.log('Release data:', JSON.stringify(releaseData, null, 2));

fetch('https://foundryvtt.com/_api/packages/release_version/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': token
  },
  body: JSON.stringify(releaseData)
})
.then(response => {
  console.log('Response status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response data:', JSON.stringify(data, null, 2));
  if (data.status === 'success') {
    console.log('✅ Successfully published to Foundry VTT!');
    console.log(`📋 Check your package: https://foundryvtt.com/packages/daggerheart-plus/`);
  } else {
    console.error('❌ Failed to publish:', data);
  }
})
.catch(error => {
  console.error('❌ Error:', error);
});
