const mongoose = require('mongoose');

const reservationSlotSchema = new mongoose.Schema({
  laboratory: {
    type: String,
    enum: ['G301', 'G302', 'G303', 'G304', 'G305'],
    required: true
  },
  date: {
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
  is_available: {
    type: Boolean,
    default: true
  },
  reserved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserProfile',
    default: null
  },
  reservation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    default: null
  },
  is_blocked: {
    type: Boolean,
    default: false
  },
  blocked_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserProfile',
    default: null
  },
  block_reason: {
    type: String,
    maxlength: 200,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'reservation_slots'
});

// Indexes for better performance
reservationSlotSchema.index({ laboratory: 1, date: 1, time_slot: 1 });
reservationSlotSchema.index({ laboratory: 1, date: 1, seat_number: 1 });
reservationSlotSchema.index({ is_available: 1 });
reservationSlotSchema.index({ reserved_by: 1 });

// Virtual for checking if slot is in the past
reservationSlotSchema.virtual('isPast').get(function() {
  const now = new Date();
  const slotDateTime = new Date(this.date);
  slotDateTime.setHours(parseInt(this.time_slot.split(':')[0]));
  slotDateTime.setMinutes(parseInt(this.time_slot.split(':')[1]));
  return slotDateTime < now;
});

// Method to check if slot can be reserved
reservationSlotSchema.methods.canBeReserved = function() {
  return this.is_available && !this.is_blocked && !this.isPast;
};

// Method to reserve slot
reservationSlotSchema.methods.reserve = function(userId, reservationId) {
  this.is_available = false;
  this.reserved_by = userId;
  this.reservation_id = reservationId;
  return this.save();
};

// Method to release slot
reservationSlotSchema.methods.release = function() {
  this.is_available = true;
  this.reserved_by = null;
  this.reservation_id = null;
  return this.save();
};

// Method to block slot
reservationSlotSchema.methods.block = function(technicianId, reason) {
  this.is_blocked = true;
  this.blocked_by = technicianId;
  this.block_reason = reason;
  return this.save();
};

// Method to unblock slot
reservationSlotSchema.methods.unblock = function() {
  this.is_blocked = false;
  this.blocked_by = null;
  this.block_reason = '';
  return this.save();
};

const ReservationSlot = mongoose.model('ReservationSlot', reservationSlotSchema);
module.exports = { ReservationSlot, reservationSlotSchema }; 