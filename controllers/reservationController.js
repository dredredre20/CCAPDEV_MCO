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

    const user = await UserProfile.findById(userId).lean();
    if (!user) {
      return res.redirect('/user-login?error=User not found');
    }

    // Only students can make reservations through this endpoint
    if (user.user_type !== 'student') {
      return res.redirect(`/${user.user_type}?userId=${userId}&error=Only students can make reservations through this form`);
    }

    // Validate required fields
    if (!laboratory || !reservation_date || !time_slot || !seat_number) {
      return res.redirect(`/student/reserve?userId=${userId}&error=All required fields must be filled`);
    }

    // Check if reservation date is in the past
    const reservationDateTime = new Date(reservation_date);
    reservationDateTime.setHours(parseInt(time_slot.split(':')[0]));
    reservationDateTime.setMinutes(parseInt(time_slot.split(':')[1]));
    
    if (reservationDateTime < new Date()) {
      return res.redirect(`/student/reserve?userId=${userId}&error=Cannot make reservations for past dates`);
    }

    // Check if slot is available using ReservationSlot
    let slot = await ReservationSlot.findOne({
      laboratory,
      date: new Date(reservation_date),
      time_slot,
      seat_number
    }).lean();

    // If slot doesn't exist, create it as available
    if (!slot) {
      slot = new ReservationSlot({
      laboratory,
      date: new Date(reservation_date),
      time_slot,
      seat_number,
      is_available: true,
      is_blocked: false
    });
    }

    // Check if slot can be reserved
    if (!slot.canBeReserved()) {
      return res.redirect(`/student/reserve?userId=${userId}&error=Slot is not available`);
    }

    // Check if user already has a reservation for this time slot
    const existingReservation = await Reservation.findOne({
      user_id: userId,
      laboratory,
      reservation_date: new Date(reservation_date),
      time_slot,
      status: 'active'
    }).lean();

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
      seat_number: parseInt(seat_number),
      is_anonymous: is_anonymous === 'on',
      purpose: purpose || '',
      status: 'active'
    });

    await reservation.save();

    // Update slot
    await slot.reserve(userId, reservation._id);

    // Update user's current reservations
    if (!user.current_reservations) {
      user.current_reservations = [];
    }
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

    const user = await UserProfile.findById(userId).lean();
    if (!user) {
      return res.redirect('/user-login?error=User not found');
    }

    // Get reservations from Reservation collection
    const reservations = await Reservation.find({ 
      user_id: userId, 
      status: 'active' 
    }).sort({ reservation_date: 1, time_slot: 1 }).lean();

    res.render('student_page', {
      title: 'My Reservations',
      style: 'student_page_design.css',
      user: user,
      reservations: reservations || [],
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

    const user = await UserProfile.findById(userId).lean();
    if (!user) {
      return res.redirect('/user-login?error=User not found');
    }

    const reservation = await Reservation.findById(reservationId).lean();
    if (!reservation) {
      return res.redirect(`/student?userId=${userId}&error=Reservation not found`);
    }

    // Check if user can edit this reservation
    if (user.user_type === 'student' && reservation.user_id.toString() !== userId) {
      return res.redirect(`/student?userId=${userId}&error=You can only edit your own reservations`);
    }

    // Check if new reservation date is in the past
    const newReservationDateTime = new Date(reservation_date);
    newReservationDateTime.setHours(parseInt(time_slot.split(':')[0]));
    newReservationDateTime.setMinutes(parseInt(time_slot.split(':')[1]));
    
    if (newReservationDateTime < new Date()) {
      return res.redirect(`/student/edit-reservation?userId=${userId}&error=Cannot edit reservations for past dates`);
    }

    // Check if new slot is available
    let newSlot = await ReservationSlot.findOne({
      laboratory,
      date: new Date(reservation_date),
      time_slot,
      seat_number
    }).lean();

    // If new slot doesn't exist, create it
    if (!newSlot) {
      newSlot = new ReservationSlot({
      laboratory,
      date: new Date(reservation_date),
      time_slot,
      seat_number,
      is_available: true,
      is_blocked: false
    });
    }

    if (!newSlot.canBeReserved()) {
      return res.redirect(`/student/edit-reservation?userId=${userId}&error=New slot is not available`);
    }

    // Release old slot
    const oldSlot = await ReservationSlot.findOne({
      laboratory: reservation.laboratory,
      date: reservation.reservation_date,
      time_slot: reservation.time_slot,
      seat_number: reservation.seat_number,
      reservation_id: reservation._id
    }).lean();

    if (oldSlot) {
      await oldSlot.release();
    }

    // Update reservation
    reservation.laboratory = laboratory;
    reservation.reservation_date = new Date(reservation_date);
    reservation.time_slot = time_slot;
    reservation.seat_number = parseInt(seat_number);
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

    const user = await UserProfile.findById(userId).lean();
    if (!user) {
      return res.redirect('/user-login?error=User not found');
    }

    const reservation = await Reservation.findById(reservationId).lean();
    if (!reservation) {
      return res.redirect(`/student?userId=${userId}&error=Reservation not found`);
    }

    // Check if user can remove this reservation
    if (user.user_type === 'student' && reservation.user_id.toString() !== userId) {
      return res.redirect(`/student?userId=${userId}&error=You can only remove your own reservations`);
    }

    // Check if technician can remove (within 10 minutes of start time)
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
    }).lean();

    if (slot) {
      await slot.release();
    }

    // Remove from user's current reservations
    if (user.current_reservations) {
    user.current_reservations = user.current_reservations.filter(
      r => r.toString() !== reservationId
    );
    await user.save();
    }

    // Delete reservation
    await Reservation.findByIdAndDelete(reservationId);

    res.redirect(`/${user.user_type}?userId=${userId}&success=Reservation removed successfully`);
  } catch (err) {
    console.error('Error removing reservation:', err);
    res.redirect(`/${req.query.userType || 'student'}?userId=${req.query.userId || req.body.userId}&error=Error removing reservation`);
  }
};

