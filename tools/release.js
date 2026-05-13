#!/usr/bin/env node

const { createReleasePackage, parseOptions } = require('./create-release');

function buildFoundryPayload(result, dryRun) {
  const compatibility = result.manifest.compatibility || {};

  return {
    id: result.manifest.id,
    release: {
      version: result.metadata.version,
      manifest: result.metadata.manifestUrl,
      notes: result.metadata.notesUrl,
      compatibility: {
        minimum: compatibility.minimum || '',
        verified: compatibility.verified || '',
        maximum: compatibility.maximum || ''
      }
    },
    ...(dryRun ? { 'dry-run': true } : {})
  };
}

async function publishFoundryRelease(payload, token) {
  const response = await fetch('https://foundryvtt.com/_api/packages/release_version/', {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const body = await response.text();
  let data;

  try {
    data = JSON.parse(body);
  } catch {
    data = body;
  }

  if (!response.ok || (data && data.status && data.status !== 'success')) {
    throw new Error(`Foundry release failed: ${JSON.stringify(data, null, 2)}`);
  }

  console.log(`Foundry release response: ${JSON.stringify(data, null, 2)}`);
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const result = createReleasePackage(options);
  const payload = buildFoundryPayload(result, options.dryRun);
  const token = process.env.FOUNDRY_RELEASE_TOKEN;

  if (options.dryRun) {
    console.log(`Foundry dry-run payload: ${JSON.stringify(payload, null, 2)}`);
    return;
  }

  if (!token) {
    if (options.publishFoundry) {
      throw new Error('FOUNDRY_RELEASE_TOKEN is required when --publish-foundry is used.');
    }

    console.log('FOUNDRY_RELEASE_TOKEN is not set; skipped Foundry publish.');
    return;
  }

  await publishFoundryRelease(payload, token);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
