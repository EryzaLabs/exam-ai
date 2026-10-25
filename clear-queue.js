// Quick script to clear the generation queue for stuck tests
// Run with: node clear-queue.js

const generationQueue = new Map();

// Clear specific test ID
const testId = '6808e78fa2deb51acb438b03';
if (generationQueue.has(testId)) {
  generationQueue.delete(testId);
  console.log(`✅ Cleared queue entry for ${testId}`);
} else {
  console.log(`⚠️ No queue entry found for ${testId}`);
}

console.log('\n📋 Remaining queue entries:', generationQueue.size);
