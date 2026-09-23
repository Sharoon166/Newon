import mongoose from 'mongoose';

// Single-document model that records when physical ("In shop") stock tracking
// was switched on. Before this point every purchase was auto-received and every
// invoice was auto-delivered; "In shop" started equal to "Available".
//
// The start date can be re-declared. Each successful set closes the previous
// "epoch" (its opening movements are removed) and opens a new one, so
// `currentEpoch` identifies which baseline is live. `status` doubles as a lock
// so two admins cannot run a re-set concurrently.
const stockTrackingSchema = new mongoose.Schema(
  {
    initialized: { type: Boolean, required: true, default: false },
    startedAt: { type: Date, required: true, default: Date.now },
    currentEpoch: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['idle', 'reinitializing'], default: 'idle' },
    initializedBy: { type: String },
    initializedByName: { type: String },
    // Audit log of every start date that has been set, oldest first.
    history: [
      {
        _id: false,
        epoch: { type: Number, required: true },
        date: { type: Date, required: true },
        changedAt: { type: Date, required: true },
        changedBy: { type: String },
        changedByName: { type: String }
      }
    ]
  },
  { timestamps: true }
);

const StockTracking = mongoose.models.StockTracking || mongoose.model('StockTracking', stockTrackingSchema);

export default StockTracking;