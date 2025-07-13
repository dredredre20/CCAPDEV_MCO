const express = require('express');
const router = express.Router();
const { Reservation } = require('../models/Reservation');
const { UserProfile } = require('../models/User');
const userController = require('../controllers/userController');

// Student homepage
router.get('/student', async (req, res) => {
    const userId = req.query.userId;
    try {
        const user = await UserProfile.findById(userId).populate('current_reservations');
        if (!user) {
            return res.status(404).send('User not found');
        }

        // Get user's reservations
        const reservations = user.current_reservations || [];
        
        // Calculate dashboard stats
        const upcomingCount = reservations.filter(r => 
            new Date(r.reservation_date) >= new Date()
        ).length;
        
        const labCount = new Set(reservations.map(r => r.laboratory)).size;
        
        const totalHours = reservations.length * 0.5; // 30 minutes per reservation
        
        // Get recent reservations (last 5)
        const recentReservations = reservations
            .sort((a, b) => new Date(b.reservation_date) - new Date(a.reservation_date))
            .slice(0, 5);

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
  const userId = req.query.userId;
  try {
    const user = await UserProfile.findById(userId);
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
    const { userId, laboratory, reservation_date, time_slot, seat_number, purpose, description, is_anonymous } = req.body;
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
      reservation_date,
      time_slot,
      end_time,
      seat_number,
      purpose,
      description,
      is_anonymous: !!is_anonymous,
      status: 'active'
    });
    await reservation.save();
    res.redirect(`/student?userId=${userId}&success=Reservation created successfully`);
  } catch (err) {
    console.error('[POST /student/reserve]', err);
    res.redirect(`/student/reserve?userId=${req.body.userId}&error=Failed to create reservation. Please try again.`);
  }
});

// Edit reservations page
router.get('/student/edit-reservation', async (req, res) => {
  const userId = req.query.userId;
  try {
    const user = await UserProfile.findById(userId);
    if (!user) {
      return res.redirect('/user-login?error=User not found');
    }
    // Fetch all reservations for this student from the Reservation collection
    const reservations = await Reservation.find({ user_id: userId, status: 'active' }).sort({ reservation_date: 1, time_slot: 1 });
    const formattedReservations = reservations.map(res => ({
      _id: res._id.toString(),
      laboratory: res.laboratory,
      reservation_date: res.reservation_date instanceof Date ? res.reservation_date.toISOString().split('T')[0] : res.reservation_date,
      time_slot: res.time_slot,
      seat_number: res.seat_number
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

// Student profile page
router.get('/student/profile', async (req, res) => {
    const userId = req.query.userId;
    try {
        const user = await UserProfile.findById(userId).populate('current_reservations');
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }
        
        const reservations = user.current_reservations || [];
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
  
  try {
    const user = await UserProfile.findById(userId).populate('current_reservations');
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

// API endpoint for dynamic availability
router.get('/student/availability', async (req, res) => {
  const { laboratory, date, timeSlot } = req.query;
  if (!laboratory || !date) return res.json({ availableSlots: [], availableSeats: [] });

  // All possible time slots
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00',
    '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
    '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  // Find all reservations for this lab/date
  const reservations = await Reservation.find({
    laboratory,
    reservation_date: date,
    status: 'active'
  });

  // Map: timeSlot -> taken seats
  const taken = {};
  reservations.forEach(r => {
    if (!taken[r.time_slot]) taken[r.time_slot] = [];
    taken[r.time_slot].push(r.seat_number);
  });

  // If timeSlot is specified, return available seats for that slot
  if (timeSlot) {
    const takenSeats = taken[timeSlot] || [];
    const availableSeats = [];
    for (let seat = 1; seat <= 35; seat++) {
      if (!takenSeats.includes(seat)) availableSeats.push(seat);
    }
    return res.json({ availableSeats });
  }

  // Otherwise, return available slots and their available seats count
  const availableSlots = timeSlots.map(slot => {
    const takenSeats = taken[slot] || [];
    const availableSeats = [];
    for (let seat = 1; seat <= 35; seat++) {
      if (!takenSeats.includes(seat)) availableSeats.push(seat);
    }
    return {
      timeSlot: slot,
      endTime: addMinutes(slot, 30),
      availableCount: availableSeats.length
    };
  }).filter(slot => slot.availableCount > 0);

  res.json({ availableSlots });
});

// Helper to add minutes to a time string
function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
}

module.exports = router;