// ✅ View Slot Availability (Fixed)
exports.viewAvailability = async (req, res) => {
  try {
    const { laboratory, date, time_slot } = req.query;
    console.log('[viewAvailability] Query:', req.query);
    let seatMap = [];

    if (laboratory && laboratory.trim() !== '' && date) {
      // Parse date and create range for the whole day
      const start = new Date(date);
      const end = new Date(date);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.render('view-availability', {
          title: 'Lab Slot Availability',
          style: 'view-availability-design.css',
          slots: [],
          laboratory: laboratory || '',
          date: date || '',
          time: time_slot || '',
          availableCount: 35,
          reservedCount: 0,
          userId: req.query.userId || '',
          userType: 'student',
          error: 'Invalid date format. Please select a valid date.'
        });
      }

      // Find existing reservations for this lab/date/time
      let query = { 
        laboratory, 
        reservation_date: { $gte: start, $lte: end }, 
        status: 'active' 
      };
      if (time_slot) query.time_slot = time_slot;
      
      const reservations = await Reservation.find(query)
        .populate('user_id', 'name email')
        .sort({ seat_number: 1 }).lean();

      // Find blocked slots
      let blockedQuery = { 
        laboratory, 
        date: { $gte: start, $lte: end }, 
        is_blocked: true 
      };
      if (time_slot) blockedQuery.time_slot = time_slot;
      
      const blockedSlots = await ReservationSlot.find(blockedQuery).lean();

      // Create a map of reserved and blocked seats
      const seatStatus = {};
      
      // Mark reserved seats
      reservations.forEach(reservation => {
        seatStatus[reservation.seat_number] = {
          reserved: true,
          blocked: false,
          name: reservation.is_anonymous ? 'Anonymous' : 
                (reservation.user_id ? `${reservation.user_id.name.first} ${reservation.user_id.name.last}` : 'Unknown'),
          anonymous: reservation.is_anonymous,
          time_slot: reservation.time_slot
        };
      });

      // Mark blocked seats
      blockedSlots.forEach(slot => {
        if (!seatStatus[slot.seat_number]) {
          seatStatus[slot.seat_number] = {
            reserved: false,
            blocked: true,
            name: 'Blocked',
            anonymous: false,
            time_slot: slot.time_slot,
            block_reason: slot.block_reason
          };
        }
      });

      // Generate all 35 seats with their status
      for (let seat = 1; seat <= 35; seat++) {
        const seatInfo = seatStatus[seat];
        if (seatInfo) {
          seatMap.push({
            seat_number: seat,
            reserved: seatInfo.reserved,
            blocked: seatInfo.blocked,
            name: seatInfo.name,
            anonymous: seatInfo.anonymous,
            time_slot: seatInfo.time_slot,
            block_reason: seatInfo.block_reason
          });
        } else {
          seatMap.push({
            seat_number: seat,
            reserved: false,
            blocked: false,
            name: null,
            anonymous: false,
            time_slot: time_slot || null
          });
        }
      }
    } else {
      // If no lab or date specified, show all seats as available
      for (let seat = 1; seat <= 35; seat++) {
        seatMap.push({
          seat_number: seat,
          reserved: false,
          blocked: false,
          name: null,
          anonymous: false,
          time_slot: null
        });
      }
    }

    // Calculate statistics
    const availableCount = seatMap.filter(seat => !seat.reserved && !seat.blocked).length;
    const reservedCount = seatMap.filter(seat => seat.reserved).length;
    const blockedCount = seatMap.filter(seat => seat.blocked).length;

    // Determine user type for navigation
    let userType = 'student';
    let userId = '';
    if (req.query && req.query.userId) {
      userId = req.query.userId;
    } else if (req.body && req.body.userId) {
      userId = req.body.userId;
    }
    if (userId && typeof userId === 'string' && userId.length === 24) {
      try {
        let user = await UserProfile.findById(userId).lean();
        if (user) {
          // Convert to plain object to avoid Handlebars prototype access warning
          user = user.toObject();
          userType = user.user_type;
        }
      } catch (err) {
        console.log('Could not determine user type, defaulting to student');
      }
    }

    res.render('view-availability', {
      title: 'Lab Slot Availability',
      style: 'view-availability-design.css',
      slots: seatMap,
      laboratory: laboratory || '',
      date: date || '',
      time: time_slot || '',
      availableCount,
      reservedCount,
      blockedCount,
      userId: userId || '',
      userType: userType || 'student',
      message: (!laboratory || laboratory.trim() === '') ? 'Please select a laboratory to view availability.' : null
    });
  } catch (err) {
    console.error('Error viewing availability:', err.message, err.stack);
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

    const technician = await UserProfile.findById(technicianId).lean();
    if (!technician || technician.user_type !== 'technician') {
      return res.redirect('/user-login?error=Only technicians can reserve for students');
    }

    const student = await UserProfile.findOne({ email: student_email.toLowerCase() }).lean();
    if (!student) {
      return res.redirect(`/technician/reserve?userId=${technicianId}&error=Student not found`);
    }

    // Validate required fields
    if (!laboratory || !reservation_date || !time_slot || !seat_number) {
      return res.redirect(`/technician/reserve?userId=${technicianId}&error=All required fields must be filled`);
    }

    // Check if reservation date is in the past
    const reservationDateTime = new Date(reservation_date);
    reservationDateTime.setHours(parseInt(time_slot.split(':')[0]));
    reservationDateTime.setMinutes(parseInt(time_slot.split(':')[1]));
    
    if (reservationDateTime < new Date()) {
      return res.redirect(`/technician/reserve?userId=${technicianId}&error=Cannot make reservations for past dates`);
    }

    // Check if slot is available using ReservationSlot
    let slot = await ReservationSlot.findOne({
      laboratory,
      date: new Date(reservation_date),
      time_slot,
      seat_number
    }).lean();

    // If slot doesn't exist, create it as available
    if (!slot) {
      slot = new ReservationSlot({
      laboratory,
      date: new Date(reservation_date),
      time_slot,
      seat_number,
      is_available: true,
      is_blocked: false
    });
    }

    if (!slot.canBeReserved()) {
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
      seat_number: parseInt(seat_number),
      is_anonymous: false,
      purpose: purpose || 'Walk-in reservation by technician',
      status: 'active'
    });

    await reservation.save();

    // Update slot
    await slot.reserve(student._id, reservation._id);

    // Update student's current reservations
    if (!student.current_reservations) {
      student.current_reservations = [];
    }
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

    const technician = await UserProfile.findById(technicianId).lean();
    if (!technician || technician.user_type !== 'technician') {
      return res.redirect('/user-login?error=Only technicians can block slots');
    }

    // Validate required fields
    if (!laboratory || !date || !time_slot || !seat_number) {
      return res.redirect(`/technician/block?userId=${technicianId}&error=All required fields must be filled`);
    }

    let slot = await ReservationSlot.findOne({
      laboratory,
      date: new Date(date),
      time_slot,
      seat_number
    }).lean();

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
        block_reason: reason || 'Blocked by technician'
      });
    } else {
      // Block existing slot
      await slot.block(technicianId, reason || 'Blocked by technician');
    }

    await slot.save();

    res.redirect(`/technician?userId=${technicianId}&success=Time slot blocked successfully`);
  } catch (err) {
    console.error('Error blocking time slot:', err);
    res.redirect(`/technician?userId=${req.query.userId || req.body.userId}&error=Error blocking time slot`);
  }
};
