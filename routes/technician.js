const express = require('express');
const router = express.Router();

// const { Reservation } = require('../models/Reservation');
// const { UserProfile } = require('../models/User');
// const { ReservationSlot } = require('../models/ReservationSlot');
// const userController = require('../controllers/userController');

const technicianController = require('../controllers/technicianController');


// Technician homepage
router.get('/technician', technicianController.technicianHompage);

// Technician profile
router.get('/technician/profile', technicianController.technicianProfile);

// Reserve for student page
router.get('/technician/reserve', technicianController.getTechnicianReserve);

// POST route for creating walk-in reservations
router.post('/technician/reserve', technicianController.createTechnicianReserve);

// Block time slot page
router.get('/technician/block', technicianController.blockSlotTechnician);

// Remove reservation page
router.get('/technician/remove', technicianController.getRemovePage);

// POST route for removing reservations
router.post('/technician/remove', technicianController.removeReservation);

// POST route for editing technician profile
router.post('/technician/profile/edit', technicianController.editProfile);

// View all reservations (technician can see all)
router.get('/technician/reservations', technicianController.checkAllReservations);

// Technician edit reservation page
router.get('/technician/edit', technicianController.getEditReservePage);

// POST route for editing technician reservations
router.post('/technician/edit', technicianController.editReservation);

// POST route for deleting technician reservations
router.post('/technician/delete-reservation', technicianController.deleteReservation);

// Technician seat and time slot availability endpoint (like /student/availability)
router.get('/technician/availability', technicianController.viewSlotsAvailable);

router.post('/technician/profile/delete', technicianController.deleteAccount);

module.exports = router;
