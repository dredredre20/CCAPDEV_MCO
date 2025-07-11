const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

// ✅ Create a new reservation
router.post('/reserve', reservationController.reserveSlot);

// ✅ View all available slots for a given date and lab
router.get('/availability', async (req, res) => {
    const { lab, date, time } = req.query;
    // Fetch all reservations for the lab/date/time
    const Reservation = require('../models/Reservation');
    const query = { laboratory: lab, reservation_date: new Date(date) };
    if (time) query.time_slot = time;
    const reservations = await Reservation.find(query);
    // 35 seats per lab
    const slots = [];
    for (let i = 1; i <= 35; i++) {
        const reserved = reservations.find(r => r.seat_number === i);
        slots.push({
            seat_number: i,
            reserved: !!reserved,
            name: reserved ? reserved.name : null,
            anonymous: reserved ? reserved.is_anonymous : false
        });
    }
    res.render('view-availability', { slots });
});

// ✅ Edit a reservation by ID
router.put('/edit/:id', reservationController.editReservation);

// ✅ Delete a reservation by ID
router.delete('/delete/:id', reservationController.removeReservation);

// ✅ Get all reservations for a user
router.get('/user/:userId', reservationController.viewReservations);

module.exports = router;
