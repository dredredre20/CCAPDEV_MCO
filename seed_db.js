const mongoose = require('mongoose');
const { UserProfile } = require('./models/User');
const { Reservation } = require('./models/Reservation');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost/ReserveALabDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected for seeding');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    // Clear existing data
    await UserProfile.deleteMany({});
    await Reservation.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create test users
    const testUsers = [
    {
        name: { first: 'Juan', last: 'Dela Cruz' },
        email: 'juan_dela@dlsu.edu.ph',
        password: 'password123',
        user_type: 'student', 
        profile_description: 'Computer Science student interested in web development'
    },
    {
        name: { first: 'Maria', last: 'Santos' },
        email: 'maria_santos@dlsu.edu.ph',
        password: 'password123',
        user_type: 'student',
        profile_description: 'Information Technology student'
    },
    {
        name: { first: 'Pedro', last: 'Garcia' },
        email: 'pedro_garcia@dlsu.edu.ph',
        password: 'password123',
        user_type: 'technician',
        profile_description: 'Lab technician with 5 years of experience'
      }
    ];

    const createdUsers = await UserProfile.insertMany(testUsers);
    console.log('👥 Created test users');

    // Create some sample reservations
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

const sampleReservations = [
    {
        user_id: createdUsers[0]._id, // Juan
        laboratory: 'G301',
        reservation_date: tomorrow,
        time_slot: '09:00',
        end_time: '09:30',
        seat_number: 5,
        is_anonymous: false, 
        status: 'active', 
        purpose: 'Programming assignment'
    },
    {
        user_id: createdUsers[1]._id, // Maria
        laboratory: 'G302',
        reservation_date: tomorrow,
        time_slot: '10:00',
        end_time: '10:30',
        seat_number: 12,
        is_anonymous: false,
        status: 'active', 
        purpose: 'Database project'
    },
    {
        user_id: createdUsers[0]._id, // Juan
        laboratory: 'G301',
        reservation_date: tomorrow,
        time_slot: '14:00',
        end_time: '14:30',
        seat_number: 8,
        is_anonymous: true, 
        status: 'active', 
        purpose: 'Study session'
    }    
];

    const createdReservations = await Reservation.insertMany(sampleReservations);
    console.log('📅 Created sample reservations');

    // Update users with their reservations
    await UserProfile.findByIdAndUpdate(createdUsers[0]._id, {
      current_reservations: [createdReservations[0]._id, createdReservations[2]._id]
    });
    await UserProfile.findByIdAndUpdate(createdUsers[1]._id, {
      current_reservations: [createdReservations[1]._id]
    });

    console.log('✅ Database seeded successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('Student 1: juan_dela@dlsu.edu.ph / password123');
    console.log('Student 2: maria_santos@dlsu.edu.ph / password123');
    console.log('Technician: pedro_garcia@dlsu.edu.ph / password123');
    console.log('\n🚀 You can now start the server with: npm start');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    }
};

// Run the seeding
connectDB().then(seedDatabase);

