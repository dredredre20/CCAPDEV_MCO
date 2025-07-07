const express = require('express');
const { UserProfile } = require('../models/User');
const router = express.Router();

router.post('/user-login', async (req, res) => {
    
    try {
        const {email, password} = req.body;
        const user = await UserProfile.findOne({email, password});

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



router.post('/user-registration', (req, res) => {
    // Registration logic
    const { email, password, role } = req.body;
    
    //add to database logic here

    res.redirect('/user-login');
});

router.get('/logout', (req, res) => {
    res.redirect('/');
});

module.exports = router;