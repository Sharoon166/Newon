import mongoose from 'mongoose';

// Global counter schema for all entities
const counterSchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true 
  },
  sequence: { 
    type: Number, 
    default: 0 
  }
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/**
 * Get next sequence number for a given counter key
 * @param key - Unique identifier for the counter (e.g., "purchase-2025", "customer-2025")
 * @returns The next sequence number
 */
export async function getNextSequence(key: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  
  if (!counter) {
    throw new Error(`Failed to generate sequence for key: ${key}`);
  }
  
  return counter.sequence;
}

/**
 * Generate a formatted ID with prefix and year
 * @param prefix - ID prefix (e.g., "PR" for Purchase, "CU" for Customer)
 * @param year - Full year (e.g., 2025)
 * @returns Formatted ID (e.g., "PR-25-001")
 */
export async function generateId(prefix: string, year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const yearSuffix = currentYear.toString().slice(-2);
  const key = `${prefix.toLowerCase()}-${currentYear}`;
  
  const sequence = await getNextSequence(key);
  const sequenceStr = sequence.toString().padStart(3, '0');
  
  return `${prefix}-${yearSuffix}-${sequenceStr}`;
}

export default Counter;
