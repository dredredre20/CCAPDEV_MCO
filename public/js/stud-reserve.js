function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

document.addEventListener('DOMContentLoaded', function() {
  const laboratorySelect = document.getElementById('laboratory');
  const dateInput = document.getElementById('reservation_date');
  const timeSlotSelect = document.getElementById('time_slot');
  const seatNumberSelect = document.getElementById('seat_number');

  // Pre-fill from query params if present
  const qpLab = getQueryParam('laboratory');
  const qpDate = getQueryParam('reservation_date');
  const qpTime = getQueryParam('time_slot');
  const qpSeat = getQueryParam('seat_number');

  if (qpLab) laboratorySelect.value = qpLab;
  if (qpDate) dateInput.value = qpDate;

  async function fetchAvailabilityAndPrefill() {
    await fetchAvailability();
    if (qpTime) {
      timeSlotSelect.value = qpTime;
      await fetchSeats();
      if (qpSeat) seatNumberSelect.value = qpSeat;
    }
  }

  // If lab and date are pre-filled, fetch and prefill
  if (qpLab && qpDate) {
    fetchAvailabilityAndPrefill();
  }

  async function fetchAvailability() {
    const laboratory = laboratorySelect.value;
    const date = dateInput.value;
    if (!laboratory || !date) {
      timeSlotSelect.innerHTML = '<option value="">Select Time Slot</option>';
      seatNumberSelect.innerHTML = '<option value="">Select Seat</option>';
      return;
    }
    try {
      const res = await fetch(`/student/availability?laboratory=${encodeURIComponent(laboratory)}&date=${encodeURIComponent(date)}`);
      const data = await res.json();
      // Populate time slots
      timeSlotSelect.innerHTML = '<option value="">Select Time Slot</option>';
      data.availableSlots.forEach(slot => {
        const opt = document.createElement('option');
        opt.value = slot.timeSlot;
        opt.textContent = `${slot.timeSlot} - ${slot.endTime}`;
        timeSlotSelect.appendChild(opt);
      });
      // Clear seats until a time slot is chosen
      seatNumberSelect.innerHTML = '<option value="">Select Seat</option>';
    } catch (err) {
      timeSlotSelect.innerHTML = '<option value="">Select Time Slot</option>';
      seatNumberSelect.innerHTML = '<option value="">Select Seat</option>';
    }
  }

  async function fetchSeats() {
    const laboratory = laboratorySelect.value;
    const date = dateInput.value;
    const timeSlot = timeSlotSelect.value;
    if (!laboratory || !date || !timeSlot) {
      seatNumberSelect.innerHTML = '<option value="">Select Seat</option>';
      return;
    }
    try {
      const res = await fetch(`/student/availability?laboratory=${encodeURIComponent(laboratory)}&date=${encodeURIComponent(date)}&timeSlot=${encodeURIComponent(timeSlot)}`);
      const data = await res.json();
      seatNumberSelect.innerHTML = '<option value="">Select Seat</option>';
      (data.availableSeats || []).forEach(seat => {
        const opt = document.createElement('option');
        opt.value = seat;
        opt.textContent = `Seat ${seat}`;
        seatNumberSelect.appendChild(opt);
      });
    } catch (err) {
      seatNumberSelect.innerHTML = '<option value="">Select Seat</option>';
    }
  }

  laboratorySelect.addEventListener('change', fetchAvailability);
  dateInput.addEventListener('change', fetchAvailability);
  timeSlotSelect.addEventListener('change', fetchSeats);
});

// Character counter for description
document.getElementById('description').addEventListener('input', function() {
  const maxLength = 200;
  const currentLength = this.value.length;
  const remaining = maxLength - currentLength;
  
  // Update form text
  const formText = this.parentNode.querySelector('.form-text');
  if (formText) {
    formText.textContent = `${remaining} characters remaining`;
    
    if (remaining < 50) {
      formText.style.color = '#ef4444';
    } else if (remaining < 100) {
      formText.style.color = '#f59e0b';
    } else {
      formText.style.color = '#6b7280';
    }
  }
});

// Form validation
document.getElementById('reservationForm').addEventListener('submit', function(e) {
  const laboratory = document.getElementById('laboratory').value;
  const date = document.getElementById('reservation_date').value;
  const timeSlot = document.getElementById('time_slot').value;
  const seatNumber = document.getElementById('seat_number').value;
  const purpose = document.getElementById('purpose').value;
  
  if (!laboratory || !date || !timeSlot || !seatNumber || !purpose) {
    e.preventDefault();
    alert('Please fill in all required fields.');
    return false;
  }
  
  // Show loading state
  const submitBtn = this.querySelector('.btn-create-reservation');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
  submitBtn.disabled = true;
  
  // Re-enable after 3 seconds if form doesn't submit
  setTimeout(() => {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }, 3000);
});
