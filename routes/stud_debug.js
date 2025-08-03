const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const mongoose = require('mongoose');
const { Reservation } = require('../models/Reservation');
const { UserProfile } = require('../models/User');
const { ReservationSlot } = require('../models/ReservationSlot');
const userController = require('../controllers/userController');
const { authenticateUser, authorizeStudent } = require('../middleware/auth');
const { logErrorAsync } = require('../middleware/errorLogger');


// Andre Marker
router.get('/user/profile-picture/:userId', async (req, res) => {
  try {
    const user = await UserProfile.findById(req.params.userId);
    
    if (!user || !user.profile_picture || !user.profile_picture.data) {
      return res.status(404).send('Image not found');
    }
    
    res.set('Content-Type', user.profile_picture.contentType);
    res.send(user.profile_picture.data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving image');
  }
});
// Students are not allowed to delete reservations.

// Student profile page
router.get('/student/profile', authenticateUser, authorizeStudent, async (req, res) => {
    const userId = req.session.userId;
    try {
        const user = await UserProfile.findById(userId).lean();
        if (user) {
      // Add timestamp for cache busting
          user.updatedAtTime = user.updatedAt.getTime();
        }

        if (!user) {
            return res.redirect('/user-login?error=User not found');
        }
        
        // Get user's active reservations from the Reservation collection
        const reservations = await Reservation.find({ 
            user_id: userId, 
            status: 'active' 
        }).sort({ reservation_date: 1, time_slot: 1 }).lean();
        
        console.log(`👤 Profile: Found ${reservations.length} active reservations for user ${userId}`);
        
        res.render('new-profile', { 
          title: 'Student Profile',
          style: 'new-profile.css',
          user: user, 
          userId, 
          reservations,
          canEdit: true,
          error: req.query.error,
          success: req.query.success
        });
    } catch (err) {
        console.error('[GET /student/profile]', err);
        res.status(500).send('Error loading profile');
    }
});

// View another user's public profile
router.get('/user/:userId/profile', async (req, res) => {
  const userId = req.params.userId;
  const currentUserId = req.query.currentUserId;
  
  if (!userId || typeof userId !== 'string' || userId.length !== 24) {
    return res.status(404).send('User not found');
  }

  try {
    const user = await UserProfile.findById(userId).populate('current_reservations').lean();
    if (!user) {
      return res.status(404).send('User not found');
    }
    
    const canEdit = currentUserId && currentUserId === userId;
    
    res.render('new-profile', { 
      title: `${user.name.first} ${user.name.last}'s Profile`,
      style: 'new-profile.css',
      user,
      canEdit,
      currentUserId
    });
  } catch (err) {
    console.error('[GET /user/:userId/profile]', err);
    res.status(500).send('Error loading public profile');
  }
});



module.exports = router;
