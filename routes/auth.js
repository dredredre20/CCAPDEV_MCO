const express = require('express');
const { UserProfile } = require('../models/User');
const router = express.Router();

router.post('/user-login', async (req, res) => {
    
    try {
        const {email, password} = req.body;
        // Check if user exists 
        const user = await UserProfile.findOne({email, password});

        // if user exists, redirect to the proper page depending on user type
        if (user){
            if (user.user_type === 'faculty'){
                return res.redirect(`/technician?userId=${user._id}`);
            } else {
                return res.redirect(`/student?userId=${user._id}`);
            }
        }
        res.redirect('/user-login?error=invalid_credentials');
    } catch (error) {
        res.status(500).send("Server error");
    }
    
});



router.post('/user-registration', async (req, res) => {
    // Registration logic
    const { first_name, last_name, email, password, user_type } = req.body;
    
    try {
        // check if the email is a valid dlsu email
        const email_regex = /^[a-z]+_[a-z]+@dlsu\.edu\.ph$/;
        if (!email_regex.test(email)){
            return res.render('new-register', {
                // display error if not
                error: 'Invalid DLSU email format. Use: firstname_lastname@dlsu.edu.ph'
            });
        }

        // check the database if the email already exists
        const is_existing_user = await UserProfile.findOne({ email });
        if (is_existing_user){
            return res.render('new-register', {
                error: 'Email is already registered.'
            });
        }

        // create the user object with the given values from the body
        const new_user = new UserProfile({
            name: {
                first: first_name, 
                last: last_name
            }, 
            email, 
            password, 
            user_type, 
            university: 'De La Salle University ' + user_type
        });

        // save the user, and redirect to the login page
        await new_user.save();
        res.redirect('/user-login?success=Registration successful.');

    } catch (error){ // show error if there's an error in registration
        res.render('new-register', {error: 'Registration failure.'})
    }
});

router.get('/logout', (req, res) => {
    res.redirect('/');
});

module.exports = router;