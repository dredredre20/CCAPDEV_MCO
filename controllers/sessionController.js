const bcrypt = require('bcrypt');
const { UserProfile } = require('../models/User');

// Show registration form
exports.getRegister = (req, res) => {
  res.render('register');
};

// Register user
exports.postRegister = async (req, res) => {
  const { first, last, email, password, user_type } = req.body;

  try {
    const existingUser = await UserProfile.findOne({ email });
    if (existingUser) {
      return res.render('register', { error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new UserProfile({
      name: { first, last },
      email,
      password: hashedPassword,
      user_type,
      current_reservations: [],
      profile_description: '',
    });

    await newUser.save();
    req.session.user = {
      _id: newUser._id,
      email: newUser.email,
      name: newUser.name,
      user_type: newUser.user_type,
    };

    res.redirect('/home');
  } catch (err) {
    console.error(err);
    res.render('register', { error: 'Registration failed' });
  }
};

// Show login form
exports.getLogin = (req, res) => {
  res.render('login');
};

// Login user
exports.postLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserProfile.findOne({ email });
    if (!user) {
      return res.render('login', { error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.render('login', { error: 'Invalid credentials' });
    }

    req.session.user = {
      _id: user._id,
      email: user.email,
      name: user.name,
      user_type: user.user_type,
    };

    res.redirect('/home');
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Login failed' });
  }
};

// Logout user
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
    }
    res.redirect('/login');
  });
};
