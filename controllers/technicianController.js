const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Reservation } = require('../models/Reservation');
const { UserProfile } = require('../models/User');
const { ReservationSlot } = require('../models/ReservationSlot');


const userController = require('../controllers/userController');


const { authenticateUser, authorizeTechnician } = require('../middleware/auth');
const { logErrorAsync } = require('../middleware/errorLogger');


// Utility function to add minutes to a time string (e.g., '08:00' + 30 = '08:30')
function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
}

exports.getTechDashboardData = async (req, res) => {

    const userId = req.session.userId;
    try {
        const user = await UserProfile.findById(userId).lean();
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.user_type !== 'technician') {
            return res.status(403).json({ error: 'Access denied. Technician only.' });
        }

        // Get all reservations for stats and display
        const allReservations = await Reservation.find({}).populate('user_id', 'name email').lean();
        // Convert populated user data to plain objects to avoid Handlebars prototype access warnings
        allReservations.forEach(reservation => {
            if (reservation.user_id && typeof reservation.user_id.toObject === 'function') {
                reservation.user_id = reservation.user_id.toObject({ getters: true, virtuals: true });
            }
        });
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

        res.json({
            totalReservations,
            activeUsers,
            availableLabs,
            todayBookings,
            recentActivity,
            allReservations
        });
    } catch (err) {
        console.error('[GET /technician/dashboard-data]', err);
        res.status(500).json({ error: 'Error loading dashboard data' });
    }

};


exports.getTechnicianPage = async (req, res) => {

    const userId = req.session.userId;
    try {
        const user = await UserProfile.findById(userId).lean();
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }
        if (user.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Get all reservations for stats and display
        const allReservations = await Reservation.find({}).populate('user_id', 'name email').lean();
        // Convert populated user data to plain objects to avoid Handlebars prototype access warnings
        allReservations.forEach(reservation => {
            if (reservation.user_id && typeof reservation.user_id.toObject === 'function') {
                reservation.user_id = reservation.user_id.toObject({ getters: true, virtuals: true });
            }
        });
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
            allReservations,
            error: req.query.error,
            success: req.query.success
        });
    } catch (err) {
        console.error('[GET /technician]', err);
        res.status(500).send('Error loading technician dashboard');
    }

};


exports.getTechnicianProfile = async (req, res) => {

    const userId = req.session.userId;
    try {
        const user = await UserProfile.findById(userId).lean();
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }
        if (user.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }
        // Fetch all reservations (not just those made by this technician)
        const reservations = await Reservation.find({})
            .populate('user_id', 'name email')
            .sort({ reservation_date: -1, time_slot: 1 }); // Sort by date descending (newest first)
        
        // Convert populated user data to plain objects to avoid Handlebars prototype access warnings
        reservations.forEach(reservation => {
            if (reservation.user_id && typeof reservation.user_id.toObject === 'function') {
                reservation.user_id = reservation.user_id.toObject({ getters: true, virtuals: true });
            }
            // Convert reservation_date to string for proper JSON serialization
            if (reservation.reservation_date instanceof Date) {
                reservation.reservation_date = reservation.reservation_date.toISOString();
            }
        });
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
    
};

