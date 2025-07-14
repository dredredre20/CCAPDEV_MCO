const express = require('express');
const router = express.Router();
const { Reservation } = require('../models/Reservation');
const { UserProfile } = require('../models/User');
const { ReservationSlot } = require('../models/ReservationSlot');
const userController = require('../controllers/userController');

// Technician homepage
router.get('/technician', async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to access your dashboard');
    }
    try {
        const user = await UserProfile.findById(userId);
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }
        if (user.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Get all reservations for stats
        const allReservations = await Reservation.find({ status: 'active' }).populate('user_id', 'name email');
        const totalReservations = allReservations.length;
        
        // Get active users (users with active reservations)
        const activeUsers = new Set(allReservations.map(r => r.user_id._id.toString())).size;
        
        // Get available labs (assuming 5 labs)
        const availableLabs = 5;
        
        // Get today's bookings
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = allReservations.filter(r => 
            new Date(r.reservation_date).toISOString().split('T')[0] === today
        ).length;

        // Get recent activity (last 10 reservations)
        const recentActivity = allReservations
            .sort((a, b) => new Date(b.reservation_date) - new Date(a.reservation_date))
            .slice(0, 10)
            .map(r => ({
                activityType: 'Reservation',
                activityIcon: 'calendar-plus',
                description: `Reservation for ${r.laboratory} seat ${r.seat_number}`,
                timestamp: r.reservation_date,
                user: r.user_id
            }));

        res.render('lab_technician_page', { 
            title: 'Technician Dashboard',
            style: 'lab_technician_page_design.css',
            userId,
            user,
            totalReservations,
            activeUsers,
            availableLabs,
            todayBookings,
            recentActivity,
            error: req.query.error,
            success: req.query.success
        });
    } catch (err) {
        console.error('[GET /technician]', err);
        res.status(500).send('Error loading technician dashboard');
    }
});

// Technician profile
router.get('/technician/profile', async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to view your profile');
    }
    try {
        const user = await UserProfile.findById(userId);
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }
        if (user.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }
        const reservations = await Reservation.find({ user_id: userId });
        res.render('labTech_profile', { 
            title: 'Technician Profile',
            style: 'labTech_profile.css',
            user, 
            tech: user, 
            reservations,
            userId,
            error: req.query.error,
            success: req.query.success
        });
    } catch (err) {
        console.error('[GET /technician/profile]', err);
        res.status(500).send('Error loading profile');
    }
});

// Reserve for student page
router.get('/technician/reserve', async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to reserve for a student');
    }
    try {
        const user = await UserProfile.findById(userId);
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }
        if (user.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Time slots array
        const timeSlots = [
            '08:00', '08:30', '09:00', '09:30', '10:00',
            '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
            '13:30', '14:00', '14:30', '15:00', '15:30',
            '16:00', '16:30', '17:00', '17:30', '18:00'
        ];

        const today = new Date().toISOString().split('T')[0];
        const { laboratory, date, time, ajax } = req.query;
        let availableSlots = [];
        let selectedTimeSlot = time || '';
        if (laboratory && date) {
            // Fetch all reservations and blocked slots for the selected lab and date
            const existingReservations = await Reservation.find({
                laboratory,
                reservation_date: date,
                status: 'active'
            });
            const blockedSlots = await ReservationSlot.find({
                laboratory,
                date: new Date(date),
                is_blocked: true
            });

            // Create a map of taken and blocked seats for each time slot
            const takenSlots = {};
            const blockedSeatsMap = {};
            existingReservations.forEach(reservation => {
                const key = `${reservation.time_slot}`;
                if (!takenSlots[key]) takenSlots[key] = [];
                takenSlots[key].push(reservation.seat_number);
            });
            blockedSlots.forEach(slot => {
                const key = `${slot.time_slot}`;
                if (!blockedSeatsMap[key]) blockedSeatsMap[key] = [];
                blockedSeatsMap[key].push(slot.seat_number);
            });

            // Generate available slots for each time slot
            timeSlots.forEach(timeSlot => {
                const takenSeats = takenSlots[timeSlot] || [];
                const blockedSeats = blockedSeatsMap[timeSlot] || [];
                const availableSeats = [];
                for (let seat = 1; seat <= 35; seat++) {
                    if (!takenSeats.includes(seat) && !blockedSeats.includes(seat)) {
                        availableSeats.push(seat);
                    }
                }
                availableSlots.push({
                    timeSlot,
                    availableSeats,
                    takenCount: takenSeats.length,
                    blockedSeats,
                    availableCount: availableSeats.length
                });
            });
        } else {
            // If no lab/date, just show empty availableSlots for all timeSlots
            availableSlots = timeSlots.map(timeSlot => ({
                timeSlot,
                availableSeats: [],
                takenCount: 0,
                blockedSeats: [],
                availableCount: 0
            }));
        }

        // If AJAX request, return JSON for dynamic UI
        if (ajax === '1') {
            return res.json({ availableSlots });
        }

        res.render('lab_technician_reserve', {
            title: 'Reserve for Student',
            style: 'lab_technician_reserve_design.css',
            userId,
            user,
            timeSlots,
            today,
            availableSlots,
            selectedLab: laboratory || '',
            selectedDate: date || today,
            selectedTimeSlot,
            error: req.query.error
        });
    } catch (err) {
        console.error('[GET /technician/reserve]', err);
        res.status(500).send('Error loading reserve page');
    }
});

