const { UserProfile } = require('../models/User');
const {Reservation} = require('../models/Reservation');
const { ReservationSlot } = require('../models/ReservationSlot');
const multer = require('multer');
const sharp = require('sharp');
const upload = multer({ storage: multer.memoryStorage() });


// GET: Student or Technician Homepage
exports.getHomePage = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      return res.redirect('/user-login?error=Please log in to access your homepage');
    }
    const user = await UserProfile.findById(userId).lean();
    if (!user) return res.redirect('/user-login?error=User not found');
    const view = user.user_type === 'student' ? 'student_page' : 'lab_technician_page';
    res.render(view, { userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading homepage');
  }
};

// GET: View Profile (student or technician)
exports.getProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      return res.redirect('/user-login?error=Please log in to view your profile');
    }
    const user = await UserProfile.findById(userId).lean();
    if (!user) return res.redirect('/user-login?error=User not found');
    if (user.user_type === 'technician') {
      const reservations = await Reservation.find({ user_id: user._id }).lean();
      res.render('labTech_profile', {
        user,
        tech: user,
        reservations
      });
    } else {
      const reservations = await Reservation.find({ user_id: user._id }).lean();
      res.render('new-profile', {
        user,
        userId: user._id,
        reservations
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading profile');
  }
};

// POST: Update profile description (student or technician)
// Andre Marker
exports.updateProfile = async (req, res) => {


  try {
    const userId = req.body.userId;
    const { first, last, description } = req.body;

    const user = await UserProfile.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Update name
    user.name.first = first;
    user.name.last = last;
    
    // Update description
    user.profile_description = description || '';
    
    // Update profile picture if uploaded
    if (req.file) {
      user.profile_picture.data = await sharp(req.file.buffer)
        .resize(300) // Width 300px, height auto
        .toBuffer();
      user.profile_picture.contentType = req.file.mimetype;
    }

    await user.save();
    
    res.redirect(`/student/profile?success=Profile updated successfully`);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).send('Error updating profile');
  }


};

// POST: Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/user-login?error=User not found');
    
    // Delete all reservations associated with this user
    await Reservation.deleteMany({ user_id: userId });
    
    // Release all reservation slots reserved by this user
    await ReservationSlot.updateMany(
      { reserved_by: userId },
      {
        $set: {
          is_available: true,
          reserved_by: null,
          reservation_id: null
        }
      }
    );
    
    // Delete the user account
    const deletedUser = await UserProfile.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return res.redirect('/user-login?error=User not found');
    }
    
    // Destroy session after successful deletion
    req.session.destroy(() => {
      res.redirect('/user-login?success=Account deleted successfully');
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting account');
  }
};
