const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const { UserProfile } = require('../models/User');
const userController = require('../controllers/userController');

// Student homepage
router.get('/student', async (req, res) => {
    const userId = req.query.userId;
    res.render('student_page', { userId });
});

// Reserve form
router.get('/student-reserve', async (req, res) => {
    const userId = req.query.userId;
    const user = await UserProfile.findById(userId);
    res.render('new-reserve', { userId, user });
});

// Save reservation
router.post('/student-reserve/save', async (req, res) => {
    const { userId, lab, seat_number, reservation_date } = req.body;

    try {
        const newReservation = new Reservation({
            user_id: userId,
            laboratory: lab,
            seat_number,
            reservation_date
        });

        await newReservation.save();
        res.redirect(`/student?userId=${userId}`);
    } catch (err) {
        console.error('[POST /student-reserve/save]', err);
        res.status(500).send('Failed to save reservation');
    }
});

// Save reservation (multiple seats)
router.post('/student/reserve', async (req, res) => {
    const { userId, laboratory, reservation_date, time, seat_numbers } = req.body;
    const seatArray = Array.isArray(seat_numbers) ? seat_numbers : [seat_numbers];
    try {
        for (const seat of seatArray) {
            await Reservation.create({
                user_id: userId,
                laboratory,
                reservation_date,
                time_slot: time,
                seat_number: seat
            });
        }
        res.redirect(`/student?userId=${userId}`);
    } catch (err) {
        console.error('[POST /student/reserve]', err);
        res.status(500).send('Failed to save reservation');
    }
});

// Edit reservations page (show list, select to edit)
router.get('/student/edit-reservation', async (req, res) => {
    const userId = req.query.userId;
    try {
        const reservations = await Reservation.find({ user_id: userId });
        res.render('new-edit_reserve', { userId, reservations });
    } catch (err) {
        console.error('[GET /student/edit-reservation]', err);
        res.status(500).send('Error loading reservations');
    }
});

// Edit specific reservation (populate form)
router.get('/student/edit-reservation/:id', async (req, res) => {
    const reservationId = req.params.id;
    try {
        const reservation = await Reservation.findById(reservationId);
        res.render('edit_reservation_form', { reservation });
    } catch (err) {
        console.error('[GET /student/edit-reservation/:id]', err);
        res.status(500).send('Error loading reservation');
    }
});

// Save updated reservation
router.post('/student/edit-reservation/:id', async (req, res) => {
    const reservationId = req.params.id;
    const { laboratory, reservation_date, time, seat_number, userId } = req.body;
    try {
        await Reservation.findByIdAndUpdate(reservationId, {
            laboratory,
            reservation_date,
            time_slot: time,
            seat_number
        });
        res.redirect(`/student/edit-reservation?userId=${userId}`);
    } catch (err) {
        console.error('[POST /student/edit-reservation/:id]', err);
        res.status(500).send('Error saving updated reservation');
    }
});

// Student profile edit
router.post('/student/profile/edit', userController.updateProfile);

// GET student profile page
router.get('/student/profile', async (req, res) => {
    const userId = req.query.userId;
    try {
        const user = await UserProfile.findById(userId);
        const reservations = await Reservation.find({ user_id: userId });
        res.render('new-profile', { user, userId, reservations });
    } catch (err) {
        console.error('[GET /student/profile]', err);
        res.status(500).send('Error loading profile');
    }
});

// GET student reserve page
router.get('/student/reserve', async (req, res) => {
    const userId = req.query.userId;
    try {
        const user = await UserProfile.findById(userId);
        res.render('new-reserve', { userId, user });
    } catch (err) {
        console.error('[GET /student/reserve]', err);
        res.status(500).send('Error loading reserve page');
    }
});

module.exports = router;
