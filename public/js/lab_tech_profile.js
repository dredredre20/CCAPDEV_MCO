function showDeleteModal() {
  const modal = new bootstrap.Modal(document.getElementById('deleteAccountModal'));
  modal.show();
}

function deleteAccount() {
  if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
    // Show loading state
    const btn = document.querySelector('.btn-delete-account');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    btn.disabled = true;
    
    // Redirect to login page (simulated deletion)
    setTimeout(() => {
      window.location.href = "/user-login";
    }, 2000);
  }
}

// Form validation
document.getElementById('editForm').addEventListener('submit', function(e) {
  const description = document.getElementById('description').value.trim();
  
  if (description.length > 500) {
    e.preventDefault();
    alert('Description must be less than 500 characters.');
    return false;
  }
  
  // Show loading state
  const submitBtn = this.querySelector('.btn-save-changes');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  submitBtn.disabled = true;
  
  // Re-enable after 3 seconds if form doesn't submit
  setTimeout(() => {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }, 3000);
});

// Character counter for description
document.getElementById('description').addEventListener('input', function() {
  const maxLength = 500;
  const currentLength = this.value.length;
  const remaining = maxLength - currentLength;
  
  // Update form text
  const formText = this.parentNode.querySelector('.form-text');
  if (formText) {
    formText.textContent = `${remaining} characters remaining`;
    
    if (remaining < 100) {
      formText.style.color = '#ef4444';
    } else if (remaining < 200) {
      formText.style.color = '#f59e0b';
    } else {
      formText.style.color = '#6b7280';
    }
  }
});