exports.getReservePage = async (req, res) => {

    const isAjax = req.query.ajax === '1';
    const userId = req.session.userId;
    try {
        const user = await UserProfile.findById(userId);
        if (!user) {
            if (isAjax) return res.status(401).json({ error: 'User not found', availableSlots: [] });
            return res.redirect('/user-login?error=User not found');
        }
        if (user.user_type !== 'technician') {
            if (isAjax) return res.status(403).json({ error: 'Access denied. Technician only.', availableSlots: [] });
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
                    endTime: addMinutes(timeSlot, 30),
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
        if (isAjax) {
            console.log('[Technician Reserve] AJAX request with params:', { laboratory, date });
            return res.json({ availableSlots });
        }

        res.render('lab_technician_reserve', {
            title: 'Reserve for Student',
            style: 'lab_technician_reserve_design.css',
            userId,
            user,
            timeSlots,
            today: new Date().toISOString().split('T')[0],
            availableSlots,
            selectedLab: laboratory || '',
            selectedDate: date || new Date().toISOString().split('T')[0],
            selectedTimeSlot,
            error: req.query.error
        });
    } catch (err) {
        console.error('[GET /technician/reserve]', err);
        if (isAjax) return res.status(500).json({ error: 'Server error', availableSlots: [] });
        res.status(500).send('Error loading reserve page');
    }

};


exports.getAvailabilityAjax = async (req, res) => {

    try {
        const { laboratory, date, timeSlot } = req.query;
        console.log('[Technician Availability AJAX] Request params:', { laboratory, date, timeSlot });
        
        if (!laboratory || !date) {
            return res.json({ availableSlots: [], availableSeats: [] });
        }
        
        // If only lab and date are provided, return available time slots
        if (!timeSlot) {
            const allTimeSlots = [
                '08:00', '08:30', '09:00', '09:30', '10:00',
                '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
                '13:30', '14:00', '14:30', '15:00', '15:30',
                '16:00', '16:30', '17:00', '17:30', '18:00'
            ];
            const availableSlots = [];
            for (const slot of allTimeSlots) {
                const reservationQuery = {
                    laboratory,
                    reservation_date: new Date(date),
                    time_slot: slot,
                    status: 'active'
                };
                const reservations = await Reservation.find(reservationQuery);
                const takenSeats = reservations.map(r => r.seat_number);
                const blockedSlots = await ReservationSlot.find({
                    laboratory,
                    date: new Date(date),
                    time_slot: slot,
                    is_blocked: true
                });
                const blockedSeats = blockedSlots.map(s => s.seat_number);
                const allSeats = Array.from({ length: 35 }, (_, i) => i + 1);
                const availableSeats = allSeats.filter(seat => !takenSeats.includes(seat) && !blockedSeats.includes(seat));
                if (availableSeats.length > 0) {
                    availableSlots.push({
                        timeSlot: slot,
                        endTime: addMinutes(slot, 30),
                        availableSeats
                    });
                }
            }
            console.log('[Technician Availability AJAX] Returning time slots:', availableSlots.length);
            return res.json({ availableSlots });
        }
        
        // If lab, date, and timeSlot are provided, return available seats
        const reservationQuery = {
            laboratory,
            reservation_date: new Date(date),
            time_slot: timeSlot,
            status: 'active'
        };
        const reservations = await Reservation.find(reservationQuery);
        const takenSeats = reservations.map(r => r.seat_number);
        const blockedSlots = await ReservationSlot.find({
            laboratory,
            date: new Date(date),
            time_slot: timeSlot,
            is_blocked: true
        });
        const blockedSeats = blockedSlots.map(s => s.seat_number);
        const allSeats = Array.from({ length: 35 }, (_, i) => i + 1);
        const availableSeats = allSeats.filter(seat => !takenSeats.includes(seat) && !blockedSeats.includes(seat));
        console.log('[Technician Availability AJAX] Returning seats:', { availableSeats: availableSeats.length, blockedSeats: blockedSeats.length });
        return res.json({ availableSeats, blockedSeats });
    } catch (err) {
        console.error('[Technician Availability AJAX] Error:', err);
        res.json({ availableSlots: [], availableSeats: [] });
    }
    
};


exports.postReservation = async (req, res) => {

        // Check if MongoDB supports transactions (replica set or mongos)
    const isStandalone = mongoose.connection.readyState && !mongoose.connection.host.includes('replica') && !mongoose.connection.host.includes('mongos');
    
    let session;
    if (!isStandalone) {
        session = await mongoose.startSession();
        session.startTransaction();
    }
    
    try {
        const userId = req.session.userId;
        const { laboratory, reservation_date, time, seat_numbers, anonymous } = req.body;
        
        // Validate technician
        const technician = session ? await UserProfile.findById(userId).session(session) : await UserProfile.findById(userId);
        if (!technician || technician.user_type !== 'technician') {
            if (session) {
                await session.abortTransaction();
                session.endSession();
            }
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Validate required fields
        if (!laboratory || !reservation_date || !time || !seat_numbers) {
            if (session) {
                await session.abortTransaction();
                session.endSession();
            }
            return res.redirect(`/technician/reserve?error=All fields are required`);
        }

        // Check if reservation date is in the past
        const reservationDateTime = new Date(reservation_date);
        reservationDateTime.setHours(parseInt(time.split(':')[0]));
        reservationDateTime.setMinutes(parseInt(time.split(':')[1]));
        
        if (reservationDateTime < new Date()) {
            if (session) {
                await session.abortTransaction();
                session.endSession();
            }
            return res.redirect(`/technician/reserve?error=Cannot make reservations for past dates`);
        }

        // Convert seat_numbers to array if it's a single value
        const seatNumbersArray = Array.isArray(seat_numbers) ? seat_numbers : [seat_numbers];

        // Check if seats are available using a single query with session
        const existingReservations = session ? 
            await Reservation.find({
                laboratory,
                reservation_date: new Date(reservation_date),
                time_slot: time,
                seat_number: { $in: seatNumbersArray.map(Number) },
                status: 'active'
            }).session(session) :
            await Reservation.find({
                laboratory,
                reservation_date: new Date(reservation_date),
                time_slot: time,
                seat_number: { $in: seatNumbersArray.map(Number) },
                status: 'active'
            });

        if (existingReservations.length > 0) {
            const takenSeats = existingReservations.map(r => r.seat_number).join(', ');
            if (session) {
                await session.abortTransaction();
                session.endSession();
            }
            return res.redirect(`/technician/reserve?error=Seats ${takenSeats} are already taken for this time slot`);
        }

        // Check if seats are blocked
        const blockedSlots = session ?
            await ReservationSlot.find({
                laboratory,
                date: new Date(reservation_date),
                time_slot: time,
                seat_number: { $in: seatNumbersArray.map(Number) },
                is_blocked: true
            }).session(session) :
            await ReservationSlot.find({
                laboratory,
                date: new Date(reservation_date),
                time_slot: time,
                seat_number: { $in: seatNumbersArray.map(Number) },
                is_blocked: true
            });

        if (blockedSlots.length > 0) {
            const blockedSeats = blockedSlots.map(s => s.seat_number).join(', ');
            if (session) {
                await session.abortTransaction();
                session.endSession();
            }
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
                is_anonymous: anonymous === 'on' || anonymous === true,
                status: 'active',
                purpose: 'walk_in',
                description: 'Walk-in reservation created by technician'
            });
            reservations.push(reservation);
        }

        if (session) {
            await Reservation.insertMany(reservations, { session });
        } else {
            await Reservation.insertMany(reservations);
        }

        // Update ReservationSlots for each seat
        for (let i = 0; i < reservations.length; i++) {
            const reservation = reservations[i];
            const seatNumber = seatNumbersArray[i];
            
            let slot = session ?
                await ReservationSlot.findOne({
                    laboratory,
                    date: new Date(reservation_date),
                    time_slot: time,
                    seat_number: parseInt(seatNumber)
                }).session(session) :
                await ReservationSlot.findOne({
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

            if (session) {
                await slot.save({ session });
            } else {
                await slot.save();
            }
        }

        // Update technician's current_reservations if not anonymous
        if (!(anonymous === 'on' || anonymous === true)) {
            if (!technician.current_reservations) {
                technician.current_reservations = [];
            }
            technician.current_reservations.push(...reservations.map(r => r._id));
            if (session) {
                await technician.save({ session });
            } else {
                await technician.save();
            }
        }

        if (session) {
            await session.commitTransaction();
            session.endSession();
        }
        res.redirect(`/technician/reserve?success=Reservation(s) created successfully`);
    } catch (err) {
        console.error('[POST /technician/reserve]', err);
        await logErrorAsync(err, req);
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        res.redirect(`/technician/reserve?error=Error creating reservation`);
    }

};


exports.getBlock = async (req, res) => {

    const userId = req.session.userId;
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
    
};

exports.getRemoveReservation = async (req, res) => {

    const userId = req.session.userId;
    try {
        const user = await UserProfile.findById(userId);
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }

        if (user.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Get all active reservations made by technician and students
        const now = new Date();
        const reservations = await Reservation.find({ status: 'active' })
            .populate('user_id', 'name email user_type')
            .sort({ reservation_date: 1, time_slot: 1 });

        // Convert populated user data to plain objects to avoid Handlebars prototype access warnings
        reservations.forEach(reservation => {
            if (reservation.user_id && typeof reservation.user_id.toObject === 'function') {
                reservation.user_id = reservation.user_id.toObject({ getters: true, virtuals: true });
            }
        });

        res.render('lab_technician_remove', { 
            title: 'Remove Reservations',
            style: 'lab_technician_remove_design.css',
            techId: userId, 
            user,
            reservations: reservations,
            error: req.query.error,
            success: req.query.success
        });
    } catch (err) {
        console.error('[GET /technician/remove]', err);
        res.status(500).send('Error loading remove page');
    }


};


exports.postRemoval = async (req, res) => {

    const userId = req.session.userId;
    const { reservationId } = req.body;
    
    try {
        // Validate technician
        const technician = await UserProfile.findById(userId);

        // Validate required fields
        if (!reservationId) {
            return res.redirect(`/technician/remove?error=Reservation ID is required`);
        }

        // Find the reservation
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

        // Release the reservation slot
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

        // Delete the reservation from the database
        await Reservation.findByIdAndDelete(reservationId);

        res.redirect(`/technician/remove?success=Reservation removed successfully`);
    } catch (err) {
        console.error('[POST /technician/remove]', err);
        res.redirect(`/technician/remove?error=Error removing reservation`);
    }
    
};


exports.postProfileEdited = async (req, res) => {

    const userId = req.session.userId;
    const { first, last, email, description } = req.body;
    
    try {
        // Validate technician
        const technician = await UserProfile.findById(userId);
        if (!technician) {
            return res.redirect('/user-login?error=User not found');
        }

        // Update profile information
        if (first) technician.name.first = first;
        if (last) technician.name.last = last;
        if (email) technician.email = email;
        technician.profile_description = description || '';
        
        // Update profile picture if uploaded
        if (req.file) {
            const sharp = require('sharp');
            technician.profile_picture.data = await sharp(req.file.buffer)
                .resize(300) // Width 300px, height auto
                .toBuffer();
            technician.profile_picture.contentType = req.file.mimetype;
        }
        
        await technician.save();

        res.redirect(`/technician/profile?success=Profile updated successfully`);
    } catch (err) {
        console.error('[POST /technician/profile/edit]', err);
        res.redirect(`/technician/profile?error=Error updating profile`);
    }

};


exports.viewAllReservations = async (req, res) => {

    const userId = req.session.userId;
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

        // Convert populated user data to plain objects to avoid Handlebars prototype access warnings
        reservations.forEach(reservation => {
            if (reservation.user_id && typeof reservation.user_id.toObject === 'function') {
                reservation.user_id = reservation.user_id.toObject({ getters: true, virtuals: true });
            }
        });

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
    
};

exports.getEditPage = async (req, res) => {

    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to edit a reservation');
    }
    try {
        const technician = await UserProfile.findById(userId);
        if (!technician || technician.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }
        // Fetch all reservations (both student and technician)
        const reservations = await Reservation.find({})
            .populate('user_id', 'name email user_type')
            .sort({ reservation_date: -1, time_slot: 1 }); // Sort by date descending (newest first)
        
        // Convert populated user data to plain objects to avoid Handlebars prototype access warnings
        reservations.forEach(reservation => {
            if (reservation.user_id && typeof reservation.user_id.toObject === 'function') {
                reservation.user_id = reservation.user_id.toObject({ getters: true, virtuals: true });
            }
            // Convert reservation_date to string for proper JSON serialization
            if (reservation.reservation_date instanceof Date) {
                reservation.reservation_date = reservation.reservation_date.toISOString();
            }
        });
        
        // Calculate statistics for all reservations
        const totalReservations = reservations.length;
        const activeReservations = reservations.filter(r => r.status === 'active').length;
        const cancelledReservations = reservations.filter(r => r.status === 'cancelled').length;
        
        // Calculate this month's reservations
        const now = new Date();
        const thisMonthReservations = reservations.filter(r => 
            new Date(r.reservation_date).getMonth() === now.getMonth() && 
            new Date(r.reservation_date).getFullYear() === now.getFullYear()
        ).length;
        
        res.render('lab_technician_edit', {
            title: 'Edit Reservation',
            style: 'lab_technician_edit.css',
            techId: userId, // Use techId to match the view
            reservations,
            totalReservations,
            activeReservations,
            cancelledReservations,
            thisMonthReservations,
            user: technician,
            error: req.query.error,
            success: req.query.success
        });
    } catch (err) {
        console.error('[GET /technician/edit]', err);
        res.status(500).send('Error loading technician edit reservation page');
    }

};


exports.postEditReservation = async (req, res) => {

    const userId = req.session.userId;
    const { reservationId, laboratory, reservation_date, time_slot, seat_number } = req.body;
    let technician;
    try {
        // Validate technician
        technician = await UserProfile.findById(userId);
        if (!technician || technician.user_type !== 'technician') {
            // Check if it's an AJAX request
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(403).json({ error: 'Access denied. Technician only.' });
            }
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Validate required fields
        if (!reservationId || !laboratory || !reservation_date || !time_slot || !seat_number) {
            // Check if it's an AJAX request
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(400).json({ error: 'All fields are required' });
            }
            return res.redirect(`/technician/edit?error=All fields are required`);
        }

        // Find the reservation to edit
        const reservation = await Reservation.findById(reservationId);
        if (!reservation) {
            // Check if it's an AJAX request
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(404).json({ error: 'Reservation not found' });
            }
            return res.redirect(`/technician/edit?error=Reservation not found`);
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
            // Check if it's an AJAX request
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(409).json({ error: 'The selected seat is already reserved for this time slot' });
            }
            return res.redirect(`/technician/edit?error=The selected seat is already reserved for this time slot`);
        }

        // Update the reservation
        reservation.laboratory = laboratory;
        reservation.reservation_date = new Date(reservation_date);
        reservation.time_slot = time_slot;
        reservation.seat_number = parseInt(seat_number);
        
        await reservation.save();

        // Check if it's an AJAX request
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            // Return updated reservation data
            const updatedReservation = await Reservation.findById(reservationId)
                .populate('user_id', 'name email')
                .lean();
            
            // Convert populated user data to plain objects
            if (updatedReservation.user_id && typeof updatedReservation.user_id.toObject === 'function') {
                updatedReservation.user_id = updatedReservation.user_id.toObject({ getters: true, virtuals: true });
            }
            
            // Calculate updated statistics
            const allReservations = await Reservation.find({}).lean();
            const activeReservations = allReservations.filter(r => r.status === 'active').length;
            const cancelledReservations = allReservations.filter(r => r.status === 'cancelled').length;
            
            // Calculate this month's reservations
            const now = new Date();
            const thisMonthReservations = allReservations.filter(r => 
                new Date(r.reservation_date).getMonth() === now.getMonth() && 
                new Date(r.reservation_date).getFullYear() === now.getFullYear()
            ).length;
            
            return res.json({ 
                success: true, 
                message: 'Reservation updated successfully',
                reservation: updatedReservation,
                statistics: {
                    totalReservations: allReservations.length,
                    activeReservations: activeReservations,
                    cancelledReservations: cancelledReservations,
                    thisMonthReservations: thisMonthReservations
                }
            });
        }

        res.redirect(`/technician/edit?success=Reservation updated successfully`);
    } catch (err) {
        console.error('[POST /technician/edit]', err);
        // Check if it's an AJAX request
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ error: 'Error updating reservation' });
        }
        res.redirect(`/technician/edit?error=Error updating reservation`);
    }
    
};


