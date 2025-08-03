const express = require('express');
const router = express.Router();
const { Reservation } = require('../models/Reservation');

// GET /view-availability?lab=G301&date=2025-07-10&time=8:00AM-10:00AM
router.get('/view-availability', async (req, res) => {
    const { lab, date, time } = req.query;

    try {
        const reservations = await Reservation.find({
            laboratory: lab,
            reservation_date: new Date(date),
            time_slot: time
        }).select('seat_number');

        const takenSeats = reservations.map(r => r.seat_number);
        const totalSeats = 35;

        const availableSeats = Array.from({ length: totalSeats }, (_, i) => i + 1)
            .filter(seat => !takenSeats.includes(seat));

        res.render('view-availability', {
            lab,
            date,
            time,
            availableSeats
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving availability');
    }
});

module.exports = router;
