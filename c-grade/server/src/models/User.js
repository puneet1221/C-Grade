import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: 80,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[a-z0-9_]{3,24}$/, 'Username must be 3-24 lowercase alphanumeric or underscore characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    avatarUrl: {
      type: String,
      default: '',
      trim: true,
    },
    bio: {
      type: String,
      default: '',
      maxlength: 300,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'critic', 'admin'],
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: true,
    },
    favoriteMovies: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
      validate: {
        validator: (arr) => !arr || arr.length <= 4,
        message: 'You can select up to 4 favorite films.',
      },
      default: [],
    },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    refreshTokenHash: {
      type: String,
      select: false,
      default: null,
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
      default: null,
    },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
