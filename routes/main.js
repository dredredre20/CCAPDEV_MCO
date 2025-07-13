const express = require('express');
const router = express.Router();

// Homepage
router.get('/', (req, res) => {
    res.render('lab_reservation', {
        title: 'ReserveALab Homepage',
        style: 'lab_reservation_design.css',
        userId: req.query.userId || null,
        menuItems: []
    });
});

// View slots page
router.get('/view-slots', async (req, res) => {
    try {
        const { laboratory, date, time_slot } = req.query;
        
        // If no filters are provided, show empty results
        if (!laboratory && !date) {
            return res.render('view-availability', {
                title: 'Lab Slot Availability',
                style: 'view-availability-design.css',
                results: [],
                laboratory: '',
                date: '',
                time_slot: ''
            });
        }
        
        // If filters are provided, redirect to the availability route
        if (laboratory && date) {
            return res.redirect(`/reservations/availability?lab=${laboratory}&date=${date}${time_slot ? `&time=${time_slot}` : ''}`);
        }
        
        res.render('view-availability', {
            title: 'Lab Slot Availability',
            style: 'view-availability-design.css',
            results: [],
            laboratory: laboratory || '',
            date: date || '',
            time_slot: time_slot || ''
        });
    } catch (error) {
        console.error('View slots error:', error);
        res.status(500).send('Server error');
    }
});

// Login page
router.get('/user-login', (req, res) => {
    res.render('new-login', {
        title: 'Main Login Page',
        style: 'new-login.css',
        error: req.query.error,
        success: req.query.success,
        menuItems: [
            { title: 'Main Homepage', link: '/' }
        ]
    });
});

// Registration page - adding both routes for compatibility
router.get('/user-registration', (req, res) => {
    res.render('new-register', {
        title: 'User Register Page',
        style: 'new-register.css',
        error: req.query.error,
        menuItems: [
            { title: 'Main Homepage', link: '/' }
        ]
    });
});

// Alternative registration route
router.get('/user-register', (req, res) => {
    res.render('new-register', {
        title: 'User Register Page',
        style: 'new-register.css',
        error: req.query.error,
        menuItems: [
            { title: 'Main Homepage', link: '/' }
        ]
    });
});

// Student pages
router.get('/student', (req, res) => {
    res.render('student_page', {
        title: 'Student Dashboard',
        style: 'student_page_design.css',
        userId: req.query.userId
    });
});

router.get('/student/profile', (req, res) => {
    res.render('new-profile', {
        title: 'Student Profile',
        style: 'new-profile.css',
        userId: req.query.userId
    });
});

router.get('/student/reserve', (req, res) => {
    res.render('new-reserve', {
        title: 'Reserve a Lab',
        style: 'new-reserve.css',
        userId: req.query.userId
    });
});

router.get('/student/edit-reservation', (req, res) => {
    res.render('new-edit_reserve', {
        title: 'Edit Reservation',
        style: 'new-edit_reserve.css',
        userId: req.query.userId
    });
});

// Faculty pages
router.get('/faculty', (req, res) => {
    res.render('lab_reservation', {
        title: 'Faculty Dashboard',
        style: 'lab_reservation_design.css',
        userId: req.query.userId
    });
});

// Technician pages
router.get('/technician', (req, res) => {
    res.render('lab_technician_page', {
        title: 'Technician Dashboard',
        style: 'lab_technician_page_design.css',
        userId: req.query.userId
    });
});

router.get('/technician/edit', (req, res) => {
    res.render('lab_technician_edit', {
        title: 'Edit Lab Reservation',
        style: 'lab_technician_edit.css',
        userId: req.query.userId
    });
});

router.get('/technician/remove', (req, res) => {
    res.render('lab_technician_remove', {
        title: 'Remove Lab Reservation',
        style: 'lab_technician_remove_design.css',
        userId: req.query.userId
    });
});

router.get('/technician/reserve', (req, res) => {
    res.render('lab_technician_reserve', {
        title: 'Technician Reserve',
        style: 'lab_technician_reserve_design.css',
        userId: req.query.userId
    });
});

router.get('/technician/profile', (req, res) => {
    res.render('labTech_profile', {
        title: 'Technician Profile',
        style: 'labTech_profile.css',
        userId: req.query.userId
    });
});

// View all reservations
router.get('/reservations/list', (req, res) => {
    res.render('student_page', {
        title: 'All Reservations',
        style: 'student_page_design.css'
    });
});

// Search users and slots
router.get('/search', (req, res) => {
    res.render('view-availability', {
        title: 'Search Slots and Users',
        style: 'view-availability-design.css',
        results: []
    });
});

module.exports = router;
