/**
 * Complete Kuzu Event Bus SDK Workflow Example
 * 
 * Demonstrates all major features:
 * - Database management (with names!)
 * - Query execution
 * - Branches (Git-like testing)
 * - Time Travel (PITR)
 * - Snapshots
 */

import { createKuzuClient } from '../src';

async function completeWorkflow() {
  const client = createKuzuClient({
    baseUrl: process.env.KUZU_API_URL || 'http://localhost:8200',
    apiKey: process.env.KUZU_API_KEY || 'kb_YOUR_API_KEY_HERE'
  });

  console.log('🚀 Complete Kuzu Event Bus Workflow\n');

  // ==================== 1. Database Management ====================
  console.log('📁 1. Creating production database...');
  const prodDb = await client.createDatabase('prod-social-network');
  console.log(`✓ Created: ${prodDb.name} (${prodDb.id})`);

  // Populate with data
  console.log('\n📝 2. Populating database...');
  await client.executeQuery(prodDb.name, `
    CREATE (:User {name: 'Alice', age: 30});
    CREATE (:User {name: 'Bob', age: 25});
    CREATE (:User {name: 'Charlie', age: 35});
  `);
  console.log('✓ Data inserted');

  // ==================== 2. Branches (Test Migration) ====================
  console.log('\n🌿 3. Creating branch for testing migration...');
  const testBranch = await client.branches.create({
    sourceDatabase: prodDb.name,  // Can use name or UUID!
    branchName: 'test-migration-v2',
    fromSnapshot: 'latest'
  });
  console.log(`✓ Branch created: ${testBranch.fullName}`);

  // Test migration on branch (safe, doesn't affect prod)
  console.log('\n🧪 4. Testing migration on branch...');
  await client.executeQuery(testBranch.fullName, `
    MATCH (u:User) SET u.status = 'active';
  `);
  console.log('✓ Migration tested on branch');

  // Verify
  const branchResult = await client.executeQuery(
    testBranch.fullName,
    'MATCH (u:User) RETURN count(u) as total, collect(u.status) as statuses'
  );
  console.log('Branch state:', branchResult.results);

  // ==================== 3. Merge or Discard ====================
  console.log('\n🔀 5. Decision: Merge or discard?');
  
  // Option A: Merge to prod (if tests pass)
  console.log('Merging branch to prod...');
  await client.branches.merge(testBranch.fullName, {
    targetDatabase: prodDb.name
  });
  console.log('✓ Branch merged to prod');

  // Clean up branch
  await client.branches.delete(testBranch.fullName);
  console.log('✓ Branch deleted');

  // ==================== 4. Time Travel (PITR) ====================
  console.log('\n⏰ 6. Time Travel - View history...');
  const history = await client.timeTravel.viewHistory(prodDb.name, {
    from: '1 hour ago',
    includeQueries: true
  });
  console.log(`✓ Found ${history.events.length} events in history`);

  // Preview past state (non-destructive)
  console.log('\n👁️ 7. Previewing past state...');
  const preview = await client.timeTravel.preview(prodDb.name, {
    at: '10 minutes ago',
    query: 'MATCH (u:User) RETURN count(u)'
  });
  console.log('State 10 minutes ago:', preview.queryResult);

  // ==================== 5. Snapshots ====================
  console.log('\n📸 8. Creating manual snapshot...');
  const snapshot = await client.createSnapshot(prodDb.name);
  console.log(`✓ Snapshot created: ${snapshot.id}`);

  const snapshots = await client.listSnapshots(prodDb.name);
  console.log(`✓ Total snapshots: ${snapshots.length}`);

  // ==================== 6. Query Execution ====================
  console.log('\n🔍 9. Querying data...');
  const queryResult = await client.executeQuery(
    prodDb.name,
    'MATCH (u:User) WHERE u.age > $minAge RETURN u.name, u.age ORDER BY u.age',
    { parameters: { minAge: 25 } }
  );
  console.log('Query results:', queryResult.results);

  // ==================== 7. List Databases ====================
  console.log('\n📋 10. Listing all databases...');
  const databases = await client.listDatabases();
  console.log(`✓ Found ${databases.length} databases:`);
  databases.forEach(db => console.log(`  - ${db.name}`));

  console.log('\n✅ Complete workflow finished!');
}

// Run if executed directly
if (require.main === module) {
  completeWorkflow()
    .then(() => {
      console.log('\n🎉 Success!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
}

export { completeWorkflow };
