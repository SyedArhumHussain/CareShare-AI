/**
 * Direct Database Cleanup Script
 * Cleans all data from the Care Share MongoDB database
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, 'fypBackend-main', '.env') });

async function cleanupDatabase() {
  try {
    console.log('🧹 Direct Database Cleanup');
    console.log('==========================');
    
    // Connect to database with the connection string
    console.log('🔍 Connecting to MongoDB...');
    if (!process.env.mongo_URL) throw new Error('mongo_URL is not set in fypBackend-main/.env');
    await mongoose.connect(process.env.mongo_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB successfully');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('ℹ️  Database is already empty');
      await mongoose.disconnect();
      return;
    }
    
    console.log('🗂️  Found collections:', collections.map(c => c.name).join(', '));
    
    // Show current data count
    console.log('\n📊 Current data count:');
    let totalDocuments = 0;
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`   ${collection.name}: ${count} documents`);
      totalDocuments += count;
    }
    
    console.log(`   Total: ${totalDocuments} documents`);
    
    if (totalDocuments === 0) {
      console.log('ℹ️  All collections are already empty');
      await mongoose.disconnect();
      return;
    }
    
    // Clean all collections
    console.log('\n🗑️  Cleaning all collections...');
    
    let totalDeleted = 0;
    for (const collection of collections) {
      try {
        const deleteResult = await mongoose.connection.db.collection(collection.name).deleteMany({});
        console.log(`   ✅ ${collection.name}: ${deleteResult.deletedCount} documents deleted`);
        totalDeleted += deleteResult.deletedCount;
      } catch (error) {
        console.log(`   ❌ Error cleaning ${collection.name}:`, error.message);
      }
    }
    
    console.log('');
    console.log(`🎉 Cleanup completed! Total documents deleted: ${totalDeleted}`);
    
    // Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    const remainingCollections = await mongoose.connection.db.listCollections().toArray();
    let hasData = false;
    
    for (const collection of remainingCollections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      if (count > 0) {
        console.log(`   ⚠️  ${collection.name} still has ${count} documents`);
        hasData = true;
      } else {
        console.log(`   ✅ ${collection.name} is empty`);
      }
    }
    
    if (!hasData) {
      console.log('\n✅ SUCCESS: All collections are now empty!');
      console.log('🎉 Your database has been completely cleaned.');
    } else {
      console.log('\n⚠️  Some data may still remain in the database.');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    if (error.message.includes('authentication')) {
      console.log('💡 This might be an authentication issue with MongoDB Atlas.');
      console.log('   Please check your database credentials and IP whitelist.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
    console.log('🏁 Cleanup process finished');
  }
}

// Run the cleanup
cleanupDatabase(); 