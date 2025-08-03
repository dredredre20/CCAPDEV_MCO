const mongoose = require('mongoose');
const { UserProfile } = require('./models/User');
const { Reservation } = require('./models/Reservation');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost/ReserveALabDB', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected for verification');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const checkDatabase = async () => {
  try {
    console.log('\n🔍 Checking database contents...\n');

    // Check users
    const users = await UserProfile.find({});
    console.log(`👥 Users found: ${users.length}`);
    users.forEach(user => {
      console.log(`  - ${user.name.first} ${user.name.last} (${user.email}) - ${user.user_type}`);
      console.log(`    Current reservations: ${user.current_reservations.length}`);
    });

    // Check reservations
    const reservations = await Reservation.find({});
    console.log(`\n📅 Reservations found: ${reservations.length}`);
    
    if (reservations.length > 0) {
      console.log('\n📋 Reservation details:');
      reservations.forEach(reservation => {
        console.log(`  - ID: ${reservation._id}`);
        console.log(`    Lab: ${reservation.laboratory}`);
        console.log(`    Date: ${reservation.reservation_date.toDateString()}`);
        console.log(`    Time: ${reservation.time_slot} - ${reservation.end_time}`);
        console.log(`    Seat: ${reservation.seat_number}`);
        console.log(`    User: ${reservation.user_id}`);
        console.log(`    Status: ${reservation.status}`);
        console.log(`    Anonymous: ${reservation.is_anonymous}`);
        console.log(`    Purpose: ${reservation.purpose}`);
        console.log('');
      });
    }

    // Check for orphaned reservations (reservations without valid users)
    const orphanedReservations = [];
    for (const reservation of reservations) {
      const user = await UserProfile.findById(reservation.user_id);
      if (!user) {
        orphanedReservations.push(reservation);
      }
    }

    if (orphanedReservations.length > 0) {
      console.log(`⚠️  Orphaned reservations found: ${orphanedReservations.length}`);
      orphanedReservations.forEach(reservation => {
        console.log(`  - Reservation ${reservation._id} has invalid user_id: ${reservation.user_id}`);
      });
    } else {
      console.log('✅ No orphaned reservations found');
    }

    // Check for users with mismatched current_reservations
    for (const user of users) {
      const actualReservations = await Reservation.find({ 
        user_id: user._id, 
        status: 'active' 
      });
      
      const expectedCount = actualReservations.length;
      const actualCount = user.current_reservations.length;
      
      if (expectedCount !== actualCount) {
        console.log(`⚠️  User ${user.email} has ${actualCount} current_reservations but ${expectedCount} active reservations in database`);
      }
    }

    console.log('\n✅ Database verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the verification
connectDB().then(checkDatabase); 