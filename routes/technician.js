const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const mongoose = require('mongoose');
const { Reservation } = require('../models/Reservation');
const { UserProfile } = require('../models/User');
const { ReservationSlot } = require('../models/ReservationSlot');
//const userController = require('../controllers/userController');
const { authenticateUser, authorizeTechnician } = require('../middleware/auth');
const { logErrorAsync } = require('../middleware/errorLogger');


const technicianController = require('../controllers/technicianController');


router.get('/technician/dashboard-data', authenticateUser, authorizeTechnician, technicianController.getTechDashboardData);

// Technician homepage
router.get('/technician', authenticateUser, authorizeTechnician, technicianController.getTechnicianPage);

// Technician profile
router.get('/technician/profile', authenticateUser, authorizeTechnician, technicianController.getTechnicianProfile);


// Reserve for student page
router.get('/technician/reserve', authenticateUser, authorizeTechnician, technicianController.getReservePage);

// AJAX endpoint for technician availability without authentication middleware
router.get('/technician/availability-ajax', technicianController.getAvailabilityAjax);

// POST route for creating walk-in reservations
router.post('/technician/reserve', authenticateUser, authorizeTechnician, technicianController.postReservation);


// Block time slot page
router.get('/technician/block', authenticateUser, authorizeTechnician, technicianController.getBlock);

// Remove reservation page
router.get('/technician/remove', authenticateUser, authorizeTechnician, technicianController.getRemoveReservation);

// POST route for removing reservations
router.post('/technician/remove', authenticateUser, authorizeTechnician, technicianController.postRemoval);

// POST route for editing technician profile
router.post('/technician/profile/edit', authenticateUser, authorizeTechnician, upload.single('profile_picture'), technicianController.postProfileEdited);

// View all reservations (technician can see all)
router.get('/technician/reservations', authenticateUser, authorizeTechnician, technicianController.viewAllReservations);

// Technician edit reservation page
router.get('/technician/edit', technicianController.getEditPage);

// POST route for editing technician reservations
router.post('/technician/edit', technicianController.postEditReservation);

// POST route for deleting technician reservations
router.post('/technician/delete-reservation', technicianController.postDeletedReservation);

// Technician seat and time slot availability endpoint (like /student/availability)
router.get('/technician/availability', technicianController.getViewAvailability);

router.get('/user/profile-picture/:userId', technicianController.getProfilePicture);

router.post('/technician/profile/delete', technicianController.deleteAccount);


module.exports = router;
