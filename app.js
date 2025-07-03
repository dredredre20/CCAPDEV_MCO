const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

mongoose.connect('mongodb://localhost:27017/ReserveALabDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})  .then(() => console.log("MongoDB connected"))
    .catch(err => console.log("MongoDB error:", err));

// Handlebars setup
const hbs = exphbs.create({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'), 
    helpers: {
        formatDate: function(date){
            return date.toLocaleDateString();
        }
    }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const UserProfile = require('./models/User');
const Reservation = require('./models/Reservation');

// Import routes
const mainRoutes = require('./routes/main');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const technicianRoutes = require('./routes/technician');

// Use routes
app.use('/', mainRoutes);
app.use('/', authRoutes);
app.use('/', studentRoutes);
app.use('/', technicianRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

