const express = require('express');
const router = express.Router();
const { Reservation } = require('../models/Reservation');
const { UserProfile } = require('../models/User');
const { ReservationSlot } = require('../models/ReservationSlot');
const userController = require('../controllers/userController');

// Technician homepage
router.get('/technician', async (req, res) => {
    const userId = req.query.userId;
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
    const userId = req.query.userId;
    try {
        const user = await UserProfile.findById(userId);
        if (!user) {
            return res.redirect('/user-login?error=User not found');
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
    const userId = req.query.userId;
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

        res.render('lab_technician_reserve', { 
            title: 'Reserve for Student',
            style: 'lab_technician_reserve_design.css',
            userId, 
            user,
            timeSlots,
            error: req.query.error
        });
    } catch (err) {
        console.error('[GET /technician/reserve]', err);
        res.status(500).send('Error loading reserve page');
    }
});

// POST route for creating walk-in reservations
router.post('/technician/reserve', async (req, res) => {
    const { techId, laboratory, reservation_date, time, seat_numbers, anonymous } = req.body;
    
    try {
        // Validate technician
        const technician = await UserProfile.findById(techId);
        if (!technician || technician.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Validate required fields
        if (!laboratory || !reservation_date || !time || !seat_numbers) {
            return res.redirect(`/technician/reserve?techId=${techId}&error=All fields are required`);
        }

        // Convert seat_numbers to array if it's a single value
        const seatNumbersArray = Array.isArray(seat_numbers) ? seat_numbers : [seat_numbers];

        // Check if seats are available
        const existingReservations = await Reservation.find({
            laboratory,
            reservation_date,
            time_slot: time,
            seat_number: { $in: seatNumbersArray },
            status: 'active'
        });

        if (existingReservations.length > 0) {
            const takenSeats = existingReservations.map(r => r.seat_number).join(', ');
            return res.redirect(`/technician/reserve?techId=${techId}&error=Seats ${takenSeats} are already taken for this time slot`);
        }

        // Create reservations for each seat
        const reservations = [];
        for (const seatNumber of seatNumbersArray) {
            const reservation = new Reservation({
                laboratory,
                reservation_date,
                time_slot: time,
                seat_number: seatNumber,
                user_id: anonymous ? null : technician._id, // Anonymous reservations have no user
                created_by: technician._id, // Track who created it
                is_anonymous: anonymous || false,
                status: 'active',
                purpose: 'walk_in',
                description: 'Walk-in reservation created by technician'
            });
            reservations.push(reservation);
        }

        await Reservation.insertMany(reservations);

        res.redirect(`/technician/reserve?techId=${techId}&success=Reservation(s) created successfully`);
    } catch (err) {
        console.error('[POST /technician/reserve]', err);
        res.redirect(`/technician/reserve?techId=${techId}&error=Error creating reservation`);
    }
});

// Block time slot page
router.get('/technician/block', async (req, res) => {
    const userId = req.query.userId;
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
    const userId = req.query.userId;
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
    const { techId, reservationId } = req.body;
    
    try {
        // Validate technician
        const technician = await UserProfile.findById(techId);
        if (!technician || technician.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Validate required fields
        if (!reservationId) {
            return res.redirect(`/technician/remove?techId=${techId}&error=Reservation ID is required`);
        }

        // Find and update the reservation
        const reservation = await Reservation.findById(reservationId);
        if (!reservation) {
            return res.redirect(`/technician/remove?techId=${techId}&error=Reservation not found`);
        }

        // Check if reservation is within removable time window (10 minutes before/after)
        const now = new Date();
        const reservationTime = new Date(reservation.reservation_date);
        reservationTime.setHours(parseInt(reservation.time_slot.split(':')[0]));
        reservationTime.setMinutes(parseInt(reservation.time_slot.split(':')[1]));
        
        const diffInMinutes = (reservationTime - now) / (1000 * 60);
        if (diffInMinutes < -10 || diffInMinutes > 10) {
            return res.redirect(`/technician/remove?techId=${techId}&error=Can only remove reservations within 10 minutes of start time`);
        }

        // Mark reservation as cancelled
        reservation.status = 'cancelled';
        reservation.cancelled_by = technician._id;
        reservation.cancelled_at = new Date();
        await reservation.save();

        res.redirect(`/technician/remove?techId=${techId}&success=Reservation removed successfully`);
    } catch (err) {
        console.error('[POST /technician/remove]', err);
        res.redirect(`/technician/remove?techId=${techId}&error=Error removing reservation`);
    }
});

// POST route for editing technician profile
router.post('/technician/profile/edit', async (req, res) => {
    const { techId, description } = req.body;
    
    try {
        // Validate technician
        const technician = await UserProfile.findById(techId);
        if (!technician || technician.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Update profile description
        technician.profile_description = description || '';
        await technician.save();

        res.redirect(`/technician/profile?userId=${techId}&success=Profile updated successfully`);
    } catch (err) {
        console.error('[POST /technician/profile/edit]', err);
        res.redirect(`/technician/profile?userId=${techId}&error=Error updating profile`);
    }
});

// View all reservations (technician can see all)
router.get('/technician/reservations', async (req, res) => {
    const userId = req.query.userId;
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
    const techId = req.query.techId || req.query.userId;
    try {
        const technician = await UserProfile.findById(techId);
        if (!technician || technician.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }
        // Fetch all reservations created by this technician OR where technician is the user_id
        const reservations = await Reservation.find({
            $or: [
                { created_by: techId, status: 'active' },
                { user_id: techId, status: 'active' }
            ]
        }).sort({ reservation_date: 1, time_slot: 1 });
        
        res.render('lab_technician_edit', {
            title: 'Edit Reservation',
            style: 'lab_technician_edit.css',
            techId,
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
    const { techId, reservationId, laboratory, reservation_date, time_slot, seat_number } = req.body;
    
    try {
        // Validate technician
        const technician = await UserProfile.findById(techId);
        if (!technician || technician.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Validate required fields
        if (!reservationId || !laboratory || !reservation_date || !time_slot || !seat_number) {
            return res.redirect(`/technician/edit?techId=${techId}&error=All fields are required`);
        }

        // Find the reservation to edit
        const reservation = await Reservation.findById(reservationId);
        if (!reservation) {
            return res.redirect(`/technician/edit?techId=${techId}&error=Reservation not found`);
        }

        // Check if the technician has permission to edit this reservation
        const canEdit = reservation.created_by?.toString() === techId || reservation.user_id?.toString() === techId;
        if (!canEdit) {
            return res.redirect(`/technician/edit?techId=${techId}&error=You can only edit your own reservations`);
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
            return res.redirect(`/technician/edit?techId=${techId}&error=The selected seat is already reserved for this time slot`);
        }

        // Update the reservation
        reservation.laboratory = laboratory;
        reservation.reservation_date = new Date(reservation_date);
        reservation.time_slot = time_slot;
        reservation.seat_number = parseInt(seat_number);
        
        await reservation.save();

        res.redirect(`/technician/edit?techId=${techId}&success=Reservation updated successfully`);
    } catch (err) {
        console.error('[POST /technician/edit]', err);
        res.redirect(`/technician/edit?techId=${techId}&error=Error updating reservation`);
    }
});

// POST route for deleting technician reservations
router.post('/technician/delete-reservation', async (req, res) => {
    const { techId, reservationId } = req.body;
    
    try {
        // Validate technician
        const technician = await UserProfile.findById(techId);
        if (!technician || technician.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Validate required fields
        if (!reservationId) {
            return res.redirect(`/technician/edit?techId=${techId}&error=Reservation ID is required`);
        }

        // Find the reservation to delete
        const reservation = await Reservation.findById(reservationId);
        if (!reservation) {
            return res.redirect(`/technician/edit?techId=${techId}&error=Reservation not found`);
        }

        // Check if the technician has permission to delete this reservation
        const canDelete = reservation.created_by?.toString() === techId || reservation.user_id?.toString() === techId;
        if (!canDelete) {
            return res.redirect(`/technician/edit?techId=${techId}&error=You can only delete your own reservations`);
        }

        // Mark reservation as cancelled
        reservation.status = 'cancelled';
        reservation.cancelled_by = technician._id;
        reservation.cancelled_at = new Date();
        await reservation.save();

        res.redirect(`/technician/edit?techId=${techId}&success=Reservation cancelled successfully`);
    } catch (err) {
        console.error('[POST /technician/delete-reservation]', err);
        res.redirect(`/technician/edit?techId=${techId}&error=Error cancelling reservation`);
    }
});

module.exports = router;
