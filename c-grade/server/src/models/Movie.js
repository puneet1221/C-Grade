import mongoose from 'mongoose';

const castMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    character: { type: String, default: '', trim: true },
    profileUrl: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const movieSchema = new mongoose.Schema(
  {
    tmdbId: {
      type: Number,
      unique: true,
      sparse: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Movie title is required'],
      trim: true,
    },
    tagline: {
      type: String,
      default: '',
      trim: true,
    },
    overview: {
      type: String,
      required: [true, 'Movie overview is required'],
      trim: true,
    },
    posterUrl: {
      type: String,
      default: '',
      trim: true,
    },
    backdropUrl: {
      type: String,
      default: '',
      trim: true,
    },
    trailerUrl: {
      type: String,
      default: '',
      trim: true,
    },
    releaseDate: {
      type: Date,
      default: null,
      index: true,
    },
    releaseStatus: {
      type: String,
      default: 'Released',
      trim: true,
    },
    runtime: {
      type: Number,
      default: 120,
      min: 1,
    },
    genres: {
      type: [String],
      default: [],
      index: true,
    },
    language: {
      type: String,
      default: 'English',
      trim: true,
      index: true,
    },
    industry: {
      type: String,
      enum: ['Hollywood', 'Bollywood', 'Tamil', 'Telugu', 'Malayalam', 'Korean', 'Japanese', 'World Cinema'],
      default: 'Hollywood',
      index: true,
    },
    cast: {
      type: [castMemberSchema],
      default: [],
    },
    director: {
      type: String,
      default: 'Unknown',
      trim: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true,
    },
    ratingsCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    ratingDistribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 },
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

movieSchema.index({ title: 'text', director: 'text', 'cast.name': 'text', overview: 'text' });

export const Movie = mongoose.models.Movie || mongoose.model('Movie', movieSchema);
