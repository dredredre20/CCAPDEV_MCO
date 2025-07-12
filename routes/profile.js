const express = require('express');
const router = express.Router();
const multer = require('multer');
const { UserProfile } = require('../models/User');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/');
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split('.').pop();
    cb(null, `${req.user._id}_${Date.now()}.${ext}`);
  }
});
const upload = multer({ storage: storage });

// Edit user profile (GET form)
router.get('/edit', async (req, res) => {
  const user = await UserProfile.findById(req.user._id);
  res.render('new-edit-profile', { user });
});

// Update user profile (POST)
router.post('/edit', upload.single('profile_picture'), async (req, res) => {
  const { profile_description } = req.body;

  const updateData = { profile_description };
  if (req.file) {
    updateData.profile_picture = `/uploads/${req.file.filename}`;
  }

  await UserProfile.findByIdAndUpdate(req.user._id, updateData);
  res.redirect('/profile'); // or wherever you want
});

module.exports = router;
