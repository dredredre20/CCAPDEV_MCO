const express = require('express');
const { UserProfile } = require('../models/User');
const router = express.Router();

router.get('/student', async (req, res) =>{
    const userId = req.query.userId;
    if (!userId) return res.redirect('/user-login');

    try {
        const user = await UserProfile.findById(userId);
        res.render('student_page', {
            title: 'Student Page', 
            userId,
            style: 'student_page_design.css', 
            menuItems: [
                {title: 'Main Hompage', link:'/'},
                {title: 'Profile', link:`/student/profile?userId=${userId}`}
            ]
        });
    } catch (error){
        res.redirect('/user-login?error=user_not_found');
    } 
});

router.get('/student/profile', async (req, res) =>{
    try {

        const userId = req.query.userId;
        const user = await UserProfile.findById(userId).populate('current_reservations');

        res.render('new-profile', {
            user, 
            reservations: user.current_reservations,
            title: 'Student Profile Page', 
            style: 'new-profile.css', 
            menuItems: [
                {title: 'Student Hompage', link:`/student?userId=${userId}`} 
              //  {title: 'Profile', link: `/student/profile?userId=${userId}`}
            ]
        });
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
        userId, 
        menuItems: [
            {title: 'Student Hompage', link:`/student?userId=${userId}`}, 
            {title: 'Profile', link: `/student/profile?userId=${userId}`}
        ]
    });
});

router.get('/student-edit-reserve', (req, res) =>{
    const userId = req.query.userId;
    if (!userId) return res.redirect('/user-login');

    res.render('new-edit_reserve', {
        title: 'Student Edit Reservation Page', 
        style: 'new-edit_reserve.css', 
        userId, 
        menuItems: [
            {title: 'Student Hompage', link:`/student?userId=${userId}`}, 
            {title: 'Profile', link: `/student/profile?userId=${userId}`}
        ]
    });
});


router.post('/student-reserve', (req, res) => {
    
});

router.post('/student-edit-reserve', (req, res) => {
    
});

module.exports = router;



