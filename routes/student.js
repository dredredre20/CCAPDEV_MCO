const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });


const mongoose = require('mongoose');
const { Reservation } = require('../models/Reservation');
const { UserProfile } = require('../models/User');
const { ReservationSlot } = require('../models/ReservationSlot');


// const userController = require('../controllers/userController');
const { authenticateUser, authorizeStudent } = require('../middleware/auth');
const { logErrorAsync } = require('../middleware/errorLogger');


const studentController = require('../controllers/studentController')

// Student homepage
router.get('/student', authenticateUser, authorizeStudent, studentController.getStudentHomepage);

// Reserve page
router.get('/student/reserve', authenticateUser, authorizeStudent, studentController.getReservePage);

// POST route for creating student reservations
// POST route for creating student reservations
router.post('/student/reserve', authenticateUser, authorizeStudent, studentController.postReservation);

// Edit reservations page
router.get('/student/edit-reservation', authenticateUser, authorizeStudent, studentController.getEditReservation);


// POST route for editing reservations
router.post('/student/edit-reservation', authenticateUser, authorizeStudent, studentController.postEditReservation);

// Andre Marker
router.post(
  '/student/profile/edit',
  authenticateUser,
  authorizeStudent,
  upload.single('profile_picture'), // Handle file upload
  studentController.updateProfile
);

// Andre Marker
router.get('/user/profile-picture/:userId', studentController.getProfilePicture);
// Students are not allowed to delete reservations.

// Student profile page
router.get('/student/profile', authenticateUser, authorizeStudent, studentController.getStudentProfile);

// View another user's public profile
router.get('/user/:userId/profile', studentController.viewPublicProfile);

// API endpoint to get available time slots or seats for a lab/date/time slot
router.get('/student/availability', studentController.viewAvailability);

// Debug route to test database connection
router.get('/student/debug', async (req, res) => {
  const userId = req.session.userId;
  if (!userId || typeof userId !== 'string' || userId.length !== 24) {
    return res.json({ error: 'Missing or invalid userId' });
  }
  try {
    console.log(`🔍 Debug: Checking reservations for user ${userId}`);
    
    const user = await UserProfile.findById(userId);
    if (!user) {
      return res.json({ error: 'User not found', userId });
    }
    
    const reservations = await Reservation.find({ 
      user_id: userId, 
      status: 'active' 
    }).sort({ reservation_date: 1, time_slot: 1 });
    
    console.log(`📋 Debug: Found ${reservations.length} reservations for user ${userId}`);
    
    res.json({
      userId,
      userType: user.user_type,
      userCurrentReservations: user.current_reservations.length,
      databaseReservations: reservations.length,
      reservations: reservations.map(r => ({
        _id: r._id.toString(),
        laboratory: r.laboratory,
        reservation_date: r.reservation_date,
        time_slot: r.time_slot,
        seat_number: r.seat_number,
        status: r.status
      }))
    });
  } catch (err) {
    console.error('[GET /student/debug]', err);
    res.json({ error: err.message });
  }
});

router.post('/student/profile/delete', studentController.deleteAccount);


module.exports = router;
