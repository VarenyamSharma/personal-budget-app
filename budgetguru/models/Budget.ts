import mongoose from 'mongoose';

const BudgetSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  spent: {
    type: Number,
    default: 0
  },
  remaining: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.models.Budget || mongoose.model('Budget', BudgetSchema);