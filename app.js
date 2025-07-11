const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const { connectDB } = require('./connection/mongoose');
const multer = require('multer');

const app = express();

// 1. Connect to MongoDB
(async () => {
  await connectDB();
})();

// 2. Set up Handlebars
const hbs = exphbs.create({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    formatDate: function(date) {
      return new Date(date).toLocaleDateString();
    },
    range: function(start, end, options) {
      let result = [];
      for (let i = start; i < end; i++) {
        result.push(i);
      }
      return result;
    },
    ifEquals: function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
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
const technicianRoutes = require('./routes/technician');
const reservationRoutes = require('./routes/reservations');
// const userRoutes = require('./routes/users'); // Only enable if used

app.use('/', mainRoutes);
app.use('/', authRoutes);
app.use('/', studentRoutes);
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