// POST route for creating walk-in reservations
router.post('/technician/reserve', async (req, res) => {
    const userId = req.session.userId;
    const { laboratory, reservation_date, time, seat_numbers, anonymous } = req.body;
    
    // Validate technician ID
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to reserve for a student');
    }
    
    try {
        // Validate technician
        const technician = await UserProfile.findById(userId);
        if (!technician || technician.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Validate required fields
        if (!laboratory || !reservation_date || !time || !seat_numbers) {
            return res.redirect(`/technician/reserve?error=All fields are required`);
        }

        // Check if reservation date is in the past
        const reservationDateTime = new Date(reservation_date);
        reservationDateTime.setHours(parseInt(time.split(':')[0]));
        reservationDateTime.setMinutes(parseInt(time.split(':')[1]));
        
        if (reservationDateTime < new Date()) {
            return res.redirect(`/technician/reserve?error=Cannot make reservations for past dates`);
        }

        // Convert seat_numbers to array if it's a single value
        const seatNumbersArray = Array.isArray(seat_numbers) ? seat_numbers : [seat_numbers];

        // Check if seats are available
        const existingReservations = await Reservation.find({
            laboratory,
            reservation_date: new Date(reservation_date),
            time_slot: time,
            seat_number: { $in: seatNumbersArray },
            status: 'active'
        });

        if (existingReservations.length > 0) {
            const takenSeats = existingReservations.map(r => r.seat_number).join(', ');
            return res.redirect(`/technician/reserve?error=Seats ${takenSeats} are already taken for this time slot`);
        }

        // Check if seats are blocked
        const blockedSlots = await ReservationSlot.find({
            laboratory,
            date: new Date(reservation_date),
            time_slot: time,
            seat_number: { $in: seatNumbersArray },
            is_blocked: true
        });

        if (blockedSlots.length > 0) {
            const blockedSeats = blockedSlots.map(s => s.seat_number).join(', ');
            return res.redirect(`/technician/reserve?error=Seats ${blockedSeats} are blocked for this time slot`);
        }

        // Create reservations for each seat
        const reservations = [];
        for (const seatNumber of seatNumbersArray) {
            // Calculate end time
            const [hours, minutes] = time.split(':').map(Number);
            const endTime = new Date(new Date(reservation_date).setHours(hours, minutes + 30));
            const endTimeString = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
            
            const reservation = new Reservation({
                laboratory,
                reservation_date: new Date(reservation_date),
                time_slot: time,
                end_time: endTimeString,
                seat_number: parseInt(seatNumber),
                user_id: technician._id, // Always set user_id for tracking
                is_anonymous: anonymous || false,
                status: 'active',
                purpose: 'walk_in',
                description: 'Walk-in reservation created by technician'
            });
            reservations.push(reservation);
        }

        await Reservation.insertMany(reservations);

        // Update ReservationSlots for each seat
        for (let i = 0; i < reservations.length; i++) {
            const reservation = reservations[i];
            const seatNumber = seatNumbersArray[i];
            
            let slot = await ReservationSlot.findOne({
                laboratory,
                date: new Date(reservation_date),
                time_slot: time,
                seat_number: parseInt(seatNumber)
            });

            if (!slot) {
                slot = new ReservationSlot({
                    laboratory,
                    date: new Date(reservation_date),
                    time_slot: time,
                    seat_number: parseInt(seatNumber),
                    is_available: false,
                    is_blocked: false,
                    reserved_by: technician._id,
                    reservation_id: reservation._id
                });
            } else {
                slot.is_available = false;
                slot.reserved_by = technician._id;
                slot.reservation_id = reservation._id;
            }

            await slot.save();
        }

        // Update technician's current_reservations if not anonymous
        if (!anonymous) {
            if (!technician.current_reservations) {
                technician.current_reservations = [];
            }
            technician.current_reservations.push(...reservations.map(r => r._id));
            await technician.save();
        }

        res.redirect(`/technician/reserve?success=Reservation(s) created successfully`);
    } catch (err) {
        console.error('[POST /technician/reserve]', err);
        res.redirect(`/technician/reserve?error=Error creating reservation`);
    }
});