exports.postDeletedReservation = async (req, res) => {

    const userId = req.session.userId;
    const { reservationId } = req.body;
    
    try {
        // Validate technician
        const technician = await UserProfile.findById(userId);
        if (!technician || technician.user_type !== 'technician') {
            // Check if it's an AJAX request
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(403).json({ error: 'Access denied. Technician only.' });
            }
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Validate required fields
        if (!reservationId) {
            // Check if it's an AJAX request
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(400).json({ error: 'Reservation ID is required' });
            }
            return res.redirect(`/technician/edit?error=Reservation ID is required`);
        }

        // Find the reservation to delete
        const reservation = await Reservation.findById(reservationId);
        if (!reservation) {
            // Check if it's an AJAX request
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(404).json({ error: 'Reservation not found' });
            }
            return res.redirect(`/technician/edit?error=Reservation not found`);
        }

        // Release the slot
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

        // Delete the reservation from the database
        await Reservation.findByIdAndDelete(reservationId);

        // Check if it's an AJAX request
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            // Calculate updated statistics
            const allReservations = await Reservation.find({}).lean();
            const activeReservations = allReservations.filter(r => r.status === 'active').length;
            const cancelledReservations = allReservations.filter(r => r.status === 'cancelled').length;
            
            // Calculate this month's reservations
            const now = new Date();
            const thisMonthReservations = allReservations.filter(r => 
                new Date(r.reservation_date).getMonth() === now.getMonth() && 
                new Date(r.reservation_date).getFullYear() === now.getFullYear()
            ).length;
            
            return res.json({ 
                success: true, 
                message: 'Reservation deleted successfully',
                statistics: {
                    totalReservations: allReservations.length,
                    activeReservations: activeReservations,
                    cancelledReservations: cancelledReservations,
                    thisMonthReservations: thisMonthReservations
                }
            });
        }

        res.redirect(`/technician/edit?success=Reservation deleted successfully`);
    } catch (err) {
        console.error('[POST /technician/delete-reservation]', err);
        // Check if it's an AJAX request
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ error: 'Error deleting reservation' });
        }
        res.redirect(`/technician/edit?error=Error deleting reservation`);
    }
    
};

