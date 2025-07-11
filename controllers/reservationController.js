const { UserProfile, reservationSchema } = require('../models/User');
const mongoose = require('mongoose');

// Create/Reserve Lab Slot
exports.reserveSlot = async (req, res) => {
  try {
    const { laboratory, reservation_date, time_slot, seat_number, is_anonymous } = req.body;
    const userId = req.userId; // from middleware

    const user = await UserProfile.findById(userId);
    if (!user) return res.status(404).send('User not found');

    user.current_reservations.push({
      laboratory,
      reservation_date,
      time_slot,
      seat_number,
      is_anonymous: is_anonymous === 'on'
    });

    await user.save();
    res.redirect('/reservations/list');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating reservation');
  }
};

// View All Reservations
exports.viewReservations = async (req, res) => {
  try {
    const user = await UserProfile.findById(req.userId);
    if (!user) return res.redirect('/user-login');

    res.render('view-reservations', { reservations: user.current_reservations });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving reservations');
  }
};

// Edit Reservation
exports.editReservation = async (req, res) => {
  try {
    const { reservationId, laboratory, reservation_date, time_slot, seat_number } = req.body;

    const user = await UserProfile.findById(req.userId);
    const reservation = user.current_reservations.id(reservationId);
    if (!reservation) return res.status(404).send('Reservation not found');

    reservation.laboratory = laboratory;
    reservation.reservation_date = reservation_date;
    reservation.time_slot = time_slot;
    reservation.seat_number = seat_number;

    await user.save();
    res.redirect('/reservations/list');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error editing reservation');
  }
};

// Delete Reservation
exports.removeReservation = async (req, res) => {
  try {
    const { reservationId } = req.body;

    const user = await UserProfile.findById(req.userId);
    user.current_reservations = user.current_reservations.filter(
      r => r._id.toString() !== reservationId
    );

    await user.save();
    res.redirect('/reservations/list');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error removing reservation');
  }
};
