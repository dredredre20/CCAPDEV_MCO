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
        const userId = req.session.userId;
        let userType = null;
        if (userId) {
            const { UserProfile } = require('../models/User');
            const user = await UserProfile.findById(userId).lean();
            if (user) userType = user.user_type;
        }
        // If no filters are provided, show empty results
        if (!laboratory && !date) {
            return res.render('view-availability', {
                title: 'Lab Slot Availability',
                style: 'view-availability-design.css',
                slots: [],
                laboratory: '',
                date: '',
                time_slot: '',
                userId,
                userType
            });
        }
        // If filters are provided, redirect to the availability route
        if (laboratory && date) {
            // Use correct parameter names for the /reservations/availability route
            return res.redirect(`/reservations/availability?laboratory=${laboratory}&date=${date}${time_slot ? `&time_slot=${time_slot}` : ''}`);
        }
        res.render('view-availability', {
            title: 'Lab Slot Availability',
            style: 'view-availability-design.css',
            slots: [],
            laboratory: laboratory || '',
            date: date || '',
            time_slot: time_slot || '',
            userId,
            userType
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
router.get('/student', async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to access your dashboard');
    }
    try {
        const { Reservation } = require('../models/Reservation');
        const { UserProfile } = require('../models/User');
        const user = await UserProfile.findById(userId).lean();
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }
        const reservations = await Reservation.find({ user_id: userId, status: 'active' }).sort({ reservation_date: 1, time_slot: 1 });
        const upcomingCount = reservations.filter(r => new Date(r.reservation_date) >= new Date()).length;
        const labCount = new Set(reservations.map(r => r.laboratory)).size;
        const totalHours = reservations.length * 0.5;
        const recentReservations = reservations
            .sort((a, b) => new Date(b.reservation_date) - new Date(a.reservation_date))
            .slice(0, 5)
            .map(res => ({
                _id: res._id.toString(),
                laboratory: res.laboratory,
                reservation_date: res.reservation_date,
                time_slot: res.time_slot,
                seat_number: res.seat_number,
                status: 'active',
                purpose: res.purpose || '',
                description: res.description || ''
            }));
        res.render('student_page', {
            title: 'Student Dashboard',
            style: 'student_page_design.css',
            userId,
            user,
            reservations,
            upcomingCount,
            labCount,
            totalHours,
            recentReservations,
            error: req.query.error,
            success: req.query.success
        });
    } catch (err) {
        console.error('[GET /student]', err);
        res.status(500).send('Error loading student dashboard');
    }
});

router.get('/student/profile', async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to view your profile');
    }
    try {
        const { Reservation } = require('../models/Reservation');
        const { UserProfile } = require('../models/User');
        const user = await UserProfile.findById(userId).lean();
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }
        const reservations = await Reservation.find({ user_id: userId, status: 'active' }).sort({ reservation_date: 1, time_slot: 1 });
        res.render('new-profile', {
            title: 'Student Profile',
            style: 'new-profile.css',
            user,
            userId,
            reservations,
            canEdit: true,
            error: req.query.error,
            success: req.query.success
        });
    } catch (err) {
        console.error('[GET /student/profile]', err);
        res.status(500).send('Error loading profile page');
    }
});

router.get('/student/reserve', (req, res) => {
    res.render('new-reserve', {
        title: 'Reserve a Lab',
        style: 'new-reserve.css',
        userId: req.query.userId
    });
});

router.get('/student/edit-reservation', async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.redirect('/user-login?error=Please log in to edit your reservations');
    }
    try {
        const { Reservation } = require('../models/Reservation');
        const { UserProfile } = require('../models/User');
        const user = await UserProfile.findById(userId).lean();
        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }
        // Fetch all active reservations for this student from the Reservation collection
        const reservations = await Reservation.find({ 
            user_id: userId, 
            status: 'active' 
        }).sort({ reservation_date: 1, time_slot: 1 });
        const formattedReservations = reservations.map(res => ({
            _id: res._id.toString(),
            laboratory: res.laboratory,
            reservation_date: res.reservation_date instanceof Date ? res.reservation_date.toISOString().split('T')[0] : res.reservation_date,
            time_slot: res.time_slot,
            seat_number: res.seat_number,
            purpose: res.purpose || '',
            description: res.description || '',
            is_anonymous: res.is_anonymous || false
        }));
        res.render('new-edit_reserve', {
            title: 'Edit Reservation',
            style: 'new-edit_reserve.css',
            userId,
            reservations: formattedReservations,
            error: req.query.error,
            success: req.query.success
        });
    } catch (err) {
        console.error('[GET /student/edit-reservation]', err);
        res.status(500).send('Error loading edit reservation page');
    }
});

