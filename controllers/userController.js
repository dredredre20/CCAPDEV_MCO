const { UserProfile } = require('../models/User');
const Reservation = require('../models/Reservation');

// GET: Student or Technician Homepage
exports.getHomePage = async (req, res) => {
  try {
    const user = await UserProfile.findById(req.query.userId);
    if (!user) return res.redirect('/user-login?error=User not found');

    const view = user.user_type === 'student' ? 'student_page' : 'lab_technician_page';
    res.render(view, { userId: user._id, techId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading homepage');
  }
};

// GET: View Profile (student or technician)
exports.getProfile = async (req, res) => {
  try {
    const user = await UserProfile.findById(req.query.userId || req.query.techId);
    if (!user) return res.redirect('/user-login?error=User not found');

    if (user.user_type === 'technician') {
      const reservations = await Reservation.find({ user_id: user._id });
      res.render('labTech_profile', {
        user,
        tech: user,
        reservations
      });
    } else {
      res.render('new-profile', {
        user,
        userId: user._id,
        reservations: user.current_reservations || []
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
    const { userId, techId, description } = req.body;
    const id = userId || techId;
    const user = await UserProfile.findById(id);
    if (!user) return res.redirect('/user-login?error=User not found');

    user.profile_description = description;
    await user.save();

    if (user.user_type === 'technician') {
      res.redirect(`/technician/profile?techId=${user._id}`);
    } else {
      res.redirect(`/student/profile?userId=${user._id}`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating profile');
  }
};

// POST: Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    const { userId, techId } = req.body;
    const id = userId || techId;
    const user = await UserProfile.findById(id);
    if (!user) return res.redirect('/user-login?error=User not found');

    await UserProfile.findByIdAndDelete(id);
    res.redirect('/user-login');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting account');
  }
};
