const mongoose = require('mongoose');

// Reservation Schema
const reservationSchema = new mongoose.Schema({
  laboratory: {
    type: String,
    enum: ['G301', 'G302', 'G303', 'G304', 'G305'],
    required: true
  },
  reservation_date: {
    type: Date,
    required: true
  },
  time_slot: {
    type: String,
    required: true
  },
  seat_number: {
    type: Number,
    min: 1,
    max: 35,
    required: true
  },
  is_anonymous: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// User Profile Schema
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
    enum: ['student', 'faculty', 'technician'],
    default: 'student'
  },
  university: {
    type: String,
    default: 'De La Salle University'
  },
  profile_description: {
    type: String,
    maxlength: 300,
    trim: true
  },
  profile_picture: {
    type: String,
    default: null
  },
  current_reservations: [reservationSchema]
}, {
  timestamps: true
});

// Model
const UserProfile = mongoose.model('User_Profile', userProfileSchema);
module.exports = { UserProfile, reservationSchema };
