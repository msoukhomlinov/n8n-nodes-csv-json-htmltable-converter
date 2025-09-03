const { src, dest, series, parallel, watch } = require('gulp');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Clean the build directory
 */
function clean(cb) {
  // Only remove contents, not the directory itself
  if (fs.existsSync('dist')) {
    const distPath = path.resolve('dist');

    // Don't delete node_modules if it exists
    const entries = fs.readdirSync(distPath);
    for (const entry of entries) {
      if (entry === 'node_modules') continue;

      const entryPath = path.join(distPath, entry);
      if (fs.lstatSync(entryPath).isDirectory()) {
        fs.rmSync(entryPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(entryPath);
      }
    }
  }

  cb();
}

/**
 * Ensure the destination directories exist
 */
function createDirs(cb) {
  const dirs = [
    path.resolve('dist'),
    path.resolve('dist', 'nodes'),
    path.resolve('dist', 'nodes', 'CsvJsonHtmltableConverter')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  cb();
}

/**
 * Copy over icons to the build directory
 */
function buildIcons() {
  // This preserves the directory structure under src/nodes
  return src('src/nodes/**/*.svg', { base: 'src/nodes' })
    .pipe(dest('dist/nodes'));
}

/**
 * Watch for changes in icon files
 */
function watchIcons() {
  return watch('src/nodes/**/*.svg', buildIcons);
}

// Define the tasks
const build = series(createDirs, buildIcons);
const watchFiles = parallel(watchIcons);

// Export the tasks
exports.clean = clean;
exports['build:icons'] = build;
exports.watch = watchFiles;
exports.default = build;
