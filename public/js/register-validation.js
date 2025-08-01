
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
  const submitButton = document.querySelector('#registerForm button[type="submit"]');
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

function togglePassword(fieldId) {
  const passwordInput = document.getElementById(fieldId);
  const passwordIcon = document.getElementById(fieldId === 'password' ? 'passwordIcon' : 'confirmPasswordIcon');
  
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

// Password strength checker
function checkPasswordStrength(password) {
  let strength = 0;
  let feedback = [];
  
  if (password.length >= 8) strength++;
  else feedback.push('At least 8 characters');
  
  if (/[a-z]/.test(password)) strength++;
  else feedback.push('Include lowercase letters');
  
  if (/[A-Z]/.test(password)) strength++;
  else feedback.push('Include uppercase letters');
  
  if (/[0-9]/.test(password)) strength++;
  else feedback.push('Include numbers');
  
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  else feedback.push('Include special characters');
  
  return { strength, feedback };
}

// Real-time password validation
document.getElementById('password').addEventListener('input', function() {
  const password = this.value;
  const strength = checkPasswordStrength(password);
  
  // Remove existing strength indicator
  const existingIndicator = document.querySelector('.password-strength');
  if (existingIndicator) existingIndicator.remove();
  
  if (password.length > 0) {
    const indicator = document.createElement('div');
    indicator.className = 'password-strength';
    
    let strengthClass = '';
    let strengthText = '';
    
    if (strength.strength <= 2) {
      strengthClass = 'strength-weak';
      strengthText = 'Weak';
    } else if (strength.strength <= 3) {
      strengthClass = 'strength-medium';
      strengthText = 'Medium';
    } else {
      strengthClass = 'strength-strong';
      strengthText = 'Strong';
    }
    
    indicator.innerHTML = `<span class="${strengthClass}">Password strength: ${strengthText}</span>`;
    this.parentNode.appendChild(indicator);
  }
});

// Form validation
document.getElementById('registerForm').addEventListener('submit', function(e) {
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm_password').value;
  const email = document.getElementById('email').value;
  const userType = document.getElementById('user_type').value;
  
  // Check if passwords match
  if (password !== confirmPassword) {
    e.preventDefault();
    showAlert('Passwords do not match.', 'danger');
    return;
  }
  
  // Check password strength
  const strength = checkPasswordStrength(password);
  if (strength.strength < 3) {
    e.preventDefault();
    showAlert('Please create a stronger password.', 'danger');
    return;
  }
  
  // Validate DLSU email format
  const dlsuEmailRegex = /^[a-z]+_[a-z]+@dlsu\.edu\.ph$/;
  if (!dlsuEmailRegex.test(email.toLowerCase())) {
    e.preventDefault();
    showAlert('Please use a valid DLSU email address (e.g., juan_dela@dlsu.edu.ph).', 'danger');
    return;
  }
  
  // Check if user type is selected
  if (!userType) {
    e.preventDefault();
    showAlert('Please select your user type.', 'danger');
    return;
  }
  
});

// Auto-focus on first name input
document.addEventListener('DOMContentLoaded', function() {
  const firstNameInput = document.getElementById('first');
  if (firstNameInput) {
    firstNameInput.focus();
  }
});
