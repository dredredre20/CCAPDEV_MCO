const express = require('express');
const router = express.Router();
const { UserProfile } = require('../models/User');
const { Reservation } = require('../models/Reservation');

// Middleware to verify faculty access
const verifyFacultyAccess = async (req, res, next) => {
  const userId = req.query.userId || req.body.userId;
  
  if (!userId) {
    return res.status(401).send('User ID required');
  }
  
  try {
    const user = await UserProfile.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    
    if (user.user_type !== 'faculty') {
      return res.status(403).send('Access denied. Faculty access only.');
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.error('[Faculty Access Verification]', err);
    res.status(500).send('Authentication error');
  }
};

// Faculty dashboard page
router.get('/faculty', verifyFacultyAccess, async (req, res) => {
  try {
    const user = req.user;

    const reservations = user.current_reservations || [];
    
    // Calculate dashboard statistics
    const upcomingCount = reservations.filter(r => new Date(r.reservation_date) >= new Date()).length;
    const classCount = reservations.filter(r => r.reservation_type === 'class').length;
    const labCount = new Set(reservations.map(r => r.laboratory)).size;
    
    // Get recent reservations (last 5)
    const recentReservations = reservations
      .sort((a, b) => new Date(b.reservation_date) - new Date(a.reservation_date))
      .slice(0, 5)
      .map(res => ({
        ...res.toObject(),
        time_slot_display: getTimeSlotDisplay(res.time_slot)
      }));
    
    // Generate week schedule
    const weekSchedule = generateWeekSchedule(reservations);

    res.render('faculty-dashboard', { 
      user,
      userId: user._id,
      reservations,
      upcomingCount,
      classCount,
      labCount,
      recentReservations,
      weekSchedule
    });
  } catch (err) {
    console.error('[GET /faculty]', err);
    res.status(500).send('Error loading faculty page');
  }
});

// Helper function to get time slot display
function getTimeSlotDisplay(timeSlot) {
  const slotMapping = {
    '08:00': '08:00 - 08:30',
    '08:30': '08:30 - 09:00',
    '09:00': '09:00 - 09:30',
    '09:30': '09:30 - 10:00',
    '10:00': '10:00 - 10:30',
    '10:30': '10:30 - 11:00',
    '11:00': '11:00 - 11:30',
    '11:30': '11:30 - 12:00',
    '12:00': '12:00 - 12:30',
    '12:30': '12:30 - 01:00',
    '01:00': '01:00 - 01:30'
  };
  return slotMapping[timeSlot] || timeSlot;
}

// Helper function to generate week schedule
function generateWeekSchedule(reservations) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  const weekSchedule = [];
  
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() + i);
    
    const dayName = days[currentDate.getDay()];
    const dayDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const dayReservations = reservations.filter(r => {
      const resDate = new Date(r.reservation_date);
      return resDate.toDateString() === currentDate.toDateString();
    });
    
    weekSchedule.push({
      dayName,
      dayDate,
      sessions: dayReservations.map(r => ({
        time_slot: r.time_slot,
        laboratory: r.laboratory,
        seat_number: r.seat_number
      }))
    });
  }
  
  return weekSchedule;
}

// Faculty reserve page
router.get('/faculty/reserve', verifyFacultyAccess, async (req, res) => {
  try {
    const user = req.user;
    
    // Simple time slots array without helper dependency
    const timeSlots = [
      '08:00', '08:30', '09:00', '09:30', '10:00',
      '10:30', '11:00', '11:30', '12:00', '12:30', '01:00'
    ];
    
    res.render('faculty-reserve', { 
      userId: user._id, 
      user,
      timeSlots
    });
  } catch (err) {
    console.error('[GET /faculty/reserve]', err);
    res.status(500).send('Error loading reserve page');
  }
});

// Save faculty reservation (multiple seats, anonymous option)
router.post('/faculty/reserve', verifyFacultyAccess, async (req, res) => {
  const { 
    laboratory, 
    reservation_date, 
    time, 
    seat_numbers, 
    anonymous, 
    reservation_type,
    course_code,
    purpose,
    description,
    duration,
    recurring_type,
    recurring_weeks
  } = req.body;
  
  try {
    const user = req.user;
    
    const seatArray = Array.isArray(seat_numbers) ? seat_numbers : [seat_numbers];
    
    // Handle recurring reservations
    if (reservation_type === 'recurring' && recurring_type && recurring_weeks) {
      const baseDate = new Date(reservation_date);
      const weeksToAdd = parseInt(recurring_weeks);
      
      for (let week = 0; week < weeksToAdd; week++) {
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() + (week * 7));
        
        for (const seat of seatArray) {
          // Prevent double-booking
          const alreadyReserved = user.current_reservations.some(r =>
            r.laboratory === laboratory &&
            r.reservation_date.toISOString().slice(0,10) === currentDate.toISOString().slice(0,10) &&
            r.time_slot === time &&
            r.seat_number === parseInt(seat)
          );
          
          if (!alreadyReserved) {
            user.current_reservations.push({
              laboratory,
              reservation_date: currentDate,
              time_slot: time,
              seat_number: parseInt(seat),
              is_anonymous: anonymous === 'on',
              reservation_type: reservation_type,
              course_code: course_code || null,
              purpose: purpose || null,
              description: description || null,
              duration: duration || 30
            });
          }
        }
      }
    } else {
      // Single reservation
      for (const seat of seatArray) {
        // Prevent double-booking
        const alreadyReserved = user.current_reservations.some(r =>
          r.laboratory === laboratory &&
          r.reservation_date.toISOString().slice(0,10) === reservation_date &&
          r.time_slot === time &&
          r.seat_number === parseInt(seat)
        );
        
        if (!alreadyReserved) {
          user.current_reservations.push({
            laboratory,
            reservation_date,
            time_slot: time,
            seat_number: parseInt(seat),
            is_anonymous: anonymous === 'on',
            reservation_type: reservation_type || 'individual',
            course_code: course_code || null,
            purpose: purpose || null,
            description: description || null,
            duration: duration || 30
          });
        }
      }
    }
    
    await user.save();
    res.redirect(`/faculty/edit-reservation?userId=${user._id}`);
  } catch (err) {
    console.error('[POST /faculty/reserve]', err);
    res.status(500).send('Failed to save reservation');
  }
});

