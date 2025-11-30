const fs = require('fs');
const path = require('path');

function fixDist() {
  const distPath = path.join(__dirname, '..', 'dist');
  const cloudApiPath = path.join(distPath, 'cloud-api', 'src');
  
  if (fs.existsSync(cloudApiPath)) {
    const { execSync } = require('child_process');
    execSync('mv dist/cloud-api/src/* dist/ && rm -rf dist/cloud-api dist/shared', { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit' 
    });
    console.log('✓ Fixed dist structure');
  }
}

fixDist();