const express = require('express');
const { UserProfile } = require('../models/User');
const router = express.Router();

// Student pages rendering
router.get('/student', async (req, res) =>{
    // get the userId, and redirect if invalid
    const userId = req.query.userId; 
    if (!userId) return res.redirect('/user-login');

    try {
        // find the user inside the database
        // pass the values to main hbs to properly render the page
        const user = await UserProfile.findById(userId);
        res.render('student_page', {
            title: 'Student Page', 
            userId,
            style: 'student_page_design.css'
        });
    } catch (error){ // redirect to login again if user not found
        res.redirect('/user-login?error=user_not_found');
    } 
});

router.get('/student/profile', async (req, res) =>{

    const userId = req.query.userId;
    if (!userId) return res.redirect('/user-login');  

    try {

        const user = await UserProfile.findById(userId);

        // same rendering statements
        res.render('new-profile', {
            user, 
            reservations: user.current_reservations,
            title: 'Student Profile Page', 
            style: 'new-profile.css'
        });

        // display error if profile cannot be loaded
    } catch (error) {
        res.status(500).send("Error loading profile");
    }
});

router.get('/student-reserve', (req, res) =>{
    const userId = req.query.userId;
    if (!userId) return res.redirect('/user-login');


    res.render('new-reserve', {
        title: 'Student Reserve Page', 
        style: 'new-reserve.css', 
        userId
    });
});

router.get('/student-edit-reserve', (req, res) =>{
    const userId = req.query.userId;
    if (!userId) return res.redirect('/user-login');

    res.render('new-edit_reserve', {
        title: 'Student Edit Reservation Page', 
        style: 'new-edit_reserve.css', 
        userId
    });
});


router.post('/student-reserve', (req, res) => {
    
});

router.post('/student-edit-reserve', (req, res) => {
    
});

module.exports = router;



