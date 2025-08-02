const { UserProfile } = require('../models/User');
const { Reservation } = require('../models/Reservation');
const { ReservationSlot } = require('../models/ReservationSlot');

// Utility function to add minutes to a time string (e.g., '08:00' + 30 = '08:30')
function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
}

exports.technicianHompage = async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to access your dashboard');
    }
    try {
        const user = await UserProfile.findById(userId).lean();
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }
        if (user.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }

        // Get all reservations for stats
        const allReservations = await Reservation.find({ status: 'active' }).populate('user_id', 'name email').lean();
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

        await logError(err, {
              route: req.originalUrl, 
              userId : req.session.userId
            });

        res.status(500).send('Error loading technician dashboard');
    }
};

exports.technicianProfile = async (req, res) => {

    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to view your profile');
    }
    try {
        const user = await UserProfile.findById(userId).lean();
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }
        if (user.user_type !== 'technician') {
            return res.redirect('/user-login?error=Access denied. Technician only.');
        }
        const reservations = await Reservation.find({ user_id: userId }).lean();
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

        await logError(err, {
              route: req.originalUrl, 
              userId : req.session.userId
            });

        res.status(500).send('Error loading profile');
    }

};


exports.getTechnicianReserve = async (req, res) => {

    const isAjax = req.query.ajax === '1';
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        if (isAjax) return res.status(401).json({ error: 'Not logged in', availableSlots: [] });
        return res.redirect('/user-login?error=Please log in to reserve for a student');
    }
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

        await logError(err, {
              route: req.originalUrl, 
              userId : req.session.userId
            });

        res.status(500).send('Error loading reserve page');
    }

};

exports.createTechnicianReserve = async (req, res) => {
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

        await logError(err, {
              route: req.originalUrl, 
              userId : req.session.userId
            }); 

        res.redirect(`/technician/reserve?error=Error creating reservation`);
    }
};

exports.blockSlotTechnician = async (req, res) => {
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

        await logError(err, {
              route: req.originalUrl, 
              userId : req.session.userId
            });

        res.status(500).send('Error loading block page');
    }
};

exports.getRemovePage = async (req, res) => {
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

        await logError(err, {
              route: req.originalUrl, 
              userId : req.session.userId
            });

        res.status(500).send('Error loading remove page');
    }
};

exports.removeReservation = async (req, res) => {

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

        await logError(err, {
              route: req.originalUrl, 
              userId : req.session.userId
            });

        res.redirect(`/technician/remove?error=Error removing reservation`);
    }

};

exports.editProfile = async (req, res) => {

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

        await logError(err, {
              route: req.originalUrl, 
              userId : req.session.userId
            });

        res.redirect(`/technician/profile?error=Error updating profile`);
    }

};

exports.checkAllReservations = async (req, res) => {

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

        await logError(err, {
              route: req.originalUrl, 
              userId : req.session.userId
            });

        res.status(500).send('Error loading reservations');
    }

};

exports.getEditReservePage = async (req, res) => {

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

        await logError(err, {
              route: req.originalUrl, 
              userId : req.session.userId
            });

        res.status(500).send('Error loading technician edit reservation page');
    }
    
};

exports.editReservation = async (req, res) => {

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

        await logError(err, {
              route: req.originalUrl, 
              userId : req.session.userId
            });

        res.redirect(`/technician/edit?error=Error updating reservation`);
    }

};

exports.deleteReservation = async (req, res) => {

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

        await logError(err, {
              route: req.originalUrl, 
              userId : req.session.userId
            });

        res.redirect(`/technician/edit?error=Error cancelling reservation`);
    }

};

exports.viewSlotsAvailable = async (req, res) => {

  try {
    const userId = req.session.userId;
    const { laboratory, date, timeSlot, currentReservationId } = req.query;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      return res.status(401).json({ availableSlots: [], availableSeats: [], error: 'Not logged in' });
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
    return res.json({ availableSeats, blockedSeats });
  } catch (err) {
    res.json({ availableSlots: [], availableSeats: [] });

    await logError(err, {
              route: req.originalUrl, 
              userId : req.session.userId
            });
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

    await logError(err, {
              route: req.originalUrl, 
              userId : req.session.userId
            });

    res.status(500).send('Error deleting account');
  }
};

