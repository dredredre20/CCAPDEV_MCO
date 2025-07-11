const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { UserProfile } = require('../models/User');

// Register user
router.post('/user-registration', async (req, res) => {
    const { first, last, email, password, user_type } = req.body;

    try {
        const existingUser = await UserProfile.findOne({ email });
        if (existingUser) {
            return res.redirect('/user-registration?error=User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new UserProfile({
            email,
            password: hashedPassword,
            user_type,
            name: {
                first,
                last
            },
            profile_description: '',
            current_reservations: []
        });

        await newUser.save();
        return res.redirect('/user-login');
    } catch (err) {
        console.error('[Registration Error]', err);
        return res.status(500).send('Registration error');
    }
});

// Login user
router.post('/user-login', async (req, res) => {
    const { email, password, remember_me } = req.body;

    try {
        const user = await UserProfile.findOne({ email });
        if (!user) {
            return res.redirect('/user-login?error=Invalid credentials');
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.redirect('/user-login?error=Invalid credentials');
        }

        // Remember me functionality (set cookie for 3 weeks)
        if (remember_me) {
            res.cookie('userId', user._id.toString(), { maxAge: 1000 * 60 * 60 * 24 * 21, httpOnly: true });
        }

        const rolePath = user.user_type === 'student' ? '/student' : '/technician';
        return res.redirect(`${rolePath}?userId=${user._id}`);
    } catch (err) {
        console.error('[Login Error]', err);
        return res.status(500).send('Login error');
    }
});

// Logout user
router.get('/logout', (req, res) => {
    res.clearCookie('userId');
    res.redirect('/user-login');
});

module.exports = router;
