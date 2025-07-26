const express = require('express');
const router = express.Router();
const { Reservation } = require('../models/Reservation');
const { UserProfile } = require('../models/User');
const { ReservationSlot } = require('../models/ReservationSlot');
const userController = require('../controllers/userController');

// Utility function to add minutes to a time string (e.g., '08:00' + 30 = '08:30')
function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
}

// Student homepage
router.get('/student', async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to access your dashboard');
    }
    try {
        const user = await UserProfile.findById(userId).lean();
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }

        // Get user's active reservations from the Reservation collection
        const reservations = await Reservation.find({ 
            user_id: userId, 
            status: 'active' 
        }).sort({ reservation_date: 1, time_slot: 1 }).lean();
        
        console.log(`📊 Dashboard: Found ${reservations.length} active reservations for user ${userId}`);
        
        // Calculate dashboard stats
        const upcomingCount = reservations.filter(r => 
            new Date(r.reservation_date) >= new Date()
        ).length;
        
        const labCount = new Set(reservations.map(r => r.laboratory)).size;
        
        const totalHours = reservations.length * 0.5; // 30 minutes per reservation
        
        // Get recent reservations (last 5)
        const recentReservations = reservations
            .sort((a, b) => new Date(b.reservation_date) - new Date(a.reservation_date))
            .slice(0, 5)
            .map(res => ({
                _id: res._id.toString(),
                laboratory: res.laboratory,
                reservation_date: res.reservation_date,
                time_slot: res.time_slot,
                seat_number: res.seat_number,
                status: 'active',
                purpose: res.purpose || '',
                description: res.description || ''
            }));

        res.render('student_page', { 
            title: 'Student Dashboard',
            style: 'student_page_design.css',
            userId, 
            user,
            reservations,
            upcomingCount,
            labCount,
            totalHours,
            recentReservations,
            error: req.query.error,
            success: req.query.success
        });
    } catch (err) {
        console.error('[GET /student]', err);
        res.status(500).send('Error loading student dashboard');
    }
});

// Reserve page
router.get('/student/reserve', async (req, res) => {
  const userId = req.session.userId;
  if (!userId || typeof userId !== 'string' || userId.length !== 24) {
    return res.redirect('/user-login?error=Please log in to reserve a lab');
  }
  try {
    const user = await UserProfile.findById(userId).lean();
    if (!user) {
      return res.redirect('/user-login?error=User not found');
    }
    
    // Time slots array
    const timeSlots = [
      '08:00', '08:30', '09:00', '09:30', '10:00',
      '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
      '13:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30', '18:00'
    ];

    // Get available slots for today (if no date specified)
    const today = new Date().toISOString().split('T')[0];
    const { laboratory, date } = req.query;
    
    let availableSlots = [];
    if (laboratory && date) {
      // Fetch available slots for the selected lab and date
      const existingReservations = await Reservation.find({
        laboratory,
        reservation_date: date,
        status: 'active'
      });

      // Create a map of taken seats for each time slot
      const takenSlots = {};
      existingReservations.forEach(reservation => {
        const key = `${reservation.time_slot}`;
        if (!takenSlots[key]) {
          takenSlots[key] = [];
        }
        takenSlots[key].push(reservation.seat_number);
      });

      // Generate available slots
      timeSlots.forEach(timeSlot => {
        const takenSeats = takenSlots[timeSlot] || [];
        const availableSeats = [];
        
        for (let seat = 1; seat <= 35; seat++) {
          if (!takenSeats.includes(seat)) {
            availableSeats.push(seat);
          }
        }
        
        if (availableSeats.length > 0) {
          availableSlots.push({
            timeSlot,
            availableSeats,
            takenCount: takenSeats.length,
            availableCount: availableSeats.length
          });
        }
      });
    }
    
    res.render('new-reserve', { 
      title: 'Reserve a Lab',
      style: 'new-reserve.css',
      userId, 
      user,
      timeSlots,
      today: new Date().toISOString().split('T')[0],
      availableSlots,
      selectedLab: laboratory || '',
      selectedDate: date || today,
      error: req.query.error
    });
  } catch (err) {
    console.error('[GET /student/reserve]', err);
    res.status(500).send('Error loading reserve page');
  }
});

