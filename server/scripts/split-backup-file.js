const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Split a large SQL backup file into smaller chunks
 */
async function splitBackupFile() {
  console.log('\n✂️  SQL Backup File Splitter\n');
  console.log('This tool splits large SQL backup files into smaller chunks');
  console.log('that can be imported via Supabase SQL Editor.\n');

  try {
    // Find backup files
    const backupsDir = path.join(__dirname, '..', '..', 'backups');
    const backupFiles = fs.existsSync(backupsDir) 
      ? fs.readdirSync(backupsDir)
          .filter(f => f.endsWith('.sql') && fs.statSync(path.join(backupsDir, f)).size > 0)
          .map(f => ({ name: f, path: path.join(backupsDir, f), size: fs.statSync(path.join(backupsDir, f)).size }))
          .sort((a, b) => b.size - a.size)
      : [];

    if (backupFiles.length === 0) {
      throw new Error('No backup files found in backups/ directory');
    }

    console.log('📁 Available backup files:');
    backupFiles.forEach((file, index) => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const lineCount = fs.readFileSync(file.path, 'utf8').split('\n').length;
      console.log(`   ${index + 1}. ${file.name} (${sizeMB} MB, ~${lineCount.toLocaleString()} lines)`);
    });
    console.log();

    // Select backup file
    let selectedFile;
    if (backupFiles.length === 1) {
      selectedFile = backupFiles[0].path;
      console.log(`✅ Using: ${backupFiles[0].name}\n`);
    } else {
      const choice = await question(`Select backup file (1-${backupFiles.length}): `);
      const index = parseInt(choice) - 1;
      if (index < 0 || index >= backupFiles.length) {
        throw new Error('Invalid selection');
      }
      selectedFile = backupFiles[index].path;
      console.log(`✅ Selected: ${backupFiles[index].name}\n`);
    }

    // Get chunk size
    console.log('💡 Recommended chunk sizes:');
    console.log('   - 2,000 lines: Very safe, slower import');
    console.log('   - 5,000 lines: Good balance (recommended)');
    console.log('   - 10,000 lines: Faster, but may hit limits\n');
    
    const chunkSizeInput = await question('Enter chunk size in lines (default: 5000): ');
    const chunkSize = parseInt(chunkSizeInput) || 5000;

    if (chunkSize < 100 || chunkSize > 50000) {
      throw new Error('Chunk size should be between 100 and 50,000 lines');
    }

    // Read the backup file
    console.log('\n📖 Reading backup file...');
    const backupContent = fs.readFileSync(selectedFile, 'utf8');
    const lines = backupContent.split('\n');
    const totalLines = lines.length;
    
    console.log(`📊 Total lines: ${totalLines.toLocaleString()}`);
    console.log(`📦 Chunk size: ${chunkSize.toLocaleString()} lines`);
    
    const numChunks = Math.ceil(totalLines / chunkSize);
    console.log(`📋 Will create: ${numChunks} chunks\n`);

    // Confirm
    const confirm = await question(`Create ${numChunks} chunk files? (yes/no): `);
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Cancelled.');
      return;
    }

    // Create chunks directory
    const chunksDir = path.join(backupsDir, 'chunks');
    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir, { recursive: true });
    }

    // Split into chunks
    console.log('\n✂️  Splitting file...\n');
    
    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, totalLines);
      const chunk = lines.slice(start, end);
      
      const chunkFileName = `chunk-${String(i + 1).padStart(3, '0')}.sql`;
      const chunkPath = path.join(chunksDir, chunkFileName);
      
      // Add header comment to each chunk
      const chunkContent = `-- Chunk ${i + 1} of ${numChunks}
-- Lines ${start + 1} to ${end} of ${totalLines}
-- Source: ${path.basename(selectedFile)}

${chunk.join('\n')}
`;

      fs.writeFileSync(chunkPath, chunkContent, 'utf8');
      
      const chunkSizeKB = (fs.statSync(chunkPath).size / 1024).toFixed(2);
      console.log(`  ✓ Created ${chunkFileName} (${chunk.length.toLocaleString()} lines, ${chunkSizeKB} KB)`);
    }

    console.log(`\n✅ Successfully created ${numChunks} chunks!`);
    console.log(`📁 Location: ${chunksDir}\n`);
    
    console.log('📋 Next Steps:');
    console.log('   1. Go to Supabase Dashboard → Your New Project');
    console.log('   2. Click SQL Editor → New Query');
    console.log('   3. Import chunks in order (chunk-001.sql, chunk-002.sql, etc.)');
    console.log('   4. Copy and paste each chunk into SQL Editor');
    console.log('   5. Click Run and wait for completion');
    console.log('   6. Repeat for all chunks\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  splitBackupFile()
    .then(() => {
      console.log('🎉 File splitting completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 File splitting failed:', error);
      process.exit(1);
    });
}

module.exports = { splitBackupFile };











