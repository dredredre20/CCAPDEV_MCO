// Function to open delete modal
function openDeleteModal(reservationId) {
  document.getElementById('deleteReservationId').value = reservationId;
  const modal = new bootstrap.Modal(document.getElementById('deleteReservationModal'));
  modal.show();
}

// Function to select a reservation
function selectReservation(reservationId) {
  const reservationDropdown = document.getElementById('reservationDropdown');
  reservationDropdown.value = reservationId;
  reservationDropdown.dispatchEvent(new Event('change'));
}

document.addEventListener('DOMContentLoaded', function() {
  // Get data attributes
  const reservationData = document.getElementById('reservationData');
  const userId = reservationData.dataset.userId;
  const reservations = JSON.parse(reservationData.dataset.reservations);
  
  const labSelect = document.getElementById('editLaboratory');
  const dateInput = document.getElementById('editDate');
  const timeSlotSelect = document.getElementById('editTimeSlot');
  const seatNumberSelect = document.getElementById('editSeatNumber');
  const reservationDropdown = document.getElementById('reservationDropdown');

  // Function to fetch available time slots
  async function fetchTimeSlots() {
    const lab = labSelect.value;
    const date = dateInput.value;
    if (!lab || !date) return;
    
    // Always show all time slots
    const timeSlots = [
      '08:00', '08:30', '09:00', '09:30', '10:00',
      '10:30', '11:00', '11:30', '12:00', '12:30', '13:00'
    ];
    
    timeSlotSelect.innerHTML = '<option value="">Select Time Slot</option>';
    timeSlots.forEach(time => {
      const option = document.createElement('option');
      option.value = time;
      option.textContent = time;
      timeSlotSelect.appendChild(option);
    });
  }

  // Function to fetch available seats
  async function fetchSeats(currentSeat) {
    const lab = labSelect.value;
    const date = dateInput.value;
    const timeSlot = timeSlotSelect.value;
    const reservationId = document.getElementById('editReservationId').value;
    
    if (!lab || !date || !timeSlot) {
      seatNumberSelect.innerHTML = '<option value="">Select Seat</option>';
      return;
    }
    
    let url = `/student/availability?laboratory=${encodeURIComponent(lab)}&date=${encodeURIComponent(date)}&timeSlot=${encodeURIComponent(timeSlot)}`;
    if (reservationId) {
      url += `&currentReservationId=${encodeURIComponent(reservationId)}`;
    }
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      seatNumberSelect.innerHTML = '<option value="">Select Seat</option>';
      
      // Create all 35 seat options
      for (let seat = 1; seat <= 35; seat++) {
        const option = document.createElement('option');
        option.value = seat;
        option.textContent = `Seat ${seat}`;
        
        // Mark unavailable seats
        if (!data.availableSeats.includes(seat) && seat !== currentSeat) {
          option.disabled = true;
          option.textContent += ' (Unavailable)';
        }
        
        seatNumberSelect.appendChild(option);
      }
      
      // Set current seat if available
      if (currentSeat) {
        seatNumberSelect.value = currentSeat;
      }
    } catch (error) {
      console.error('Error fetching seats:', error);
    }
  }

  // When reservation selection changes
  reservationDropdown.addEventListener('change', async function() {
    const selectedId = this.value;
    const reservation = reservations.find(r => r._id === selectedId);
    
    if (reservation) {
      // Set form values
      document.getElementById('editReservationId').value = reservation._id;
      labSelect.value = reservation.laboratory;
      dateInput.value = reservation.reservation_date;
      
      // Fetch and set time slots
      await fetchTimeSlots();
      timeSlotSelect.value = reservation.time_slot;
      
      // Fetch and set seats
      await fetchSeats(reservation.seat_number);
      
      // Update info panel
      document.getElementById('currentLab').textContent = reservation.laboratory;
      document.getElementById('currentDate').textContent = reservation.reservation_date;
      document.getElementById('currentTime').textContent = reservation.time_slot;
      document.getElementById('currentSeat').textContent = `Seat ${reservation.seat_number}`;
    }
  });

  // Event listeners for form changes
  labSelect.addEventListener('change', fetchTimeSlots);
  dateInput.addEventListener('change', fetchTimeSlots);
  timeSlotSelect.addEventListener('change', () => fetchSeats());
});