// Edit reservations page (show list, select to edit)
router.get('/faculty/edit-reservation', verifyFacultyAccess, async (req, res) => {
  try {
    const user = req.user;

    const slotMapping = {
        '08:00' : '08:00 - 08:30',
        '08:30' : '08:30 - 09:00',
        '09:00' : '09:00 - 09:30',
        '09:30' : '09:30 - 10:00',
        '10:00' : '10:00 - 10:30',
        '10:30' : '10:30 - 11:00',
        '11:00' : '11:00 - 11:30',
        '11:30' : '11:30 - 12:00',
        '12:00' : '12:00 - 12:30', 
        '12:30' : '12:30 - 01:00', 
        '01:00' : '01:00 - 01:30'
      };

    // Ensure each reservation has an _id (for legacy/seeded data)
    const mongoose = require('mongoose');
    const reservations = user.current_reservations.map(res => {
      let id = res._id;
      if (!id) {
        id = new mongoose.Types.ObjectId();
        res._id = id; // assign for future consistency
      }
      return {
        _id: id.toString(),
        laboratory: res.laboratory,
        reservation_date: res.reservation_date,
        time_slot: res.time_slot,
        time_slot_display: slotMapping[res.time_slot] || res.time_slot,
        seat_number: res.seat_number,
        reservation_type: res.reservation_type || 'individual',
        course_code: res.course_code || null,
        purpose: res.purpose || null,
        description: res.description || null,
        duration: res.duration || 30
      };
    });

    res.render('faculty-edit-reserve', { 
      userId: user._id, 
      reservations
    });
  } catch (err) {
    console.error('[GET /faculty/edit-reservation]', err);
    res.status(500).send('Error loading reservations');
  }
});

// Faculty profile page
router.get('/faculty/profile', verifyFacultyAccess, async (req, res) => {
  try {
    const user = req.user;

    res.render('faculty-profile', { 
      user,
      userId: user._id
    });
  } catch (err) {
    console.error('[GET /faculty/profile]', err);
    res.status(500).send('Error loading profile page');
  }
});

// Update faculty profile
router.post('/faculty/profile', verifyFacultyAccess, async (req, res) => {
  const { first, last, email, profile_description } = req.body;
  
  try {
    const user = req.user;

    // Update user profile
    user.name.first = first;
    user.name.last = last;
    user.email = email;
    user.profile_description = profile_description;

    await user.save();
    res.redirect(`/faculty/profile?userId=${user._id}&success=Profile updated successfully`);
  } catch (err) {
    console.error('[POST /faculty/profile]', err);
    res.status(500).send('Failed to update profile');
  }
});

// Change password route
router.post('/faculty/change-password', verifyFacultyAccess, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  
  try {
    const user = req.user;

    // Verify current password
    const bcrypt = require('bcrypt');
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.redirect(`/faculty/profile?userId=${user._id}&error=Current password is incorrect`);
    }

    // Verify new password confirmation
    if (newPassword !== confirmPassword) {
      return res.redirect(`/faculty/profile?userId=${user._id}&error=New passwords do not match`);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.redirect(`/faculty/profile?userId=${user._id}&success=Password changed successfully`);
  } catch (err) {
    console.error('[POST /faculty/change-password]', err);
    res.status(500).send('Failed to change password');
  }
});

// Delete account route
router.get('/faculty/delete-account', verifyFacultyAccess, async (req, res) => {
  try {
    const user = req.user;

    await UserProfile.findByIdAndDelete(user._id);
    res.redirect('/user-login?message=Account deleted successfully');
  } catch (err) {
    console.error('[GET /faculty/delete-account]', err);
    res.status(500).send('Failed to delete account');
  }
});

// Update the edit route
router.post('/faculty/edit-reservation', verifyFacultyAccess, async (req, res) => {
  const { reservationId, laboratory, reservation_date, time_slot, seat_number } = req.body;

  try {
    const user = req.user;

    const reservationIndex = user.current_reservations.findIndex(
        res => res._id.toString() === reservationId
    );

    if (reservationIndex === -1){
        return res.status(404).send('Reservation not found.');
    }

    user.current_reservations[reservationIndex].laboratory = laboratory;
    user.current_reservations[reservationIndex].reservation_date = new Date(reservation_date);
    user.current_reservations[reservationIndex].time_slot = time_slot;
    user.current_reservations[reservationIndex].seat_number = seat_number;
    
    user.markModified('current_reservations');

    await user.save();
    res.redirect(`/faculty/edit-reservation?userId=${user._id}`);
  } catch (err) {
    console.error('[POST /faculty/edit-reservation]', err);
    res.status(500).send('Error updating reservation');
  }
});

// Remove reservation
router.post('/faculty/remove-reservation', verifyFacultyAccess, async (req, res) => {
  const { reservationId } = req.body;

  try {
    const user = req.user;

    user.current_reservations = user.current_reservations.filter(
      r => r._id.toString() !== reservationId
    );

    await user.save();
    res.redirect(`/faculty/edit-reservation?userId=${user._id}`);
  } catch (err) {
    console.error('[POST /faculty/remove-reservation]', err);
    res.status(500).send('Error removing reservation');
  }
});

module.exports = router; 