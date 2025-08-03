const mongoose = require('mongoose');

// User Profile Schema for user_profiles collection
const userProfileSchema = new mongoose.Schema({
  name: {
    first: {
      type: String,
      required: true,
      trim: true
    },
    last: {
      type: String,
      required: true,
      trim: true
    }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function (email) {
        return /^[a-z]+_[a-z]+@dlsu\.edu\.ph$/.test(email);
      },
      message: 'Invalid DLSU email format (e.g., juan_dela@dlsu.edu.ph)'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  user_type: {
    type: String,
    enum: ['student', 'technician'],
    default: 'student'
  },
  university: {
    type: String,
    default: 'De La Salle University'
  },
  profile_description: {
    type: String,
    maxlength: 300,
    trim: true,
    default: ''
  },
  // Andre Marker
  profile_picture: {
    data: Buffer, 
    contentType: String
  },
  current_reservations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  }],
  remember_me_expiry: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'user_profiles'
});

// Indexes for better performance
userProfileSchema.index({ email: 1 });
userProfileSchema.index({ user_type: 1 });
userProfileSchema.index({ 'current_reservations': 1 });

// Virtual for full name
userProfileSchema.virtual('fullName').get(function() {
  return `${this.name.first} ${this.name.last}`;
});

// Method to check if user can make reservations
userProfileSchema.methods.canReserve = function() {
  return this.user_type === 'student';
};

// Method to check if user is technician
userProfileSchema.methods.isTechnician = function() {
  return this.user_type === 'technician';
};

// Model
const UserProfile = mongoose.model('UserProfile', userProfileSchema);
module.exports = { UserProfile };
