const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserProfile',
    required: true
  },
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
  },
  // Additional fields for enhanced functionality
  end_time: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'completed'],
    default: 'active'
  },
  purpose: {
    type: String,
    maxlength: 200,
    default: ''
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'reservations'
});

// Indexes for better performance
reservationSchema.index({ user_id: 1 });
reservationSchema.index({ laboratory: 1, reservation_date: 1, time_slot: 1 });
reservationSchema.index({ laboratory: 1, reservation_date: 1, seat_number: 1 });
reservationSchema.index({ status: 1 });

// Virtual for checking if reservation is in the past
reservationSchema.virtual('isPast').get(function() {
  const now = new Date();
  const reservationDateTime = new Date(this.reservation_date);
  reservationDateTime.setHours(parseInt(this.time_slot.split(':')[0]));
  reservationDateTime.setMinutes(parseInt(this.time_slot.split(':')[1]));
  return reservationDateTime < now;
});

// Virtual for checking if reservation is within 10 minutes of start time
reservationSchema.virtual('isWithin10Minutes').get(function() {
  const now = new Date();
  const reservationDateTime = new Date(this.reservation_date);
  reservationDateTime.setHours(parseInt(this.time_slot.split(':')[0]));
  reservationDateTime.setMinutes(parseInt(this.time_slot.split(':')[1]));
  
  const diffInMinutes = (reservationDateTime - now) / (1000 * 60);
  return diffInMinutes >= -10 && diffInMinutes <= 10;
});

const Reservation = mongoose.model('Reservation', reservationSchema);
module.exports = { Reservation, reservationSchema };
