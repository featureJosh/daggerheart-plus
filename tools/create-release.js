#!/usr/bin/env node

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const PACKAGE_ENTRIES = [
  'module.json',
  'README.md',
  'LICENSE',
  'assets',
  'lang',
  'languages',
  'packs',
  'scripts',
  'styles',
  'templates'
];

function parseOptions(argv) {
  const options = {
    clean: true,
    dryRun: false,
    zip: true,
    publishFoundry: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--no-clean') {
      options.clean = false;
    } else if (arg === '--no-zip') {
      options.zip = false;
    } else if (arg === '--publish-foundry') {
      options.publishFoundry = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = argv[++index];
    } else if (arg.startsWith('--version=')) {
      options.version = arg.slice('--version='.length);
    } else if (arg === '--repo') {
      options.repo = argv[++index];
    } else if (arg.startsWith('--repo=')) {
      options.repo = arg.slice('--repo='.length);
    } else if (arg === '--tag') {
      options.tag = argv[++index];
    } else if (arg.startsWith('--tag=')) {
      options.tag = arg.slice('--tag='.length);
    } else if (arg === '--manifest') {
      options.manifest = argv[++index];
    } else if (arg.startsWith('--manifest=')) {
      options.manifest = arg.slice('--manifest='.length);
    } else if (arg === '--download') {
      options.download = argv[++index];
    } else if (arg.startsWith('--download=')) {
      options.download = arg.slice('--download='.length);
    } else if (arg === '--url') {
      options.url = argv[++index];
    } else if (arg.startsWith('--url=')) {
      options.url = arg.slice('--url='.length);
    } else if (!arg.startsWith('-') && !options.version) {
      options.version = arg;
    }
  }

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeRepositoryUrl(value) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const sshMatch = /^git@github\.com:(.+?)(?:\.git)?$/i.exec(trimmed);

  if (sshMatch) {
    return `https://github.com/${sshMatch[1]}`;
  }

  if (/^[^/\s]+\/[^/\s]+$/.test(trimmed)) {
    return `https://github.com/${trimmed.replace(/\.git$/i, '')}`;
  }

  return trimmed.replace(/\.git$/i, '');
}

function readGitOrigin(rootDir) {
  const result = childProcess.spawnSync(
    'git',
    ['config', '--get', 'remote.origin.url'],
    { cwd: rootDir, encoding: 'utf8' }
  );

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
}

function resolveRepositoryUrl(rootDir, packageData, options) {
  return normalizeRepositoryUrl(
    options.repo ||
      (process.env.GITHUB_REPOSITORY && `https://github.com/${process.env.GITHUB_REPOSITORY}`) ||
      readGitOrigin(rootDir) ||
      (packageData.repository && packageData.repository.url)
  );
}

function resolveReleaseMetadata(rootDir, options = {}) {
  const packageData = readJson(path.join(rootDir, 'package.json'));
  const rawVersion = String(options.version || process.env.VERSION || packageData.version || '').trim();

  if (!rawVersion) {
    throw new Error('Release version is missing. Pass a version or set package.json version.');
  }

  const version = rawVersion.replace(/^v/i, '');
  const tagName = options.tag || (rawVersion.startsWith('v') ? rawVersion : `v${version}`);
  const projectUrl = normalizeRepositoryUrl(options.url) || resolveRepositoryUrl(rootDir, packageData, options);

  if (!projectUrl) {
    throw new Error('Repository URL is missing. Pass --repo owner/name or set remote origin.');
  }

  const manifestUrl = options.manifest || `${projectUrl}/releases/latest/download/module.json`;
  const downloadUrl = options.download || `${projectUrl}/releases/download/${tagName}/module.zip`;
  const notesUrl = `${projectUrl}/releases/tag/${tagName}`;

  return {
    downloadUrl,
    manifestUrl,
    notesUrl,
    packageData,
    projectUrl,
    tagName,
    version
  };
}

