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
router.get('/search', async (req, res) => {
  try {
    const { query, type } = req.query;
    
    if (!query) {
      return res.render('view-availability', {
        title: 'Search Results',
        style: 'view-availability-design.css',
        results: [],
        searchQuery: '',
        searchType: type || 'slots'
      });
    }

    let results = [];
    
    if (type === 'users') {
      // Search for users
      const users = await UserProfile.find({
        $or: [
          { 'name.first': { $regex: query, $options: 'i' } },
          { 'name.last': { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      }).select('name email user_type profile_description');

      results = users.map(user => ({
        type: 'user',
        data: user
      }));
    } else {
      // Search for available slots
      const slots = await ReservationSlot.find({
        is_available: true,
        is_blocked: false,
        $or: [
          { laboratory: { $regex: query, $options: 'i' } },
          { time_slot: { $regex: query, $options: 'i' } }
        ]
      }).populate('reserved_by', 'name email');

      results = slots.map(slot => ({
        type: 'slot',
        data: slot
      }));
    }

    res.render('view-availability', {
      title: 'Search Results',
      style: 'view-availability-design.css',
      results,
      searchQuery: query,
      searchType: type || 'slots'
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).send('Search error');
  }
});

// ✅ View user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.query.currentUserId;

    const user = await UserProfile.findById(userId).populate('current_reservations');
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Check if current user can edit this profile
    const canEdit = currentUserId && currentUserId === userId;

    res.render('new-profile', {
      title: `${user.name.first} ${user.name.last}'s Profile`,
      style: 'new-profile.css',
      user,
      canEdit,
      currentUserId
    });
  } catch (err) {
    console.error('Profile view error:', err);
    res.status(500).send('Profile view error');
  }
});

// ✅ Delete user account
router.post('/delete-account', async (req, res) => {
  try {
    const { userId, password } = req.body;

    const user = await UserProfile.findById(userId);
    if (!user) {
      return res.redirect('/user-login?error=User not found');
    }

    // Plain text password comparison
    if (user.password !== password) {
      return res.redirect(`/student/profile?userId=${userId}&error=Incorrect password`);
    }

    // Cancel all pending reservations
    const reservations = await Reservation.find({ user_id: userId, status: 'active' });
    for (const reservation of reservations) {
      // Release slots
      const slot = await ReservationSlot.findOne({
        laboratory: reservation.laboratory,
        date: reservation.reservation_date,
        time_slot: reservation.time_slot,
        seat_number: reservation.seat_number,
        reservation_id: reservation._id
      });

      if (slot) {
        await slot.release();
      }

      // Mark reservation as cancelled
      reservation.status = 'cancelled';
      await reservation.save();
    }

    // Delete user account
    await UserProfile.findByIdAndDelete(userId);

    res.redirect('/user-login?success=Account deleted successfully');
  } catch (err) {
    console.error('Delete account error:', err);
    res.redirect(`/student/profile?userId=${req.body.userId}&error=Error deleting account`);
  }
});

module.exports = router;
