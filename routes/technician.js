const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const { UserProfile } = require('../models/User');
const userController = require('../controllers/userController');

// Technician homepage
router.get('/technician', (req, res) => {
    const userId = req.query.userId;
    res.render('lab_technician_page', { userId });
});

// Technician profile
router.get('/technician/profile', async (req, res) => {
    const techId = req.query.techId || req.query.userId;
    try {
        const user = await UserProfile.findById(techId);
        const reservations = await Reservation.find({ user_id: techId });
        res.render('labTech_profile', { user, tech: user, reservations });
    } catch (err) {
        console.error('[GET /technician/profile]', err);
        res.status(500).send('Error loading profile');
    }
});

// Technician profile edit
router.post('/technician/profile/edit', userController.updateProfile);

// Reserve a slot
router.get('/technician/reserve', async (req, res) => {
    const userId = req.query.userId;
    const user = await UserProfile.findById(userId);
    res.render('lab_technician_reserve', { userId, user });
});

// Save reservation (multiple seats)
router.post('/technician/reserve', async (req, res) => {
    const { techId, laboratory, reservation_date, time, seat_numbers } = req.body;
    const seatArray = Array.isArray(seat_numbers) ? seat_numbers : [seat_numbers];
    try {
        for (const seat of seatArray) {
            await Reservation.create({
                user_id: techId,
                laboratory,
                reservation_date,
                time_slot: time,
                seat_number: seat
            });
        }
        res.redirect(`/technician?userId=${techId}`);
    } catch (err) {
        console.error('[POST /technician/reserve]', err);
        res.status(500).send('Failed to save reservation');
    }
});

// Edit reservations page (show list, select to edit)
router.get('/technician/edit', async (req, res) => {
    const techId = req.query.techId;
    try {
        const reservations = await Reservation.find({ user_id: techId });
        res.render('lab_technician_edit', { techId, reservations });
    } catch (err) {
        console.error('[GET /technician/edit]', err);
        res.status(500).send('Error loading reservations');
    }
});

// Edit specific reservation (populate form)
router.get('/technician/edit/:id', async (req, res) => {
    const reservationId = req.params.id;
    try {
        const reservation = await Reservation.findById(reservationId);
        res.render('edit_reservation_form', { reservation });
    } catch (err) {
        console.error('[GET /technician/edit/:id]', err);
        res.status(500).send('Error loading reservation');
    }
});

// Save updated reservation
router.post('/technician/edit/:id', async (req, res) => {
    const reservationId = req.params.id;
    const { laboratory, reservation_date, time, seat_number, techId } = req.body;
    try {
        await Reservation.findByIdAndUpdate(reservationId, {
            laboratory,
            reservation_date,
            time_slot: time,
            seat_number
        });
        res.redirect(`/technician/edit?techId=${techId}`);
    } catch (err) {
        console.error('[POST /technician/edit/:id]', err);
        res.status(500).send('Error saving updated reservation');
    }
});

// Delete reservations
router.get('/technician/remove', async (req, res) => {
    const userId = req.query.userId;

    try {
        const reservations = await Reservation.find({ user_id: userId });
        res.render('lab_technician_remove', { userId, reservations });
    } catch (err) {
        console.error('[GET /technician/remove]', err);
        res.status(500).send('Error loading reservations');
    }
});

router.post('/technician/remove/:id', async (req, res) => {
    const reservationId = req.params.id;
    const { userId } = req.body;

    try {
        await Reservation.findByIdAndDelete(reservationId);
        res.redirect(`/technician/remove?userId=${userId}`);
    } catch (err) {
        console.error('[POST /technician/remove/:id]', err);
        res.status(500).send('Failed to delete reservation');
    }
});

module.exports = router;
