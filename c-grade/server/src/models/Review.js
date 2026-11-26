import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true, maxlength: 300 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 0.5,
      max: 5.0,
      validate: {
        validator: (val) => Math.round(val * 2) === val * 2,
        message: 'Rating must be in 0.5 increments between 0.5 and 5.0.',
      },
    },
    title: {
      type: String,
      default: '',
      trim: true,
      maxlength: 140,
    },
    body: {
      type: String,
      required: [true, 'Review body is required'],
      trim: true,
      maxlength: 5000,
    },
    tags: {
      type: [String],
      default: [],
    },
    containsSpoilers: {
      type: Boolean,
      default: false,
    },
    watchedDate: {
      type: Date,
      default: Date.now,
    },
    isRewatch: {
      type: Boolean,
      default: false,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reports: {
      type: [reportSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'flagged', 'removed'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ movie: 1, author: 1 }, { unique: true });

export const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