// POST route for creating student reservations
router.post('/student/reserve', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { laboratory, reservation_date, time_slot, seat_number, purpose, description, is_anonymous } = req.body;
    
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      return res.redirect('/user-login?error=Please log in to reserve a lab');
    }

    // Validate required fields
    if (!laboratory || !reservation_date || !time_slot || !seat_number) {
      return res.redirect('/student/reserve?error=All required fields must be filled');
    }

    // Check if user exists
    const user = await UserProfile.findById(userId);
    if (!user) {
      return res.redirect('/user-login?error=User not found');
    }

    // Check if reservation date is in the past
    const reservationDateTime = new Date(reservation_date);
    reservationDateTime.setHours(parseInt(time_slot.split(':')[0]));
    reservationDateTime.setMinutes(parseInt(time_slot.split(':')[1]));
    
    if (reservationDateTime < new Date()) {
      return res.redirect(`/student/reserve?userId=${userId}&error=Cannot make reservations for past dates`);
    }

    // Check if seat is already taken for this time slot
    const existingReservation = await Reservation.findOne({
      laboratory,
      reservation_date: new Date(reservation_date),
      time_slot,
      seat_number: parseInt(seat_number),
      status: 'active'
    });

    if (existingReservation) {
      return res.redirect(`/student/reserve?userId=${userId}&error=This seat is already reserved for the selected time`);
    }

    // Check if slot is blocked
    const blockedSlot = await ReservationSlot.findOne({
      laboratory,
      date: new Date(reservation_date),
      time_slot,
      seat_number,
      is_blocked: true
    });

    if (blockedSlot) {
      return res.redirect(`/student/reserve?userId=${userId}&error=This seat is blocked for the selected time`);
    }

    // Calculate end_time by adding 30 minutes to time_slot
    function addMinutes(time, mins) {
      const [h, m] = time.split(':').map(Number);
      const total = h * 60 + m + mins;
      const nh = Math.floor(total / 60);
      const nm = total % 60;
      return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
    }
    const end_time = addMinutes(time_slot, 30);

    // Create reservation
    const reservation = new Reservation({
      user_id: userId,
      laboratory,
      reservation_date: new Date(reservation_date),
      time_slot,
      end_time,
      seat_number: parseInt(seat_number),
      purpose: purpose || '',
      description: description || '',
      is_anonymous: !!is_anonymous,
      status: 'active'
    });

    await reservation.save();

    // Update or create ReservationSlot
    let slot = await ReservationSlot.findOne({
      laboratory,
      date: new Date(reservation_date),
      time_slot,
      seat_number
    });

    if (!slot) {
      slot = new ReservationSlot({
        laboratory,
        date: new Date(reservation_date),
        time_slot,
        seat_number,
        is_available: false,
        is_blocked: false,
        reserved_by: userId,
        reservation_id: reservation._id
      });
    } else {
      slot.is_available = false;
      slot.reserved_by = userId;
      slot.reservation_id = reservation._id;
    }

    await slot.save();

    // Add reservation to user's current_reservations array
    // No need to update user.current_reservations; Reservation collection is the source of truth

    console.log(`✅ Reservation created: ${reservation._id} for user ${userId}`);
    console.log(`📊 User ${userId} now has ${user.current_reservations ? user.current_reservations.length : 0} reservations`);
    
    res.redirect(`/student?userId=${userId}&success=Reservation created successfully`);
  } catch (err) {
    console.error('[POST /student/reserve]', err);
    res.redirect(`/student/reserve?userId=${req.body.userId}&error=Failed to create reservation. Please try again.`);
  }
});

