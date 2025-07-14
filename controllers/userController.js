const { UserProfile } = require('../models/User');
const Reservation = require('../models/Reservation');

// GET: Student or Technician Homepage
exports.getHomePage = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      return res.redirect('/user-login?error=Please log in to access your homepage');
    }
    const user = await UserProfile.findById(userId);
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
    const user = await UserProfile.findById(userId);
    if (!user) return res.redirect('/user-login?error=User not found');
    if (user.user_type === 'technician') {
      const reservations = await Reservation.find({ user_id: user._id });
      res.render('labTech_profile', {
        user,
        tech: user,
        reservations
      });
    } else {
      const reservations = await Reservation.find({ user_id: user._id });
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
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { description } = req.body;
    if (!userId) {
      return res.status(400).send('User ID is required');
    }
    const user = await UserProfile.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    user.profile_description = description || '';
    await user.save();
    // Redirect based on user type
    if (user.user_type === 'technician') {
      res.redirect(`/technician/profile?success=Profile updated successfully`);
    } else {
      res.redirect(`/student/profile?success=Profile updated successfully`);
    }
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
    await UserProfile.findByIdAndDelete(userId);
    req.session.destroy(() => {
      res.redirect('/user-login');
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting account');
  }
};
