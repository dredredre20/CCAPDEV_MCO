const { UserProfile } = require('../models/User');
const { Reservation } = require('../models/Reservation');
const { ReservationSlot } = require('../models/ReservationSlot');
const mongoose = require('mongoose');

// ✅ Create/Reserve Lab Slot
exports.reserveSlot = async (req, res) => {
  try {
    const { laboratory, reservation_date, time_slot, seat_number, is_anonymous, purpose } = req.body;
    const userId = req.query.userId || req.body.userId;

    if (!userId) {
      return res.redirect('/user-login?error=Please log in to make reservations');
    }

    const user = await UserProfile.findById(userId);
    if (!user) {
      return res.redirect('/user-login?error=User not found');
    }

    if (user.user_type !== 'student') {
      return res.redirect(`/${user.user_type}?userId=${userId}&error=Only students can make reservations`);
    }

    // Check if slot is available
    const slot = await ReservationSlot.findOne({
      laboratory,
      date: new Date(reservation_date),
      time_slot,
      seat_number,
      is_available: true,
      is_blocked: false
    });

    if (!slot) {
      return res.redirect(`/student/reserve?userId=${userId}&error=Slot is not available`);
    }

    // Check if user already has a reservation for this time slot
    const existingReservation = await Reservation.findOne({
      user_id: userId,
      laboratory,
      reservation_date: new Date(reservation_date),
      time_slot,
      status: 'active'
    });

    if (existingReservation) {
      return res.redirect(`/student/reserve?userId=${userId}&error=You already have a reservation for this time slot`);
    }

    // Calculate end time (30 minutes later)
    const [hours, minutes] = time_slot.split(':').map(Number);
    const endTime = new Date(new Date(reservation_date).setHours(hours, minutes + 30));
    const endTimeString = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

    // Create reservation
    const reservation = new Reservation({
      user_id: userId,
      laboratory,
      reservation_date: new Date(reservation_date),
      time_slot,
      end_time: endTimeString,
      seat_number,
      is_anonymous: is_anonymous === 'on',
      purpose: purpose || ''
    });

    await reservation.save();

    // Update slot
    await slot.reserve(userId, reservation._id);

    // Update user's current reservations
    user.current_reservations.push(reservation._id);
    await user.save();

    res.redirect(`/student?userId=${userId}&success=Reservation created successfully`);
  } catch (err) {
    console.error('Error creating reservation:', err);
    res.redirect(`/student/reserve?userId=${req.query.userId || req.body.userId}&error=Error creating reservation`);
  }
};

// ✅ View All Reservations
exports.viewReservations = async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.redirect('/user-login?error=Please log in to view reservations');
    }

    const user = await UserProfile.findById(userId).populate('current_reservations');
    if (!user) {
      return res.redirect('/user-login?error=User not found');
    }

    res.render('student_page', {
      title: 'My Reservations',
      style: 'student_page_design.css',
      user: user,
      reservations: user.current_reservations || [],
      userId: userId
    });
  } catch (err) {
    console.error('Error retrieving reservations:', err);
    res.status(500).send('Error retrieving reservations');
  }
};

