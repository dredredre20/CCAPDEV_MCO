const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { UserProfile } = require('../models/User');
const { Reservation } = require('../models/Reservation');
const { ReservationSlot } = require('../models/ReservationSlot');

// ✅ Create a new reservation
router.post('/reserve', reservationController.reserveSlot);

// ✅ View slot availability
router.get('/availability', reservationController.viewAvailability);

// ✅ Edit a reservation
router.post('/edit', reservationController.editReservation);

// ✅ Delete a reservation
router.post('/delete', reservationController.removeReservation);

// ✅ Reserve for student (technician)
router.post('/reserve-for-student', reservationController.reserveForStudent);

// ✅ Block time slot (technician)
router.post('/block-slot', reservationController.blockTimeSlot);

// ✅ Get all reservations for a user
router.get('/user/:userId', reservationController.viewReservations);

// ✅ Search users and slots
router.get('/search', reservationController.searchUsersAndSlots);

// ✅ View user profile
router.get('/profile/:userId', reservationController.viewUserProfile);

// ✅ Delete user account
router.post('/delete-account', reservationController.deleteAccount);

module.exports = router;
