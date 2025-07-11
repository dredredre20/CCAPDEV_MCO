const express = require('express');
const router = express.Router();

// Homepage
router.get('/', (req, res) => {
    res.render('lab_reservation', {
        title: 'ReserveALab Homepage',
        style: 'lab_reservation_design.css',
        menuItems: []
    });
});

// View slots page
router.get('/view-slots', (req, res) => {
    res.render('view-availability', {
        title: 'Lab Slot Availability',
        style: 'view-availability-design.css',
        menuItems: []
    });
});

// Login page
router.get('/user-login', (req, res) => {
    res.render('new-login', {
        title: 'Main Login Page',
        style: 'new-login.css',
        error: req.query.error,
        menuItems: [
            { title: 'Main Homepage', link: '/' }
        ]
    });
});

// Registration page
router.get('/user-registration', (req, res) => {
    res.render('new-register', {
        title: 'User Register Page',
        style: 'new-register.css',
        menuItems: [
            { title: 'Main Homepage', link: '/' }
        ]
    });
});

// Student pages
router.get('/profile', (req, res) => {
    res.render('new-profile', {
        title: 'Student Profile',
        style: 'lab_reservation_design.css'
    });
});

router.get('/reserve', (req, res) => {
    res.render('new-reserve', {
        title: 'Reserve a Lab',
        style: 'lab_reservation_design.css'
    });
});

router.get('/edit-reservation', (req, res) => {
    res.render('new-edit_reserve', {
        title: 'Edit Reservation',
        style: 'lab_reservation_design.css'
    });
});

// Technician pages
router.get('/technician', (req, res) => {
    res.render('lab_technician_page', {
        title: 'Technician Page',
        style: 'lab_reservation_design.css'
    });
});

router.get('/technician/edit', (req, res) => {
    res.render('lab_technician_edit', {
        title: 'Edit Lab Reservation',
        style: 'lab_reservation_design.css'
    });
});

router.get('/technician/remove', (req, res) => {
    res.render('lab_technician_remove', {
        title: 'Remove Lab Reservation',
        style: 'lab_reservation_design.css'
    });
});

router.get('/technician/reserve', (req, res) => {
    res.render('lab_technician_reserve', {
        title: 'Technician Reserve',
        style: 'lab_reservation_design.css'
    });
});

router.get('/technician/profile', (req, res) => {
    res.render('labTech_profile', {
        title: 'Technician Profile',
        style: 'lab_reservation_design.css'
    });
});

// View all reservations
router.get('/reservations/list', (req, res) => {
    res.render('student_page', {
        title: 'All Reservations',
        style: 'lab_reservation_design.css'
    });
});

module.exports = router;