// ✅ Edit Reservation
exports.editReservation = async (req, res) => {
  try {
    const { reservationId, laboratory, reservation_date, time_slot, seat_number, is_anonymous, purpose } = req.body;
    const userId = req.query.userId || req.body.userId;

    if (!userId) {
      return res.redirect('/user-login?error=Please log in to edit reservations');
    }

    const user = await UserProfile.findById(userId);
    if (!user) {
      return res.redirect('/user-login?error=User not found');
    }

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.redirect(`/student?userId=${userId}&error=Reservation not found`);
    }

    // Check if user can edit this reservation
    if (user.user_type === 'student' && reservation.user_id.toString() !== userId) {
      return res.redirect(`/student?userId=${userId}&error=You can only edit your own reservations`);
    }

    // Check if new slot is available
    const newSlot = await ReservationSlot.findOne({
      laboratory,
      date: new Date(reservation_date),
      time_slot,
      seat_number,
      is_available: true,
      is_blocked: false
    });

    if (!newSlot) {
      return res.redirect(`/student/edit-reservation?userId=${userId}&error=New slot is not available`);
    }

    // Release old slot
    const oldSlot = await ReservationSlot.findOne({
      laboratory: reservation.laboratory,
      date: reservation.reservation_date,
      time_slot: reservation.time_slot,
      seat_number: reservation.seat_number,
      reservation_id: reservation._id
    });

    if (oldSlot) {
      await oldSlot.release();
    }

    // Update reservation
    reservation.laboratory = laboratory;
    reservation.reservation_date = new Date(reservation_date);
    reservation.time_slot = time_slot;
    reservation.seat_number = seat_number;
    reservation.is_anonymous = is_anonymous === 'on';
    reservation.purpose = purpose || '';

    // Calculate new end time
    const [hours, minutes] = time_slot.split(':').map(Number);
    const endTime = new Date(new Date(reservation_date).setHours(hours, minutes + 30));
    reservation.end_time = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

    await reservation.save();

    // Reserve new slot
    await newSlot.reserve(userId, reservation._id);

    res.redirect(`/student?userId=${userId}&success=Reservation updated successfully`);
  } catch (err) {
    console.error('Error editing reservation:', err);
    res.redirect(`/student/edit-reservation?userId=${req.query.userId || req.body.userId}&error=Error updating reservation`);
  }
};

// ✅ Delete Reservation
exports.removeReservation = async (req, res) => {
  try {
    const { reservationId } = req.body;
    const userId = req.query.userId || req.body.userId;

    if (!userId) {
      return res.redirect('/user-login?error=Please log in to remove reservations');
    }

    const user = await UserProfile.findById(userId);
    if (!user) {
      return res.redirect('/user-login?error=User not found');
    }

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.redirect(`/student?userId=${userId}&error=Reservation not found`);
    }

    // Check if user can remove this reservation
    if (user.user_type === 'student' && reservation.user_id.toString() !== userId) {
      return res.redirect(`/student?userId=${userId}&error=You can only remove your own reservations`);
    }

    // Check if technician can remove (within 10 minutes)
    if (user.user_type === 'technician') {
      const reservationTime = new Date(reservation.reservation_date);
      reservationTime.setHours(parseInt(reservation.time_slot.split(':')[0]));
      reservationTime.setMinutes(parseInt(reservation.time_slot.split(':')[1]));
      
      const now = new Date();
      const diffInMinutes = (reservationTime - now) / (1000 * 60);
      
      if (diffInMinutes > 10) {
        return res.redirect(`/technician?userId=${userId}&error=Can only remove reservations within 10 minutes of start time`);
      }
    }

    // Release slot
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

    // Remove from user's current reservations
    user.current_reservations = user.current_reservations.filter(
      r => r.toString() !== reservationId
    );
    await user.save();

    // Delete reservation
    await Reservation.findByIdAndDelete(reservationId);

    res.redirect(`/${user.user_type}?userId=${userId}&success=Reservation removed successfully`);
  } catch (err) {
    console.error('Error removing reservation:', err);
    res.redirect(`/${req.query.userType || 'student'}?userId=${req.query.userId || req.body.userId}&error=Error removing reservation`);
  }
};

// ✅ View Slot Availability
exports.viewAvailability = async (req, res) => {
  try {
    const { laboratory, date, time_slot } = req.query;
    let query = {};
    if (laboratory) query.laboratory = laboratory;
    if (date) query.date = new Date(date);
    if (time_slot) query.time_slot = time_slot;

    // Find all slots for the filter
    let slots = await ReservationSlot.find(query)
      .populate('reserved_by', 'name email')
      .sort({ date: 1, time_slot: 1, seat_number: 1 });

    // If no slots exist for this filter, create a virtual list for display
    let seatMap = [];
    for (let seat = 1; seat <= 35; seat++) {
      const slot = slots.find(s => s.seat_number === seat);
      if (slot) {
        seatMap.push({
          seat_number: seat,
          reserved: !slot.is_available || slot.is_blocked,
          reserved_by: slot.reserved_by ? slot.reserved_by.name : null,
          anonymous: slot.is_anonymous,
          time_slot: slot.time_slot,
        });
      } else {
        seatMap.push({
          seat_number: seat,
          reserved: false,
          reserved_by: null,
          anonymous: false,
          time_slot: time_slot || null,
        });
      }
    }

    res.render('view-availability', {
      title: 'Lab Slot Availability',
      style: 'view-availability-design.css',
      slots: seatMap,
      laboratory: laboratory || '',
      date: date || '',
      time: time_slot || ''
    });
  } catch (err) {
    console.error('Error viewing availability:', err);
    res.status(500).send('Error viewing availability');
  }
};

