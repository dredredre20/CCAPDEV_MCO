const express = require('express');
const router = express.Router();

// Existing routes in the main page
router.get('/', (req, res) => {
    res.render('lab_reservation', {
        title: 'ReserveALab Homepage', 
        style: 'lab_reservation_design.css'
    });
});

/** 
 *  res.render basically renders the pages the main hbs file inside layouts folder
 * it passes or renders the correct hbs file inside views, and the correct css style inside public
 */

router.get('/view-slots', (req, res) => {
    res.render('view-availability', {
        title: 'Lab Slot Availability', 
        style: 'view-availability-design.css'
    });
});

router.get('/user-login', (req, res) => {
    res.render('new-login', {
        title: 'Main Login Page', 
        style: 'new-login.css',
        error: req.query.error
    });
});

router.get('/user-registration', (req, res) => {
    res.render('new-register', {
        title: 'User Register Page', 
        style: 'new-register.css',
        error: req.query.error
    });
});

// Export the router to be used in the main application
module.exports = router;