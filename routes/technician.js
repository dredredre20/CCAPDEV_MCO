const express = require('express');
const { UserProfile } = require('../models/User');
const router = express.Router();

router.get('/technician', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.redirect('/user-login');

    try {
        const user = await UserProfile.findById(userId);
        res.render('lab_technician_page', {
            title: 'Lab Technician Homepage', 
            userId,
            style:'lab_technician_page_design.css', 
            menuItems: [
                {title: 'Check Profile', link: `/technician/profile?userId=${userId}`},
                {title: 'Main Homepage', link:'/'}
            ]
        });
    } catch (error) {
        res.redirect('/user-login?error=user_not_found');
    } 
});

router.get('/technician/profile', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.redirect('/user-login');    

    try {
        const user = await UserProfile.findById(userId);
    
        res.render('labTech_profile', {
            title: 'Lab Technician Profile Page', 
            style:'labTech_profile.css', 
            user,
            reservations: user.current_reservations,
            menuItems: [
                {title: 'Technician Homepage', link:`/technician?userId=${userId}`}
            ]
        });
    } catch (error){
        res.status(500).send("Error loading profile");
    }
});

router.get('/labTech-reserve', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.redirect('/user-login');

    res.render('lab_technician_reserve', {
        title: 'Lab Technician Reserve Page', 
        style:'lab_technician_reserve_design.css', 
        userId, 
        menuItems: [                       
            {title: 'Technician Homepage', link:`/technician?userId=${userId}`}
        ]
    });
});

router.get('/edit-reservation', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.redirect('/user-login');

    res.render('lab_technician_edit', {
        title: 'Lab Technician Edit Page', 
        style:'lab_technician_edit.css', 
        userId,
        menuItems: [
            {title: 'Technician Homepage', link:`/technician?userId=${userId}`}
        ]
    });
});

router.get('/remove-reservation', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.redirect('/user-login');

    res.render('lab_technician_remove', {
        title: 'Lab Technician Removal Page', 
        style:'lab_technician_remove_design.css', 
        userId,
        menuItems: [
            {title: 'Technician Homepage', link:`/technician?userId=${userId}`}
        ]
    });
});

router.post('/labTech-reserve', (req, res) =>{
    // handle logic here
});

router.post('/edit-reservation', (req, res) =>{
    // handle logic here

});

router.post('/remove-reservation', (req, res) =>{
    // handle logic here

});

module.exports = router;

