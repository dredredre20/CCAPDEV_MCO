// Form validation
document.getElementById('removeForm').addEventListener('submit', function(e) {
  const reservationId = document.getElementById('reservationId').value.trim();
  
  if (!reservationId) {
    e.preventDefault();
    alert('Please enter a reservation ID.');
    return false;
  }
  
  // Confirm deletion
  if (!confirm('Are you sure you want to delete this reservation? This action cannot be undone.')) {
    e.preventDefault();
    return false;
  }
  
  // Show loading state
  const submitBtn = this.querySelector('.btn-delete-reservation');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
  submitBtn.disabled = true;
  
  // Re-enable after 3 seconds if form doesn't submit
  setTimeout(() => {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }, 3000);
});
