const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const { connectDB } = require('./connection/mongoose');
const multer = require('multer');
const { Reservation } = require('./models/Reservation');
const { ReservationSlot } = require('./models/ReservationSlot');
const { UserProfile } = require('./models/User');
const session = require('express-session');

const app = express();

// 1. Connect to MongoDB with better error handling
(async () => {
  try {
    await connectDB();
    
    // Check if we have any data
    const userCount = await UserProfile.countDocuments();
    const reservationCount = await Reservation.countDocuments();
    
    console.log(`✅ MongoDB connected successfully`);
    console.log(`📊 Database stats: ${userCount} users, ${reservationCount} reservations`);
    
    // If no data exists, suggest running seed script
    if (userCount === 0 && reservationCount === 0) {
      console.log('⚠️  No data found. Consider running: node seed_db.js');
    }
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
})();

// 2. Set up Handlebars
const hbs = exphbs.create({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),

  helpers: {
    formatDate: function(date, format) {
       if (!date) return '';
    const d = new Date(date);
    if (format === 'YYYY-MM-DD') {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return d.toLocaleDateString();
    },

    range: function(start, end, options) {
      let result = [];
      for (let i = start; i < end; i++) {
        result.push(i);
      }
      return result;
    },
    
    eq: function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    },
    
    ifEquals: function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    },

    addMinutes: function(time, minutes) {
      if (!time) return '';
      const [hours, mins] = time.split(':').map(Number);
      const totalMinutes = hours * 60 + mins + minutes;
      const newHours = Math.floor(totalMinutes / 60);
      const newMins = totalMinutes % 60;
      return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
    },

    gt: function(a, b) {
      return a > b;
    },

    isPast: function(dateString) {
      return new Date(dateString) < new Date();
    },

    json: function(context) {
      return JSON.stringify(context);
    }

  }
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// 3. Middleware (No cookies/sessions)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: path.join(__dirname, 'public/uploads') });

app.use(session({
  secret: 'your_super_secret_key', // Change this to a strong, unique secret in production
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// 4. Routes (removed faculty routes)
const mainRoutes = require('./routes/main');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const technicianRoutes = require('./routes/technician');
const reservationRoutes = require('./routes/reservations');

app.use('/', mainRoutes);
app.use('/', authRoutes);
app.use('/', studentRoutes);
app.use('/', technicianRoutes);
app.use('/reservations', reservationRoutes);

// For profile edit with picture
const userController = require('./controllers/userController');
app.post('/student/profile/edit', upload.single('profile_picture'), userController.updateProfile);

// 5. Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).send('Something went wrong!');
});

// 6. Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});


