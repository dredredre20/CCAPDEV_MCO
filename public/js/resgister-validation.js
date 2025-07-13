$(document).ready(function (){
    // Validation script for registration
    $('.user-registration-form').on('submit', function(e) {
        e.preventDefault();

        // get these values from the form using id's
        const fName = $('#first').val().trim();
        const lName = $('#last').val().trim();
        const email = $('#email').val().trim();
        const password = $('#password').val().trim();

        // Clear previous errors
        $('.error-message').remove();
        
        // function for checking valid names
        function checkName(val){
            return /^[a-zA-Z]{2,}$/.test(val);
        }

        // Variable for checking if the value from the text fields are valid
        let isValid = true;

        // If invalid, pass id name, and message to the function
        if (!checkName(fName)){
            displayError('first', 'First name must be at least 2 letters and contain only letters.');
            isValid = false;
        }

        if (!checkName(lName)){
            displayError('last', 'Last name must be at least 2 letters and contain only letters.');
            isValid = false;
        }

        if (!/^[a-z]+_[a-z]+@dlsu\.edu\.ph$/.test(email)) {
            displayError('email','Invalid DLSU Email. Use: firstname_lastname@dlsu.edu.ph');
            isValid = false;
        }

        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password)){
            displayError('password', 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
            isValid = false;
        }

        // if valid, allow submission
        if (isValid){
            this.submit();
        }
    });

    // Function for displaying the appropriate error message at the proper id
    function displayError(field_ID, message){
        const field = $('#' + field_ID);
        field.after(`<div class="error-message text-danger"> ${message} </div>`)
    }

});