const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User_Profile', 
        required: true
    },

    email: {
        type: String, 
        required: true
    },

    laboratory: {
      type: String,
      enum:['G301','G302','G303','G304','G305' ],
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

    status: {
        type: String, 
        enum: ['active', 'cancelled', 'late'],
        default: 'active'
    }, 

    // for reservation created by the lab technician
    created_by: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User_Profile', 
        required: true
    }, 

    // created by the lab technician/faculty for walk ins
    walk_in_reservation:{
        type: Boolean, 
        default: false
    }

}, {
    timestamps: true
});

// Prevent double booking
reservationSchema.index({laboratory: 1, reservation_date: 1, time_slot: 1, seat_number: 1}, {unique: true});

const Reservation = mongoose.model('Reservation_Slot', reservationSchema);

module.exports = {Reservation, reservationSchema};
