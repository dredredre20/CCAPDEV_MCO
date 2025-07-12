const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const {UserProfile} = require('../models/User');

// ✅ Create a new reservation
router.post('/reserve', reservationController.reserveSlot);

// create a consistent formate for the date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    year: 'numeric' 
  });
};

// get the availability page
router.get('/availability', async (req, res) => {
  try {
    // check if the values entered by the user are valid
    const { lab, date, time } = req.query;
    if (!lab || !date) return res.status(400).send('Lab and date required');
    
    // Create date range with proper timezone handling
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0); // Start of day in local time
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1); // Start of next day

    // Find users that have made reservations
    const query = {
      'current_reservations.laboratory': lab,
      'current_reservations.reservation_date': {
        $gte: startDate,
        $lt: endDate
      }
    }; // return reservations matching the time
    if (time) query['current_reservations.time_slot'] = time;

    const users = await UserProfile.find(query).lean();

    // List for reservations matching the filters
    const allReservations = [];
    users.forEach(user => {
      user.current_reservations.forEach(res => {
        // Convert reservation date to Date object for comparison
        const resDate = new Date(res.reservation_date);
        
        //if the reservation data are valid, push name on the list
        if (res.laboratory === lab && 
            resDate >= startDate && 
            resDate < endDate &&
            (!time || res.time_slot === time)) {
          allReservations.push({
            ...res,
            name: `${user.name.first} ${user.name.last}`
          });
        }
      });
    });

    // Create slot information
    const slots = [];
    
    if (time) {
      // Specific time slot - show single reservation per seat
      for (let i = 1; i <= 35; i++) {
        const reservation = allReservations.find(r => r.seat_number === i);
        // push the reservation data in the slot list 
        slots.push({
          seat_number: i,
          reserved: !!reservation,
          name: reservation && !reservation.is_anonymous ? reservation.name : null,
          anonymous: reservation ? reservation.is_anonymous : false,
          time_slot: reservation ? reservation.time_slot : null
        });
      }
    } else {
      // All times feature, group reservations by seat number
      const reservationsBySeat = {};
      
      // Initialize empty arrays for each seat
      for (let i = 1; i <= 35; i++) {
        reservationsBySeat[i] = [];
      }
      
      // Group reservations by seat number since multiple 
      // reservations can be made in a single seating
      allReservations.forEach(res => {
        reservationsBySeat[res.seat_number].push({
          time_slot: res.time_slot,
          name: res.is_anonymous ? null : res.name,
          anonymous: res.is_anonymous
        });
      });
      
      // Convert to slots array
      for (let i = 1; i <= 35; i++) {
        slots.push({
          seat_number: i,
          reservations: reservationsBySeat[i],
          reserved: reservationsBySeat[i].length > 0
        });
      }
    }

    // AJAX detection to easily load the new filtered page without reloading the whole page
    if (req.xhr || req.get('X-Requested-With') === 'XMLHttpRequest') {
      return res.render('partials/slots', { slots, time });
    }
    
    // Regular request for the whole page
    res.render('view-availability', { 
      slots, 
      lab, 
      date,
      time,
      formatDate
    });
  } catch (error) {
    console.error('Availability error:', error);
    res.status(500).send('Server error');
  }
});




// ✅ Edit a reservation by ID
router.put('/edit/:id', reservationController.editReservation);

// ✅ Delete a reservation by ID
router.delete('/delete/:id', reservationController.removeReservation);

// ✅ Get all reservations for a user
router.get('/user/:userId', reservationController.viewReservations);

module.exports = router;
