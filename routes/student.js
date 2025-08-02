const express = require('express');
const router = express.Router();
const { Reservation } = require('../models/Reservation');
const { UserProfile } = require('../models/User');
const { ReservationSlot } = require('../models/ReservationSlot');
// const userController = require('../controllers/userController');

const studentController = require('../controllers/studentController');


// Student homepage
router.get('/student', studentController.studentHompage);

// Reserve page
router.get('/student/reserve', studentController.reservePage)

// POST route for creating student reservations
router.post('/student/reserve', studentController.createStudentReservation);

// Edit reservations page
router.get('/student/edit-reservation', studentController.getEditReservation);

// POST route for editing reservations
router.post('/student/edit-reservation', studentController.createEditedReservation);

// Students are not allowed to delete reservations.

// Student profile page
router.get('/student/profile', studentController.getProfilePage);

// View another user's public profile
router.get('/user/:userId/profile', studentController.viewPublicProfile);

// API endpoint to get available time slots or seats for a lab/date/time slot
router.get('/student/availability', studentController.viewSlotsAvailable);

// Debug route to test database connection
router.get('/student/debug', studentController.debug)

router.post('/student/profile/delete', studentController.deleteAccount);

router.post('/student/profile/edit', studentController.updateProfile);


module.exports = router;