function replaceManifestTokens(source, metadata) {
  return source
    .replace(/#\{VERSION\}#/g, metadata.version)
    .replace(/#\{URL\}#/g, metadata.projectUrl)
    .replace(/#\{MANIFEST\}#/g, metadata.manifestUrl)
    .replace(/#\{DOWNLOAD\}#/g, metadata.downloadUrl);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyPackageEntry(rootDir, packageDir, entry) {
  if (entry === 'module.json') {
    return false;
  }

  const source = path.join(rootDir, entry);

  if (!fs.existsSync(source)) {
    return false;
  }

  const target = path.join(packageDir, entry);
  fs.cpSync(source, target, { recursive: true });
  return true;
}

function powershellQuote(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function createZipWithPowershell(sourceDir, zipPath) {
  const sourceGlob = path.join(sourceDir, '*');
  const command = `Compress-Archive -Path ${powershellQuote(sourceGlob)} -DestinationPath ${powershellQuote(zipPath)} -Force`;
  return childProcess.spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command],
    { encoding: 'utf8' }
  );
}

function createZipWithTar(sourceDir, zipPath, entries) {
  return childProcess.spawnSync(
    'tar',
    ['-a', '-cf', zipPath, '-C', sourceDir, ...entries],
    { encoding: 'utf8' }
  );
}

function createZipWithZip(sourceDir, zipPath, entries) {
  return childProcess.spawnSync(
    'zip',
    ['-qr', zipPath, ...entries],
    { cwd: sourceDir, encoding: 'utf8' }
  );
}

function createZip(sourceDir, zipPath, entries) {
  let result;

  if (process.platform === 'win32') {
    result = createZipWithTar(sourceDir, zipPath, entries);

    if (result.status === 0) {
      return;
    }

    result = createZipWithPowershell(sourceDir, zipPath);
  } else {
    result = createZipWithZip(sourceDir, zipPath, entries);
  }

  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || (result.error && result.error.message) || 'unknown error';
    throw new Error(`Could not create module.zip: ${detail.trim()}`);
  }
}

function createReleasePackage(options = {}) {
  const rootDir = path.resolve(__dirname, '..');
  const metadata = resolveReleaseMetadata(rootDir, options);
  const distDir = path.join(rootDir, 'dist');
  const packageDir = path.join(distDir, 'package');
  const zipPath = path.join(distDir, 'module.zip');
  const distManifestPath = path.join(distDir, 'module.json');
  const packageManifestPath = path.join(packageDir, 'module.json');
  const manifestTemplate = fs.readFileSync(path.join(rootDir, 'module.json'), 'utf8');
  const manifest = replaceManifestTokens(manifestTemplate, metadata);
  const parsedManifest = JSON.parse(manifest);
  const includedEntries = PACKAGE_ENTRIES.filter((entry) => entry === 'module.json' || fs.existsSync(path.join(rootDir, entry)));

  if (options.dryRun) {
    console.log(`Dry run for ${metadata.tagName}`);
    console.log(`Version: ${metadata.version}`);
    console.log(`Project URL: ${metadata.projectUrl}`);
    console.log(`Manifest URL: ${metadata.manifestUrl}`);
    console.log(`Download URL: ${metadata.downloadUrl}`);
    console.log(`Package entries: ${includedEntries.join(', ')}`);
    return {
      distDir,
      manifest: parsedManifest,
      metadata,
      packageDir,
      zipPath
    };
  }

  if (options.clean !== false) {
    fs.rmSync(packageDir, { recursive: true, force: true });
    fs.rmSync(zipPath, { force: true });
  }

  ensureDir(packageDir);
  fs.writeFileSync(packageManifestPath, manifest);
  ensureDir(distDir);
  fs.writeFileSync(distManifestPath, manifest);

  for (const entry of PACKAGE_ENTRIES) {
    copyPackageEntry(rootDir, packageDir, entry);
  }

  if (options.zip !== false) {
    createZip(packageDir, zipPath, includedEntries);
  }

  console.log(`Built ${path.relative(rootDir, distManifestPath)}`);

  if (options.zip !== false) {
    console.log(`Built ${path.relative(rootDir, zipPath)}`);
  }

  return {
    distDir,
    manifest: parsedManifest,
    metadata,
    packageDir,
    zipPath
  };
}

if (require.main === module) {
  try {
    createReleasePackage(parseOptions(process.argv.slice(2)));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  createReleasePackage,
  parseOptions,
  resolveReleaseMetadata
};