// Edit reservations page
router.get('/student/edit-reservation', async (req, res) => {
  const userId = req.session.userId;
  if (!userId || typeof userId !== 'string' || userId.length !== 24) {
    return res.redirect('/user-login?error=Please log in to edit your reservations');
  }
  try {
    const user = await UserProfile.findById(userId).lean();
    if (!user) {
      return res.redirect('/user-login?error=User not found');
    }
    
    // Fetch all active reservations for this student from the Reservation collection
    const reservations = await Reservation.find({ 
      user_id: userId, 
      status: 'active' 
    }).sort({ reservation_date: 1, time_slot: 1 }).lean();
    
    console.log(`📋 Found ${reservations.length} reservations for user ${userId}`);
    
    const formattedReservations = reservations.map(res => ({
      _id: res._id.toString(),
        laboratory: res.laboratory,
      reservation_date: res.reservation_date instanceof Date ? res.reservation_date.toISOString().split('T')[0] : res.reservation_date,
        time_slot: res.time_slot,
      seat_number: res.seat_number,
      purpose: res.purpose || '',
      description: res.description || '',
      is_anonymous: res.is_anonymous || false
    }));

    res.render('new-edit_reserve', { 
      title: 'Edit Reservation',
      style: 'new-edit_reserve.css',
      userId, 
      reservations: formattedReservations,
      error: req.query.error,
      success: req.query.success
    });
  } catch (err) {
    console.error('[GET /student/edit-reservation]', err);
    res.status(500).send('Error loading edit reservation page');
  }
});




// POST route for editing reservations
router.post('/student/edit-reservation', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { reservationId, laboratory, reservation_date, time_slot, seat_number, purpose, description, is_anonymous } = req.body;
    
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      return res.redirect('/user-login?error=Please log in to edit your reservations');
    }

    // Validate required fields
    if (!reservationId || !laboratory || !reservation_date || !time_slot || !seat_number) {
      return res.redirect(`/student/edit-reservation?userId=${userId}&error=All required fields must be filled`);
    }

    // Check if user exists
    const user = await UserProfile.findById(userId);
    if (!user) {
      return res.redirect('/user-login?error=User not found');
    }

    // Find the reservation to edit
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.redirect(`/student/edit-reservation?userId=${userId}&error=Reservation not found`);
    }

    // Check if user owns this reservation
    if (reservation.user_id.toString() !== userId) {
      return res.redirect(`/student/edit-reservation?userId=${userId}&error=You can only edit your own reservations`);
    }

    // Check if new reservation date is in the past
    const newReservationDateTime = new Date(reservation_date);
    newReservationDateTime.setHours(parseInt(time_slot.split(':')[0]));
    newReservationDateTime.setMinutes(parseInt(time_slot.split(':')[1]));
    
    if (newReservationDateTime < new Date()) {
      return res.redirect(`/student/edit-reservation?userId=${userId}&error=Cannot edit reservations for past dates`);
    }

    // Check if the new slot is already taken (excluding the current reservation)
    const conflictingReservation = await Reservation.findOne({
      laboratory,
      reservation_date: new Date(reservation_date),
      time_slot,
      seat_number: parseInt(seat_number),
      status: 'active',
      _id: { $ne: reservationId }
    });

    if (conflictingReservation) {
      return res.redirect(`/student/edit-reservation?userId=${userId}&error=The selected seat is already reserved for this time slot`);
    }

    // Check if new slot is blocked
    const blockedSlot = await ReservationSlot.findOne({
      laboratory,
      date: new Date(reservation_date),
      time_slot,
      seat_number: parseInt(seat_number),
      is_blocked: true
    });

    if (blockedSlot) {
      return res.redirect(`/student/edit-reservation?userId=${userId}&error=The selected seat is blocked for this time slot`);
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

    // Calculate new end time
    function addMinutes(time, mins) {
      const [h, m] = time.split(':').map(Number);
      const total = h * 60 + m + mins;
      const nh = Math.floor(total / 60);
      const nm = total % 60;
      return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
    }
    const end_time = addMinutes(time_slot, 30);

    // Update the reservation
    reservation.laboratory = laboratory;
    reservation.reservation_date = new Date(reservation_date);
    reservation.time_slot = time_slot;
    reservation.end_time = end_time;
    reservation.seat_number = parseInt(seat_number);
    reservation.purpose = purpose || '';
    reservation.description = description || '';
    reservation.is_anonymous = !!is_anonymous;

    await reservation.save();

    // Update or create new ReservationSlot
    let newSlot = await ReservationSlot.findOne({
      laboratory,
      date: new Date(reservation_date),
      time_slot,
      seat_number: parseInt(seat_number)
    });

    if (!newSlot) {
      newSlot = new ReservationSlot({
        laboratory,
        date: new Date(reservation_date),
        time_slot,
        seat_number: parseInt(seat_number),
        is_available: false,
        is_blocked: false,
        reserved_by: userId,
        reservation_id: reservation._id
      });
    } else {
      newSlot.is_available = false;
      newSlot.reserved_by = userId;
      newSlot.reservation_id = reservation._id;
    }

    await newSlot.save();

    console.log(`✅ Reservation updated: ${reservationId} for user ${userId}`);
    res.redirect(`/student/edit-reservation?userId=${userId}&success=Reservation updated successfully`);
  } catch (err) {
    console.error('[POST /student/edit-reservation]', err);
    res.redirect(`/student/edit-reservation?userId=${req.body.userId}&error=Failed to update reservation. Please try again.`);
  }
});

