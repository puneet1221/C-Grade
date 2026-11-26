import mongoose from 'mongoose';

const diaryItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['watchlist', 'watched'],
      required: true,
    },
    watchedAt: {
      type: Date,
      default: null,
    },
    rewatchCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

diaryItemSchema.index({ user: 1, movie: 1 }, { unique: true });

export const DiaryItem = mongoose.models.DiaryItem || mongoose.model('DiaryItem', diaryItemSchema);
