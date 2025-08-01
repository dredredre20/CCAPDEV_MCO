function clearFilters() {
  document.getElementById('laboratory').value = '';
  document.getElementById('date').value = '';
  document.getElementById('time_slot').value = '';
  window.location.href = '/reservations/availability';
}

function refreshPage() {
  window.location.reload();
}

function validateLabSelection() {
  var lab = document.getElementById('laboratory').value;
  var errorDiv = document.getElementById('lab-error');
  if (!lab) {
    errorDiv.style.display = 'block';
    return false;
  } else {
    errorDiv.style.display = 'none';
    return true;
  }
}
document.getElementById('laboratory').addEventListener('change', function() {
  var errorDiv = document.getElementById('lab-error');
  if (this.value) errorDiv.style.display = 'none';
});

// Set default date to today if not set
document.addEventListener('DOMContentLoaded', function() {
  const dateInput = document.getElementById('date');
  if (dateInput && !dateInput.value) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
});

let selectedRow = null;
let selectedSeat = null;
let selectedTime = null;
let selectedLab = null;
let selectedDate = null;

function selectSeat(event, row) {
  // Only allow if row is available
  if (!row.classList.contains('clickable-row')) return;
  if (selectedRow) selectedRow.style.background = '';
  selectedRow = row;
  selectedRow.style.background = 'rgba(37,99,235,0.08)';
  selectedSeat = row.getAttribute('data-seat');
  selectedTime = row.getAttribute('data-time');
  selectedLab = row.getAttribute('data-lab');
  selectedDate = row.getAttribute('data-date');
  document.getElementById('reserve-selected-seat').style.display = 'block';
}

document.getElementById('reserveBtn').onclick = function() {
  if (!selectedSeat || !selectedLab || !selectedDate) return;
  // Determine user type (default to student if not set)
  const userType = '{{userType}}' || 'student';
  let url = '';
  if (userType === 'technician') {
    url = `/technician/reserve?laboratory=${encodeURIComponent(selectedLab)}&reservation_date=${encodeURIComponent(selectedDate)}&time_slot=${encodeURIComponent(selectedTime)}&seat_number=${encodeURIComponent(selectedSeat)}`;
  } else {
    url = `/student/reserve?laboratory=${encodeURIComponent(selectedLab)}&reservation_date=${encodeURIComponent(selectedDate)}&time_slot=${encodeURIComponent(selectedTime)}&seat_number=${encodeURIComponent(selectedSeat)}`;
  }
  window.location.href = url;
};