// Technician pages
router.get('/technician', async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.render('lab_technician_page', {
            title: 'Technician Dashboard',
            style: 'lab_technician_page_design.css',
            techId: '',
            totalReservations: 0,
            activeUsers: 0,
            availableLabs: 0,
            todayBookings: 0,
            recentActivity: [],
            error: 'Please log in as a technician'
        });
    }
    try {
        const { Reservation } = require('../models/Reservation');
        const { UserProfile } = require('../models/User');
        const user = await UserProfile.findById(userId).lean();
        if (!user) {
            return res.render('lab_technician_page', {
                title: 'Technician Dashboard',
                style: 'lab_technician_page_design.css',
                techId: '',
                totalReservations: 0,
                activeUsers: 0,
                availableLabs: 0,
                todayBookings: 0,
                recentActivity: [],
                error: 'User not found'
            });
        }
        const allReservations = await Reservation.find({ status: 'active' }).populate('user_id', 'name email');
        const totalReservations = allReservations.length;
        const activeUsers = new Set(allReservations.map(r => r.user_id._id.toString())).size;
        const availableLabs = 5;
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = allReservations.filter(r => new Date(r.reservation_date).toISOString().split('T')[0] === today).length;
        const recentActivity = allReservations
            .sort((a, b) => new Date(b.reservation_date) - new Date(a.reservation_date))
            .slice(0, 10)
            .map(r => ({
                activityType: 'Reservation',
                activityIcon: 'calendar-plus',
                description: `Reservation for ${r.laboratory} seat ${r.seat_number}`,
                timestamp: r.reservation_date,
                user: r.user_id
            }));
        return res.render('lab_technician_page', {
            title: 'Technician Dashboard',
            style: 'lab_technician_page_design.css',
            userId,
            user,
            totalReservations,
            activeUsers,
            availableLabs,
            todayBookings,
            recentActivity,
            error: req.query.error,
            success: req.query.success
        });
    } catch (err) {
        console.error('[GET /technician]', err);
        res.render('lab_technician_page', {
            title: 'Technician Dashboard',
            style: 'lab_technician_page_design.css',
            techId: '',
            totalReservations: 0,
            activeUsers: 0,
            availableLabs: 0,
            todayBookings: 0,
            recentActivity: [],
            error: 'Error loading technician dashboard'
        });
    }
});

router.get('/technician/edit', (req, res) => {
    res.render('lab_technician_edit', {
        title: 'Technician Edit',
        style: 'lab_technician_edit.css',
        userId: req.session.userId
    });
});

router.get('/technician/remove', (req, res) => {
    res.render('lab_technician_remove', {
        title: 'Remove Lab Reservation',
        style: 'lab_technician_remove_design.css',
        userId: req.session.userId
    });
});

router.get('/technician/reserve', (req, res) => {
    res.render('lab_technician_reserve', {
        title: 'Technician Reserve',
        style: 'lab_technician_reserve_design.css',
        userId: req.session.userId
    });
});

router.get('/technician/profile', async (req, res) => {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
        return res.render('labTech_profile', {
            title: 'Technician Profile',
            style: 'labTech_profile.css',
            techId: '',
            reservations: [],
            error: 'Please log in as a technician'
        });
    }
    try {
        const { Reservation } = require('../models/Reservation');
        const { UserProfile } = require('../models/User');
        const user = await UserProfile.findById(userId).lean();
        if (!user) {
            return res.render('labTech_profile', {
                title: 'Technician Profile',
                style: 'labTech_profile.css',
                techId: '',
                reservations: [],
                error: 'User not found'
            });
        }
        const reservations = await Reservation.find({ user_id: userId });
        res.render('labTech_profile', {
            title: 'Technician Profile',
            style: 'labTech_profile.css',
            user,
            tech: user,
            reservations,
            techId: userId,
            error: req.query.error,
            success: req.query.success
        });
    } catch (err) {
        console.error('[GET /technician/profile]', err);
        res.render('labTech_profile', {
            title: 'Technician Profile',
            style: 'labTech_profile.css',
            techId: '',
            reservations: [],
            error: 'Error loading profile'
        });
    }
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
