const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User_Profile',
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
  }
}, {
  timestamps: true
});

const Reservation = mongoose.model('Reservation', reservationSchema);
module.exports = Reservation;
