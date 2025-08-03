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


// Reserve for student page
router.get('/technician/reserve', authenticateUser, authorizeTechnician, async (req, res) => {
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
            today,
            availableSlots,
            selectedLab: laboratory || '',
            selectedDate: date || today,
            selectedTimeSlot,
            error: req.query.error
        });
    } catch (err) {
        console.error('[GET /technician/reserve]', err);
        if (isAjax) return res.status(500).json({ error: 'Server error', availableSlots: [] });
        res.status(500).send('Error loading reserve page');
    }
});

// AJAX endpoint for technician availability without authentication middleware
router.get('/technician/availability-ajax', async (req, res) => {
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
});

// POST route for creating walk-in reservations
router.post('/technician/reserve', authenticateUser, authorizeTechnician, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { laboratory, reservation_date, time, seat_numbers, anonymous } = req.body;
        
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
            seat_number: { $in: seatNumbersArray.map(Number) },
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
            seat_number: { $in: seatNumbersArray.map(Number) },
            is_blocked: true
        });

        if (blockedSlots.length > 0) {
            const blockedSeats = blockedSlots.map(s => s.seat_number).join(', ');
            return res.redirect(`/technician/reserve?error=Seats ${blockedSeats} are blocked for this time slot`);
        }

        // Create reservations for each seat
        const reservations = [];
        const createdReservationIds = [];
        
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
            
            const savedReservation = await reservation.save();
            reservations.push(savedReservation);
            createdReservationIds.push(savedReservation._id);
        }

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
            technician.current_reservations.push(...createdReservationIds);
            await technician.save();
        }

        res.redirect(`/technician/reserve?success=Reservation(s) created successfully for ${seatNumbersArray.length} seat(s)`);
    } catch (err) {
        console.error('[POST /technician/reserve]', err);
        await logErrorAsync(err, req);
        res.redirect(`/technician/reserve?error=Error creating reservation`);
    }
});

module.exports = router;