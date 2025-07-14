// Form Handlers for ReserveALab
document.addEventListener('DOMContentLoaded', function() {
    
    // Handle reservation form submissions
    const reservationForms = document.querySelectorAll('form[action*="/reserve"]');
    reservationForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                setLoading(submitBtn, true);
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            }
        });
    });

    // Handle edit form submissions
    const editForms = document.querySelectorAll('form[action*="/edit"]');
    editForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                setLoading(submitBtn, true);
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            }
        });
    });

    // Handle delete confirmations
    const deleteButtons = document.querySelectorAll('.btn-delete, .btn-danger');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to delete this reservation? This action cannot be undone.')) {
                e.preventDefault();
                return false;
            }
            
            setLoading(btn, true);
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        });
    });

    // Handle profile update forms
    const profileForms = document.querySelectorAll('form[action*="/profile"]');
    profileForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                setLoading(submitBtn, true);
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            }
        });
    });

    // Real-time form validation
    const requiredFields = document.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        field.addEventListener('blur', function() {
            validateField(this);
        });
        
        field.addEventListener('input', function() {
            if (this.classList.contains('border-danger')) {
                validateField(this);
            }
        });
    });

    // Date validation for reservations
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        input.addEventListener('change', function() {
            const selectedDate = new Date(this.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                this.classList.add('border-danger');
                showAlert('Please select a future date for your reservation.', 'error');
            } else {
                this.classList.remove('border-danger');
            }
        });
    });

    // Time slot validation
    const timeSelects = document.querySelectorAll('select[name="time"]');
    timeSelects.forEach(select => {
        select.addEventListener('change', function() {
            if (this.value) {
                this.classList.remove('border-danger');
            }
        });
    });

    // Laboratory selection validation
    const labSelects = document.querySelectorAll('select[name="lab"], select[name="laboratory"]');
    labSelects.forEach(select => {
        select.addEventListener('change', function() {
            if (this.value) {
                this.classList.remove('border-danger');
            }
        });
    });

    // Seat number validation
    const seatInputs = document.querySelectorAll('input[name="seat_number"], select[name="seat_number"]');
    seatInputs.forEach(input => {
        input.addEventListener('change', function() {
            const seatNum = parseInt(this.value);
            if (seatNum >= 1 && seatNum <= 35) {
                this.classList.remove('border-danger');
            } else {
                this.classList.add('border-danger');
                showAlert('Please select a valid seat number (1-35).', 'error');
            }
        });
    });

    // Auto-save functionality for long forms
    const autoSaveForms = document.querySelectorAll('.auto-save');
    autoSaveForms.forEach(form => {
        let saveTimeout;
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    autoSaveForm(form);
                }, 2000); // Save after 2 seconds of inactivity
            });
        });
    });

    // Handle navigation with unsaved changes
    window.addEventListener('beforeunload', function(e) {
        const formsWithChanges = document.querySelectorAll('form.changed');
        if (formsWithChanges.length > 0) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    });

    // Mark forms as changed when inputs are modified
    const allInputs = document.querySelectorAll('input, select, textarea');
    allInputs.forEach(input => {
        input.addEventListener('input', function() {
            const form = this.closest('form');
            if (form) {
                form.classList.add('changed');
            }
        });
    });

    // Reset form change tracking after successful submission
    const allForms = document.querySelectorAll('form');
    allForms.forEach(form => {
        form.addEventListener('submit', function() {
            this.classList.remove('changed');
        });
    });
});

// Validation functions
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name || field.id;
    
    // Remove existing error styling
    field.classList.remove('border-danger');
    
    // Check if required field is empty
    if (field.hasAttribute('required') && !value) {
        field.classList.add('border-danger');
        showAlert(`${getFieldLabel(fieldName)} is required.`, 'error');
        return false;
    }
    
    // Email validation
    if (field.type === 'email' && value) {
        const emailRegex = /^[a-z]+_[a-z]+@dlsu\.edu\.ph$/;
        if (!emailRegex.test(value)) {
            field.classList.add('border-danger');
            showAlert('Please enter a valid DLSU email address (e.g., juan_dela@dlsu.edu.ph)', 'error');
            return false;
        }
    }
    
    // Password validation
    if (field.type === 'password' && value) {
        if (value.length < 8) {
            field.classList.add('border-danger');
            showAlert('Password must be at least 8 characters long', 'error');
            return false;
        }
    }
    
    return true;
}

function getFieldLabel(fieldName) {
    const labels = {
        'first': 'First Name',
        'last': 'Last Name',
        'email': 'Email Address',
        'password': 'Password',
        'user_type': 'User Type',
        'laboratory': 'Laboratory',
        'reservation_date': 'Reservation Date',
        'time': 'Time Slot',
        'seat_number': 'Seat Number'
    };
    
    return labels[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
}

// Auto-save functionality
function autoSaveForm(form) {
    const formData = new FormData(form);
    const url = form.action;
    
    fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Changes saved automatically.', 'success');
            form.classList.remove('changed');
        } else {
            showAlert('Auto-save failed. Please save manually.', 'warning');
        }
    })
    .catch(error => {
        console.error('Auto-save error:', error);
        showAlert('Auto-save failed. Please save manually.', 'error');
    });
}

// Enhanced loading state management
function setLoading(element, loading = true) {
    if (loading) {
        element.classList.add('loading');
        element.disabled = true;
        
        // Store original content
        if (!element.dataset.originalContent) {
            element.dataset.originalContent = element.innerHTML;
        }
    } else {
        element.classList.remove('loading');
        element.disabled = false;
        
        // Restore original content
        if (element.dataset.originalContent) {
            element.innerHTML = element.dataset.originalContent;
        }
    }
}

// Enhanced form validation
function validateForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    return isValid;
}

// Success message after form submission
function showSuccessMessage(message) {
    showAlert(message, 'success');
    
    // Auto-hide success messages after 5 seconds
    setTimeout(() => {
        const alerts = document.querySelectorAll('.alert-success');
        alerts.forEach(alert => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 300);
        });
    }, 5000);
}

// Error handling for failed submissions
function handleFormError(error, form) {
    console.error('Form submission error:', error);
    
    // Reset loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        setLoading(submitBtn, false);
    }
    
    // Show error message
    showAlert('An error occurred. Please try again.', 'error');
}

// Export functions for use in other scripts
window.formHandlers = {
    validateForm,
    setLoading,
    showSuccessMessage,
    handleFormError
}; 