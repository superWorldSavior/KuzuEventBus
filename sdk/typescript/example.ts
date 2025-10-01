/**
 * Example: How to use the Kuzu SDK in your TypeScript project
 */
import { createKuzuClient } from './src';

async function example() {
  // 1. Create client
  const client = createKuzuClient({
    baseUrl: 'http://localhost:8200',
    apiKey: 'kb_YOUR_API_KEY_HERE' // Get this from /api/v1/auth/register
  });

  try {
    // 2. List existing databases
    console.log('📋 Listing databases...');
    const databases = await client.listDatabases();
    console.log('Databases:', databases);

    // 3. Create a new database
    console.log('\n🗄️  Creating database...');
    const db = await client.createDatabase('example-graph');
    console.log('Created:', db);

    // 4. Execute a query (with automatic polling)
    console.log('\n🔍 Executing query...');
    const result = await client.executeQuery(
      db.id,
      'MATCH (n) RETURN n LIMIT 5',
      { timeout: 10000 }
    );
    console.log('Results:', result);

    // 5. Create a snapshot
    console.log('\n📸 Creating snapshot...');
    const snapshot = await client.createSnapshot(db.id);
    console.log('Snapshot:', snapshot);

    // 6. Clean up (optional)
    console.log('\n🧹 Cleaning up...');
    await client.deleteDatabase(db.id);
    console.log('Database deleted');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  example();
}

export { example };
