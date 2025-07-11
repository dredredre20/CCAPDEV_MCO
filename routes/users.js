const express = require('express');
const router = express.Router();
const { UserProfile } = require('../models/User');
const Reservation = require('../models/Reservation');

// GET student profile
router.get('/student/profile', async (req, res) => {
    const userId = req.query.userId;
    try {
        const user = await UserProfile.findById(userId);
        const reservations = await Reservation.find({ user_id: userId });
        res.render('new-profile', { user, reservations });
    } catch (err) {
        console.error('[GET /student/profile]', err);
        res.status(500).send('Error loading profile');
    }
});

// POST update profile description
router.post('/student/profile/update-description', async (req, res) => {
    const { userId, description } = req.body;

    try {
        await UserProfile.findByIdAndUpdate(userId, {
            profile_description: description
        });
        res.redirect(`/student/profile?userId=${userId}`);
    } catch (err) {
        console.error('[POST /student/profile/update-description]', err);
        res.status(500).send('Error updating profile');
    }
});

// POST delete user
router.post('/student/delete', async (req, res) => {
    const { userId } = req.body;

    try {
        await Reservation.deleteMany({ user_id: userId });
        await UserProfile.findByIdAndDelete(userId);
        res.redirect('/user-login');
    } catch (err) {
        console.error('[POST /student/delete]', err);
        res.status(500).send('Error deleting account');
    }
});

module.exports = router;
