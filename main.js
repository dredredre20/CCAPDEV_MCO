const express = require('express');
const router = express.Router();

// Existing routes
router.get('/', (req, res) => {
    res.render('lab_reservation', {
        title: 'ReserveALab Homepage', 
        style: 'lab_reservation_design.css',
        menuItems: []
    });
});

router.get('/view-slots', (req, res) => {
    res.render('view-availability', {
        title: 'Lab Slot Availability', 
        style: 'view-availability-design.css',
        menuItems: []
    });
});

router.get('/user-login', (req, res) => {
    res.render('new-login', {
        title: 'Main Login Page', 
        style: 'new-login.css',
        error:req.query.error, 
        menuItems: [
            {title: 'Main Homepage', link: '/'}
        ]
    });
});

router.get('/user-registration', (req, res) => {
    res.render('new-register', {
        title: 'User Register Page', 
        style: 'new-register.css',
        menuItems: [
            {title: 'Main Homepage', link: '/'}
        ]
    });
});


/** I'm going to comment this out first
// Test route to list all views
router.get('/test-views', (req, res) => {
    const views = [
        'lab_reservation',
        'view-availability',
        'new-login',
        'new-register',
        'student_page',
        'new-profile',
        'new-reserve',
        'new-edit_reserve',
        'lab_technician_page',
        'labTech_profile',
        'lab_technician_reserve',
        'lab_technician_edit',
        'lab_technician_remove'
    ];
    
    res.send(`
        <h1>Test Views</h1>
        <ul>
            ${views.map(view => `<li><a href="/test-views/${view}">${view}</a></li>`).join('')}
        </ul>
    `);
});

// Individual test routes for each view
const testViews = [
    'lab_reservation',
    'view-availability',
    'new-login',
    'new-register',
    'student_page',
    'new-profile',
    'new-reserve',
    'new-edit_reserve',
    'lab_technician_page',
    'labTech_profile',
    'lab_technician_reserve',
    'lab_technician_edit',
    'lab_technician_remove'
];

testViews.forEach(view => {
    router.get(`/test-views/${view}`, (req, res) => {
        res.render(view, {
            title: 'Test View',
            style: 'lab_reservation_design.css',
            menuItems: []
        });
    });
});
 */

module.exports = router;