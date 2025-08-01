function togglePassword() {
  const passwordInput = document.getElementById('password');
  const passwordIcon = document.getElementById('passwordIcon');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    passwordIcon.classList.remove('fa-eye');
    passwordIcon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    passwordIcon.classList.remove('fa-eye-slash');
    passwordIcon.classList.add('fa-eye');
  }
}

// Override the global showAlert function for this page
function showAlert(message, type = 'info') {
  // Remove any existing alerts first
  const existingAlerts = document.querySelectorAll('.alert');
  existingAlerts.forEach(alert => alert.remove());
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-2`;
  alertDiv.innerHTML = `
    <i class="fas fa-${type === 'danger' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  // Insert the alert before the submit button
  const submitButton = document.querySelector('.login-form button[type="submit"]');
  if (submitButton) {
    submitButton.parentNode.insertBefore(alertDiv, submitButton);
  }
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

// Auto-focus on email input
document.addEventListener('DOMContentLoaded', function() {
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.focus();
  }
});

// Form validation
document.querySelector('.login-form').addEventListener('submit', function(e) {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  if (!email || !password) {
    e.preventDefault();
    showAlert('Please fill in all required fields.', 'danger');
    return;
  }
  
  // Validate DLSU email format
  const dlsuEmailRegex = /^[a-z]+_[a-z]+@dlsu\.edu\.ph$/;
  if (!dlsuEmailRegex.test(email.toLowerCase())) {
    e.preventDefault();
    showAlert('Please use a valid DLSU email address (e.g., juan_dela@dlsu.edu.ph).', 'danger');
    return;
  }
});
