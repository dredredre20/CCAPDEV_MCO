function cancelEdit() {
  window.location.href = '/student?userId={{user._id}}';
}

function showDeleteModal() {
  const modal = new bootstrap.Modal(document.getElementById('deleteAccountModal'));
  modal.show();
}

// Character counter for description
document.getElementById('description').addEventListener('input', function() {
  const maxLength = 300;
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