// Students are not allowed to delete reservations.

// Student profile page
router.get('/student/profile', async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to view your profile');
    }
    try {
        const user = await UserProfile.findById(userId).lean();
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }
        
        // Get user's active reservations from the Reservation collection
        const reservations = await Reservation.find({ 
            user_id: userId, 
            status: 'active' 
        }).sort({ reservation_date: 1, time_slot: 1 }).lean();
        
        console.log(`👤 Profile: Found ${reservations.length} active reservations for user ${userId}`);
        
        res.render('new-profile', { 
          title: 'Student Profile',
          style: 'new-profile.css',
          user, 
          userId, 
          reservations,
          canEdit: true,
          error: req.query.error,
          success: req.query.success
        });
    } catch (err) {
        console.error('[GET /student/profile]', err);
        res.status(500).send('Error loading profile');
    }
});

// View another user's public profile
router.get('/user/:userId/profile', async (req, res) => {
  const userId = req.params.userId;
  const currentUserId = req.query.currentUserId;
  
  if (!userId || typeof userId !== 'string' || userId.length !== 24) {
    return res.status(404).send('User not found');
  }

  try {
    const user = await UserProfile.findById(userId).populate('current_reservations').lean();
    if (!user) {
      return res.status(404).send('User not found');
    }
    
    const canEdit = currentUserId && currentUserId === userId;
    
    res.render('new-profile', { 
      title: `${user.name.first} ${user.name.last}'s Profile`,
      style: 'new-profile.css',
      user,
      canEdit,
      currentUserId
    });
  } catch (err) {
    console.error('[GET /user/:userId/profile]', err);
    res.status(500).send('Error loading public profile');
  }
});

