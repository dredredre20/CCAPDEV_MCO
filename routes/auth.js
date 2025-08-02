const express = require('express');
const router = express.Router();
const { UserProfile } = require('../models/User');

// Register user - handle both endpoints
router.post('/user-registration', async (req, res) => {
    return await handleRegistration(req, res);
});

router.post('/user-register', async (req, res) => {
    return await handleRegistration(req, res);
});

async function handleRegistration(req, res) {
    let { first, last, email, password, user_type } = req.body;
    email = email.trim().toLowerCase();

    try {
        // Validate input
        if (!first || !last || !email || !password || !user_type) {
            return res.redirect('/user-registration?error=All fields are required');
        }

        // Validate email format
        const emailRegex = /^[a-z]+_[a-z]+@dlsu\.edu\.ph$/;
        if (!emailRegex.test(email)) {
            return res.redirect('/user-registration?error=Invalid DLSU email format (e.g., juan_dela@dlsu.edu.ph)');
        }

        // Validate password length
        if (password.length < 8) {
            return res.redirect('/user-registration?error=Password must be at least 8 characters long');
        }

        // Validate user type
        const validUserTypes = ['student', 'technician'];
        if (!validUserTypes.includes(user_type)) {
            return res.redirect('/user-registration?error=Invalid user type. Must be student or technician');
        }

        // Check if user already exists (case-insensitive)
        const existingUser = await UserProfile.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.redirect('/user-registration?error=User with this email already exists');
        }

        // Store password as plain text (for this phase only)
        const newUser = new UserProfile({
            email: email.toLowerCase(),
            password: password,
            user_type,
            name: {
                first: first.trim(),
                last: last.trim()
            },
            profile_description: '',
            current_reservations: []
        });

        await newUser.save();
        return res.redirect('/user-login?success=Registration successful. Please log in.');
    } catch (err) {
        console.error('[Registration Error]', err);
        if (err.code === 11000) {
            return res.redirect('/user-registration?error=User with this email already exists');
        }

        await logError(err, {
            route: req.originalUrl, 
            userId : null
        });

        return res.redirect('/user-registration?error=Registration failed. Please try again.');
    }
}

// Login user
router.post('/user-login', async (req, res) => {
    const { email, password, remember_me } = req.body;

    try {
        // Validate input
        if (!email || !password) {
            return res.redirect('/user-login?error=Please provide both email and password');
        }

        // Find user by email (case-insensitive)
        const user = await UserProfile.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.redirect('/user-login?error=Invalid email or password');
        }

        // Plain text password comparison
        if (user.password !== password) {
            return res.redirect('/user-login?error=Invalid email or password');
        }

        // Handle "Remember Me" functionality
        if (remember_me === 'on') {
            // Set expiry to 3 weeks from now
            const threeWeeksFromNow = new Date();
            threeWeeksFromNow.setDate(threeWeeksFromNow.getDate() + 21);
            user.remember_me_expiry = threeWeeksFromNow;
            await user.save();
        } else {
            // Clear remember me if not checked
            user.remember_me_expiry = null;
            await user.save();
        }

        // Store user ID in session
        req.session.userId = user._id;
        req.session.userType = user.user_type;

        // Redirect based on user type (no userId in URL)
        let rolePath;
        if (user.user_type === 'student') {
            rolePath = '/student';
        } else if (user.user_type === 'technician') {
            rolePath = '/technician';
        } else {
            return res.redirect('/user-login?error=Invalid user type');
        }
        
        return res.redirect(rolePath);
    } catch (err) {
        console.error('[Login Error]', err);

        await logError(err, {
            route: req.originalUrl, 
            userId : req.session.userId
        });

        return res.redirect('/user-login?error=Login failed. Please try again.');
    }
});

// Logout user (destroy session)
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
    res.redirect('/user-login');
    });
});

module.exports = router;