exports.getViewAvailability = async (req, res) => {

    try {
    const userId = req.session.userId;
    const { laboratory, date, timeSlot, currentReservationId } = req.query;
    console.log('[Technician Availability] Request params:', { laboratory, date, timeSlot, currentReservationId });
    
    // Allow AJAX requests without full authentication for availability checking
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      // For AJAX availability checking, we can proceed without full user authentication
      // but we still need to validate the required parameters
      if (!laboratory || !date) {
        return res.json({ availableSlots: [], availableSeats: [] });
      }
    }
    
    if (!laboratory || !date) {
      return res.json({ availableSlots: [], availableSeats: [] });
    }
    // If only lab and date are provided, return available time slots
    if (!timeSlot) {
      const allTimeSlots = [
        '08:00', '08:30', '09:00', '09:30', '10:00',
        '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
        '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30', '18:00'
      ];
      const availableSlots = [];
      for (const slot of allTimeSlots) {
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
        const blockedSlots = await ReservationSlot.find({
          laboratory,
          date: new Date(date),
          time_slot: slot,
          is_blocked: true
        });
        const blockedSeats = blockedSlots.map(s => s.seat_number);
        const allSeats = Array.from({ length: 35 }, (_, i) => i + 1);
        const availableSeats = allSeats.filter(seat => !takenSeats.includes(seat) && !blockedSeats.includes(seat));
        if (availableSeats.length > 0) {
          availableSlots.push({
            timeSlot: slot,
            endTime: addMinutes(slot, 30),
            availableSeats
          });
        }
      }
      console.log('[Technician Availability] Returning time slots:', availableSlots.length);
      return res.json({ availableSlots });
    }
    // If lab, date, and timeSlot are provided, return available seats
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
    const blockedSlots = await ReservationSlot.find({
      laboratory,
      date: new Date(date),
      time_slot: timeSlot,
      is_blocked: true
    });
    const blockedSeats = blockedSlots.map(s => s.seat_number);
    const allSeats = Array.from({ length: 35 }, (_, i) => i + 1);
    const availableSeats = allSeats.filter(seat => !takenSeats.includes(seat) && !blockedSeats.includes(seat));
    console.log('[Technician Availability] Returning seats:', { availableSeats: availableSeats.length, blockedSeats: blockedSeats.length });
    return res.json({ availableSeats, blockedSeats });
  } catch (err) {
    console.error('[Technician Availability] Error:', err);
    res.json({ availableSlots: [], availableSeats: [] });
  }

};


exports.getProfilePicture = async (req, res) => {

  try {
    const user = await UserProfile.findById(req.params.userId);
    
    if (!user || !user.profile_picture || !user.profile_picture.data) {
      return res.status(404).send('Image not found');
    }
    
    res.set('Content-Type', user.profile_picture.contentType);
    res.send(user.profile_picture.data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving image');
  }

};

exports.deleteAccount = async (req, res) => {

  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/user-login?error=User not found');
    
    // Delete all reservations associated with this user
    await Reservation.deleteMany({ user_id: userId });
    
    // Release all reservation slots reserved by this user
    await ReservationSlot.updateMany(
      { reserved_by: userId },
      {
        $set: {
          is_available: true,
          reserved_by: null,
          reservation_id: null
        }
      }
    );
    
    // Delete the user account
    const deletedUser = await UserProfile.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return res.redirect('/user-login?error=User not found');
    }
    
    // Destroy session after successful deletion
    req.session.destroy(() => {
      res.redirect('/user-login?success=Account deleted successfully');
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting account');
  }    

};