// API endpoint to get available time slots or seats for a lab/date/time slot
router.get('/student/availability', async (req, res) => {
  try {
    const { laboratory, date, timeSlot, currentReservationId } = req.query;
    if (!laboratory || !date) {
      return res.json({ availableSlots: [], availableSeats: [] });
    }
    // If only lab and date are provided, return available time slots
    if (!timeSlot) {
      // List of all possible time slots
      const allTimeSlots = [
        '08:00', '08:30', '09:00', '09:30', '10:00',
        '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
        '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30', '18:00'
      ];
      // For each time slot, check if at least one seat is available
      const availableSlots = [];
      for (const slot of allTimeSlots) {
        // Find all reservations for this slot (excluding the current one if editing)
        const reservationQuery = {
          laboratory,
          reservation_date: new Date(date),
          time_slot: slot,
          status: 'active'
        };
        if (currentReservationId) {
          reservationQuery._id = { $ne: currentReservationId };
        }
        const reservations = await Reservation.find(reservationQuery);
        let takenSeats = reservations.map(r => r.seat_number);
        if (currentReservationId) {
          const currentRes = await Reservation.findById(currentReservationId);
          if (currentRes) {
            takenSeats = takenSeats.filter(seat => seat !== currentRes.seat_number);
          }
        }
        // Find blocked slots
        const blockedSlots = await ReservationSlot.find({
          laboratory,
          date: new Date(date),
          time_slot: slot,
          is_blocked: true
        });
        const blockedSeats = blockedSlots.map(s => s.seat_number);
        // All seats 1-35
        const allSeats = Array.from({ length: 35 }, (_, i) => i + 1);
        // Exclude taken and blocked seats
        const availableSeats = allSeats.filter(seat => !takenSeats.includes(seat) && !blockedSeats.includes(seat));
        if (availableSeats.length > 0) {
          // Add slot if at least one seat is available
          availableSlots.push({
            timeSlot: slot,
            endTime: addMinutes(slot, 30),
            availableSeats
          });
        }
      }
      return res.json({ availableSlots });
    }
    // If lab, date, and timeSlot are provided, return available seats
    // Find all reservations for this slot (excluding the current one if editing)
    const reservationQuery = {
      laboratory,
      reservation_date: new Date(date),
      time_slot: timeSlot,
      status: 'active'
    };
    if (currentReservationId) {
      reservationQuery._id = { $ne: currentReservationId };
    }
    const reservations = await Reservation.find(reservationQuery);
    let takenSeats = reservations.map(r => r.seat_number);
    if (currentReservationId) {
      const currentRes = await Reservation.findById(currentReservationId);
      if (currentRes) {
        takenSeats = takenSeats.filter(seat => seat !== currentRes.seat_number);
      }
    }
    // Find blocked slots
    const blockedSlots = await ReservationSlot.find({
      laboratory,
      date: new Date(date),
      time_slot: timeSlot,
      is_blocked: true
    });
    const blockedSeats = blockedSlots.map(s => s.seat_number);
    // All seats 1-35
    const allSeats = Array.from({ length: 35 }, (_, i) => i + 1);
    // Exclude taken and blocked seats
    const availableSeats = allSeats.filter(seat => !takenSeats.includes(seat) && !blockedSeats.includes(seat));
    return res.json({ availableSeats });
  } catch (err) {
    res.json({ availableSlots: [], availableSeats: [] });
  }
});




// Debug route to test database connection
router.get('/student/debug', async (req, res) => {
  const userId = req.session.userId;
  if (!userId || typeof userId !== 'string' || userId.length !== 24) {
    return res.json({ error: 'Missing or invalid userId' });
  }
  try {
    console.log(`🔍 Debug: Checking reservations for user ${userId}`);
    
    const user = await UserProfile.findById(userId);
    if (!user) {
      return res.json({ error: 'User not found', userId });
    }
    
    const reservations = await Reservation.find({ 
      user_id: userId, 
      status: 'active' 
    }).sort({ reservation_date: 1, time_slot: 1 });
    
    console.log(`📋 Debug: Found ${reservations.length} reservations for user ${userId}`);
    
    res.json({
      userId,
      userType: user.user_type,
      userCurrentReservations: user.current_reservations.length,
      databaseReservations: reservations.length,
      reservations: reservations.map(r => ({
        _id: r._id.toString(),
        laboratory: r.laboratory,
        reservation_date: r.reservation_date,
        time_slot: r.time_slot,
        seat_number: r.seat_number,
        status: r.status
      }))
    });
  } catch (err) {
    console.error('[GET /student/debug]', err);
    res.json({ error: err.message });
  }
});

router.post('/student/profile/delete', userController.deleteAccount);


module.exports = router;
