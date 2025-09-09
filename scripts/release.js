#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const version = args[0];
const dryRun = args.includes('--dry-run');

if (!version) {
  console.error('Usage: node scripts/release.js <version> [--dry-run]');
  process.exit(1);
}

const modulePath = path.join(__dirname, '..', 'module.json');
const moduleData = JSON.parse(fs.readFileSync(modulePath, 'utf8'));

moduleData.version = version;

fs.writeFileSync(modulePath, JSON.stringify(moduleData, null, 2));

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

if (dryRun) {
  releaseData['dry-run'] = true;
}

const token = process.env.FOUNDRY_RELEASE_TOKEN || 'fvttp_W*#fv257N@VQj*AKSGtZU$lU';

fetch('https://foundryvtt.com/_api/packages/release_version/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': token
  },
  body: JSON.stringify(releaseData)
})
.then(response => response.json())
.then(data => {
  console.log('Response:', JSON.stringify(data, null, 2));
  if (data.status === 'success') {
    console.log('✅ Release successful!');
    if (dryRun) {
      console.log('🔍 This was a dry run - no changes were saved');
    }
  } else {
    console.error('❌ Release failed:', data);
    process.exit(1);
  }
})
.catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