// Block time slot page
router.get('/technician/block', async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to block a time slot');
    }
    try {
        const user = await UserProfile.findById(userId);
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }

        if (user.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Time slots array
        const timeSlots = [
            '08:00', '08:30', '09:00', '09:30', '10:00',
            '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
            '13:30', '14:00', '14:30', '15:00', '15:30',
            '16:00', '16:30', '17:00', '17:30', '18:00'
        ];

        res.render('lab_technician_edit', { 
            title: 'Block Time Slot',
            style: 'lab_technician_edit.css',
            userId, 
            user,
            timeSlots,
            error: req.query.error
        });
    } catch (err) {
        console.error('[GET /technician/block]', err);
        res.status(500).send('Error loading block page');
    }
});

// Remove reservation page
router.get('/technician/remove', async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to remove a reservation');
    }
    try {
        const user = await UserProfile.findById(userId);
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }

        if (user.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Get all active reservations that are within 10 minutes of start time
        const now = new Date();
        const reservations = await Reservation.find({ status: 'active' })
            .populate('user_id', 'name email')
            .sort({ reservation_date: 1, time_slot: 1 });

        const removableReservations = reservations.filter(reservation => {
            const reservationTime = new Date(reservation.reservation_date);
            reservationTime.setHours(parseInt(reservation.time_slot.split(':')[0]));
            reservationTime.setMinutes(parseInt(reservation.time_slot.split(':')[1]));
            
            const diffInMinutes = (reservationTime - now) / (1000 * 60);
            return diffInMinutes >= -10 && diffInMinutes <= 10;
        });

        res.render('lab_technician_remove', { 
            title: 'Remove Reservations',
            style: 'lab_technician_remove_design.css',
            userId, 
            user,
            reservations: removableReservations,
            error: req.query.error,
            success: req.query.success
        });
    } catch (err) {
        console.error('[GET /technician/remove]', err);
        res.status(500).send('Error loading remove page');
    }
});

