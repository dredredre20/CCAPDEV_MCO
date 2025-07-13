const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const { connectDB } = require('./connection/mongoose');
const multer = require('multer');
const { Reservation } = require('./models/Reservation');
const { ReservationSlot } = require('./models/ReservationSlot');

const app = express();

// 1. Connect to MongoDB
(async () => {
  await connectDB();

  const count = await Reservation.countDocuments();
  console.log(`Total reservations in database: ${count}`);
  
  if (count === 0) {
    console.log('No reservations found. Did you run the seed script?');
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

// 4. Routes (all logic goes through MongoDB)
const mainRoutes = require('./routes/main');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const facultyRoutes = require('./routes/faculty');
const technicianRoutes = require('./routes/technician');
const reservationRoutes = require('./routes/reservations');
// const userRoutes = require('./routes/users'); // Only enable if used

app.use('/', mainRoutes);
app.use('/', authRoutes);
app.use('/', studentRoutes);
app.use('/', facultyRoutes);
app.use('/', technicianRoutes);
app.use('/reservations', reservationRoutes);
// app.use('/users', userRoutes); // Commented for now

// For profile edit with picture
const userController = require('./controllers/userController');
app.post('/student/profile/edit', upload.single('profile_picture'), userController.updateProfile);

// 5. Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});