// ✅ Reserve for Student (Technician)
exports.reserveForStudent = async (req, res) => {
  try {
    const { student_email, laboratory, reservation_date, time_slot, seat_number, purpose } = req.body;
    const technicianId = req.query.userId || req.body.userId;

    if (!technicianId) {
      return res.redirect('/user-login?error=Please log in to make reservations');
    }

    const technician = await UserProfile.findById(technicianId);
    if (!technician || technician.user_type !== 'technician') {
      return res.redirect('/user-login?error=Only technicians can reserve for students');
    }

    const student = await UserProfile.findOne({ email: student_email.toLowerCase() });
    if (!student) {
      return res.redirect(`/technician/reserve?userId=${technicianId}&error=Student not found`);
    }

    // Check if slot is available
    const slot = await ReservationSlot.findOne({
      laboratory,
      date: new Date(reservation_date),
      time_slot,
      seat_number,
      is_available: true,
      is_blocked: false
    });

    if (!slot) {
      return res.redirect(`/technician/reserve?userId=${technicianId}&error=Slot is not available`);
    }

    // Calculate end time
    const [hours, minutes] = time_slot.split(':').map(Number);
    const endTime = new Date(new Date(reservation_date).setHours(hours, minutes + 30));
    const endTimeString = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;

    // Create reservation
    const reservation = new Reservation({
      user_id: student._id,
      laboratory,
      reservation_date: new Date(reservation_date),
      time_slot,
      end_time: endTimeString,
      seat_number,
      is_anonymous: false,
      purpose: purpose || 'Walk-in reservation by technician'
    });

    await reservation.save();

    // Update slot
    await slot.reserve(student._id, reservation._id);

    // Update student's current reservations
    student.current_reservations.push(reservation._id);
    await student.save();

    res.redirect(`/technician?userId=${technicianId}&success=Reservation created for student successfully`);
  } catch (err) {
    console.error('Error creating reservation for student:', err);
    res.redirect(`/technician/reserve?userId=${req.query.userId || req.body.userId}&error=Error creating reservation for student`);
  }
};

// ✅ Block Time Slot (Technician)
exports.blockTimeSlot = async (req, res) => {
  try {
    const { laboratory, date, time_slot, seat_number, reason } = req.body;
    const technicianId = req.query.userId || req.body.userId;

    if (!technicianId) {
      return res.redirect('/user-login?error=Please log in to block slots');
    }

    const technician = await UserProfile.findById(technicianId);
    if (!technician || technician.user_type !== 'technician') {
      return res.redirect('/user-login?error=Only technicians can block slots');
    }

    let slot = await ReservationSlot.findOne({
      laboratory,
      date: new Date(date),
      time_slot,
      seat_number
    });

    if (!slot) {
      // Create new slot if it doesn't exist
      slot = new ReservationSlot({
        laboratory,
        date: new Date(date),
        time_slot,
        seat_number,
        is_available: false,
        is_blocked: true,
        blocked_by: technicianId,
        block_reason: reason
      });
    } else {
      // Block existing slot
      await slot.block(technicianId, reason);
    }

    await slot.save();

    res.redirect(`/technician?userId=${technicianId}&success=Time slot blocked successfully`);
  } catch (err) {
    console.error('Error blocking time slot:', err);
    res.redirect(`/technician?userId=${req.query.userId || req.body.userId}&error=Error blocking time slot`);
  }
};