// POST route for removing reservations
router.post('/technician/remove', async (req, res) => {
    const userId = req.session.userId;
    const { reservationId } = req.body;
    
    try {
        // Validate technician
        const technician = await UserProfile.findById(userId);
        if (!technician || technician.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Validate required fields
        if (!reservationId) {
            return res.redirect(`/technician/remove?error=Reservation ID is required`);
        }

        // Find and update the reservation
        const reservation = await Reservation.findById(reservationId);
        if (!reservation) {
            return res.redirect(`/technician/remove?error=Reservation not found`);
        }

        // Check if reservation is within removable time window (10 minutes before/after)
        const now = new Date();
        const reservationTime = new Date(reservation.reservation_date);
        reservationTime.setHours(parseInt(reservation.time_slot.split(':')[0]));
        reservationTime.setMinutes(parseInt(reservation.time_slot.split(':')[1]));
        
        const diffInMinutes = (reservationTime - now) / (1000 * 60);
        if (diffInMinutes < -10 || diffInMinutes > 10) {
            return res.redirect(`/technician/remove?error=Can only remove reservations within 10 minutes of start time`);
        }

        // Mark reservation as cancelled
        reservation.status = 'cancelled';
        reservation.cancelled_by = technician._id;
        reservation.cancelled_at = new Date();
        await reservation.save();

        res.redirect(`/technician/remove?success=Reservation removed successfully`);
    } catch (err) {
        console.error('[POST /technician/remove]', err);
        res.redirect(`/technician/remove?error=Error removing reservation`);
    }
});

// POST route for editing technician profile
router.post('/technician/profile/edit', async (req, res) => {
    const userId = req.session.userId;
    const { description } = req.body;
    
    try {
        // Validate technician
        const technician = await UserProfile.findById(userId);
        if (!technician || technician.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Update profile description
        technician.profile_description = description || '';
        await technician.save();

        res.redirect(`/technician/profile?success=Profile updated successfully`);
    } catch (err) {
        console.error('[POST /technician/profile/edit]', err);
        res.redirect(`/technician/profile?error=Error updating profile`);
    }
});

// View all reservations (technician can see all)
router.get('/technician/reservations', async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to view all reservations');
    }
    try {
        const user = await UserProfile.findById(userId);
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }

        if (user.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        const reservations = await Reservation.find({ status: 'active' })
            .populate('user_id', 'name email')
            .sort({ reservation_date: 1, time_slot: 1 });

        res.render('lab_technician_page', { 
            title: 'All Reservations',
            style: 'lab_technician_page_design.css',
            userId, 
            user,
            allReservations: reservations,
            error: req.query.error
        });
    } catch (err) {
        console.error('[GET /technician/reservations]', err);
        res.status(500).send('Error loading reservations');
    }
});

// Technician edit reservation page
router.get('/technician/edit', async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to edit a reservation');
    }
    try {
        const technician = await UserProfile.findById(userId);
        if (!technician || technician.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }
        // Fetch all reservations created by this technician OR where technician is the user_id
        const reservations = await Reservation.find({
            $or: [
                { created_by: userId, status: 'active' },
                { user_id: userId, status: 'active' }
            ]
        }).sort({ reservation_date: 1, time_slot: 1 });
        
        res.render('lab_technician_edit', {
            title: 'Edit Reservation',
            style: 'lab_technician_edit.css',
            userId,
            reservations,
            user: technician,
            error: req.query.error,
            success: req.query.success
        });
    } catch (err) {
        console.error('[GET /technician/edit]', err);
        res.status(500).send('Error loading technician edit reservation page');
    }
});

