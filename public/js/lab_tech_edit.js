// Function to open delete modal
function openDeleteModal(reservationId) {
  document.getElementById('deleteReservationId').value = reservationId;
  const modal = new bootstrap.Modal(document.getElementById('deleteReservationModal'));
  modal.show();
}

// Function to select a reservation from the list
function selectReservation(reservationId) {
  const reservationDropdown = document.getElementById('reservationDropdown');
  reservationDropdown.value = reservationId;
  reservationDropdown.dispatchEvent(new Event('change'));
  
  // Scroll to the edit form
  document.querySelector('.edit-reservation-form-card').scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  });
}

// Function to delete a reservation directly from the list
function deleteReservation(reservationId) {
  if (confirm('Are you sure you want to delete this reservation? This action cannot be undone.')) {
    // Get data attributes
    const reservationData = document.getElementById('reservationData');
    const techId = reservationData.dataset.userId;
    
    // Create hidden form for submission
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/technician/delete-reservation';
    
    const techIdInput = document.createElement('input');
    techIdInput.type = 'hidden';
    techIdInput.name = 'techId';
    techIdInput.value = techId;
    
    const reservationIdInput = document.createElement('input');
    reservationIdInput.type = 'hidden';
    reservationIdInput.name = 'reservationId';
    reservationIdInput.value = reservationId;
    
    form.appendChild(techIdInput);
    form.appendChild(reservationIdInput);
    document.body.appendChild(form);
    form.submit();
  }
}

// Form validation
document.addEventListener('DOMContentLoaded', function() {
  const editForm = document.getElementById('editReservationForm');
  if (editForm) {
    editForm.addEventListener('submit', function(e) {
      const laboratory = document.getElementById('editLaboratory').value;
      const date = document.getElementById('editDate').value;
      const timeSlot = document.getElementById('editTimeSlot').value;
      const seatNumber = document.getElementById('editSeatNumber').value;
      
      if (!laboratory || !date || !timeSlot || !seatNumber) {
        e.preventDefault();
        alert('Please fill in all required fields.');
        return false;
      }
      
      // Show loading state
      const submitBtn = this.querySelector('.btn-save-changes');
      if (submitBtn) {
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        // Re-enable after 3 seconds if form doesn't submit
        setTimeout(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        }, 3000);
      }
    });
  }

  // Get data attributes
  const reservationData = document.getElementById('reservationData');
  if (!reservationData) return;
  
  const userId = reservationData.dataset.userId;
  const reservations = JSON.parse(reservationData.dataset.reservations.replace(/&quot;/g, '"'));

  const labSelect = document.getElementById('editLaboratory');
  const dateInput = document.getElementById('editDate');
  const timeSlotSelect = document.getElementById('editTimeSlot');
  const seatNumberSelect = document.getElementById('editSeatNumber');
  const reservationDropdown = document.getElementById('reservationDropdown');

  // Function to fetch available time slots
  async function fetchTimeSlots() {
    const lab = labSelect.value;
    const date = dateInput.value;
    if (!lab || !date) {
      timeSlotSelect.innerHTML = '<option value="">Select Time Slot</option>';
      seatNumberSelect.innerHTML = '<option value="">Select Seat</option>';
      return;
    }
    
    try {
      const response = await fetch(`/student/availability?laboratory=${encodeURIComponent(lab)}&date=${encodeURIComponent(date)}`);
      const data = await response.json();
      
      timeSlotSelect.innerHTML = '<option value="">Select Time Slot</option>';
      data.availableSlots.forEach(slot => {
        const opt = document.createElement('option');
        opt.value = slot.timeSlot;
        opt.textContent = `${slot.timeSlot} - ${slot.endTime}`;
        timeSlotSelect.appendChild(opt);
      });
    } catch (error) {
      console.error('Error fetching time slots:', error);
    }
  }

  // Function to fetch available seats
  async function fetchSeats() {
    const lab = labSelect.value;
    const date = dateInput.value;
    const timeSlot = timeSlotSelect.value;
    if (!lab || !date || !timeSlot) {
      seatNumberSelect.innerHTML = '<option value="">Select Seat</option>';
      return;
    }
    
    try {
      const response = await fetch(`/student/availability?laboratory=${encodeURIComponent(lab)}&date=${encodeURIComponent(date)}&timeSlot=${encodeURIComponent(timeSlot)}`);
      const data = await response.json();
      
      seatNumberSelect.innerHTML = '<option value="">Select Seat</option>';
      (data.availableSeats || []).forEach(seat => {
        const opt = document.createElement('option');
        opt.value = seat;
        opt.textContent = `Seat ${seat}`;
        seatNumberSelect.appendChild(opt);
      });
    } catch (error) {
      console.error('Error fetching seats:', error);
    }
  }

  // When reservation selection changes
  if (reservationDropdown) {
    reservationDropdown.addEventListener('change', function() {
      const selectedId = this.value;
      const res = reservations.find(r => r._id === selectedId);
      
      if (res) {
        document.getElementById('editReservationId').value = res._id;
        labSelect.value = res.laboratory;
        dateInput.value = res.reservation_date;
        timeSlotSelect.value = res.time_slot;
        
        // Manually create seat options
        seatNumberSelect.innerHTML = '<option value="">Select Seat</option>';
        for (let i = 1; i <= 35; i++) {
          const opt = document.createElement('option');
          opt.value = i;
          opt.textContent = `Seat ${i}`;
          if (i == res.seat_number) {
            opt.selected = true;
          }
          seatNumberSelect.appendChild(opt);
        }
        
        // Update info panel
        document.getElementById('currentLab').textContent = res.laboratory;
        document.getElementById('currentDate').textContent = res.reservation_date;
        document.getElementById('currentTime').textContent = res.time_slot;
        document.getElementById('currentSeat').textContent = `Seat ${res.seat_number}`;
      }
    });
  }

  // Add event listeners
  if (labSelect) labSelect.addEventListener('change', fetchTimeSlots);
  if (dateInput) dateInput.addEventListener('change', fetchTimeSlots);
  if (timeSlotSelect) timeSlotSelect.addEventListener('change', fetchSeats);

  // Make functions available globally
  window.openDeleteModal = openDeleteModal;
  window.selectReservation = selectReservation;
  window.deleteReservation = deleteReservation;
});