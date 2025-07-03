const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  laboratory: {
    type: String, 
    enum: ['G301', 'G302','G303','G304','G305'], 
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

// Schema for user profile display
const userProfileSchema = new mongoose.Schema({
  name: {
    first: {
      type: String, 
      trim: true,
      required: true
    }, 
    last: {
      type: String, 
      trim: true,
      required: true
    }
  }, 

  email: {
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    lowercase: true, 
    validate: {
      validator: function(email) {
        return /^[a-z]+_[a-z]+@dlsu\.edu\.ph$/.test(email);
      }, 
      message: 'Invalid DLSU email'
    }
  },

  password: {
    type: String, 
    required: true, 
    trim: true,
    minlength: 8
  },

  user_type:{
    type: String, 
    enum: ['student', 'faculty'], 
    required: true, 
    default: 'student'
  },

  university: {
    type: String, 
    minlength: 1, 
    maxlength: 100,
    required: true,
    default: 'De La Salle University'
  }, 

  profile_description: {
    type: String,
    minlength: 1,
    maxlength: 300,
    trim: true
  }, 

  profile_picture: {
    type: String, //url or path to the image
    default: null
  },

  current_reservations : [reservationSchema], 

  // remember me functionality 
  remember_me_action: {
    type: String, 
    default: null
  }, 

  remember_me_expiration: {
    type: Date, 
    default: null
  }

}, {
  timestamps: true
});



// Models
const UserProfile = mongoose.model('User_Profile', userProfileSchema);

module.exports = {UserProfile, reservationSchema};