// POST route for editing technician reservations
router.post('/technician/edit', async (req, res) => {
    const userId = req.session.userId;
    const { reservationId, laboratory, reservation_date, time_slot, seat_number } = req.body;
    let technician;
    try {
        // Validate technician
        technician = await UserProfile.findById(userId);
        if (!technician || technician.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Validate required fields
        if (!reservationId || !laboratory || !reservation_date || !time_slot || !seat_number) {
            return res.redirect(`/technician/edit?error=All fields are required`);
        }

        // Find the reservation to edit
        const reservation = await Reservation.findById(reservationId);
        if (!reservation) {
            return res.redirect(`/technician/edit?error=Reservation not found`);
        }

        // Check if the technician has permission to edit this reservation
        const canEdit = reservation.created_by?.toString() === userId || reservation.user_id?.toString() === userId;
        if (!canEdit) {
            return res.redirect(`/technician/edit?error=You can only edit your own reservations`);
        }

        // Check if the new slot is available (excluding the current reservation)
        const conflictingReservation = await Reservation.findOne({
            laboratory,
            reservation_date,
            time_slot,
            seat_number: parseInt(seat_number),
            status: 'active',
            _id: { $ne: reservationId }
        });

        if (conflictingReservation) {
            return res.redirect(`/technician/edit?error=The selected seat is already reserved for this time slot`);
        }

        // Update the reservation
        reservation.laboratory = laboratory;
        reservation.reservation_date = new Date(reservation_date);
        reservation.time_slot = time_slot;
        reservation.seat_number = parseInt(seat_number);
        
        await reservation.save();

        res.redirect(`/technician/edit?success=Reservation updated successfully`);
    } catch (err) {
        console.error('[POST /technician/edit]', err);
        res.redirect(`/technician/edit?error=Error updating reservation`);
    }
});

// POST route for deleting technician reservations
router.post('/technician/delete-reservation', async (req, res) => {
    const userId = req.session.userId;
    const { reservationId } = req.body;
    let technician;
    try {
        // Validate technician
        technician = await UserProfile.findById(userId);
        if (!technician || technician.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Validate required fields
        if (!reservationId) {
            return res.redirect(`/technician/edit?error=Reservation ID is required`);
        }

        // Find the reservation to delete
        const reservation = await Reservation.findById(reservationId);
        if (!reservation) {
            return res.redirect(`/technician/edit?error=Reservation not found`);
        }

        // Check if the technician has permission to delete this reservation
        const canDelete = reservation.created_by?.toString() === userId || reservation.user_id?.toString() === userId;
        if (!canDelete) {
            return res.redirect(`/technician/edit?error=You can only delete your own reservations`);
        }

        // Mark reservation as cancelled
        reservation.status = 'cancelled';
        reservation.cancelled_by = technician._id;
        reservation.cancelled_at = new Date();
        await reservation.save();

        res.redirect(`/technician/edit?success=Reservation cancelled successfully`);
    } catch (err) {
        console.error('[POST /technician/delete-reservation]', err);
        res.redirect(`/technician/edit?error=Error cancelling reservation`);
    }
});

// Technician seat and time slot availability endpoint (like /student/availability)
router.get('/technician/availability', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { laboratory, date, timeSlot, currentReservationId } = req.query;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      return res.status(401).json({ availableSeats: [], blockedSeats: [], error: 'Not logged in' });
    }
    if (!laboratory || !date || !timeSlot) {
      return res.json({ availableSeats: [], blockedSeats: [] });
    }
    // Get date as UTC to avoid timezone issues
    const utcDate = new Date(date);
    utcDate.setUTCHours(0, 0, 0, 0);
    // Find reservations excluding current one if editing
    const reservationQuery = {
      laboratory,
      reservation_date: utcDate,
      time_slot: timeSlot,
      status: 'active'
    };
    if (currentReservationId) {
      reservationQuery._id = { $ne: currentReservationId };
    }
    const reservations = await Reservation.find(reservationQuery);
    const takenSeats = reservations.map(r => r.seat_number);
    // Get blocked seats
    const blockedSlots = await ReservationSlot.find({
      laboratory,
      date: utcDate,
      time_slot: timeSlot,
      is_blocked: true
    });
    const blockedSeats = blockedSlots.map(s => s.seat_number);
    // Generate all seats
    const allSeats = Array.from({ length: 35 }, (_, i) => i + 1);
    // Get current reservation if editing
    let currentSeat = null;
    if (currentReservationId) {
      const currentRes = await Reservation.findById(currentReservationId);
      currentSeat = currentRes?.seat_number;
    }
    // Calculate available seats
    const availableSeats = allSeats.filter(seat => {
      if (currentSeat === seat) return true;
      return !takenSeats.includes(seat) && !blockedSeats.includes(seat);
    });
    res.json({ availableSeats, blockedSeats });
  } catch (err) {
    console.error('[GET /technician/availability]', err);
    res.json({ availableSeats: [], blockedSeats: [] });
  }
});

module.exports = router;
