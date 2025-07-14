const { connectDB } = require('./connection/mongoose');
const { UserProfile } = require('./models/User');
const { Reservation } = require('./models/Reservation');
const { ReservationSlot } = require('./models/ReservationSlot');

async function seedDatabase() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Clear existing data
    await UserProfile.deleteMany({});
    await Reservation.deleteMany({});
    await ReservationSlot.deleteMany({});
    console.log('Cleared existing data');

    // Create sample users (plain text passwords for this phase)
    const users = [
      {
        name: { first: 'Juan', last: 'Dela Cruz' },
        email: 'juan_dela@dlsu.edu.ph',
        password: 'password123',
        user_type: 'student',
        profile_description: 'Computer Science student passionate about programming and technology.',
        current_reservations: []
      },
      {
        name: { first: 'Maria', last: 'Santos' },
        email: 'maria_santos@dlsu.edu.ph',
        password: 'password123',
        user_type: 'student',
        profile_description: 'Information Technology student interested in web development.',
        current_reservations: []
      },
      {
        name: { first: 'Pedro', last: 'Garcia' },
        email: 'pedro_garcia@dlsu.edu.ph',
        password: 'password123',
        user_type: 'student',
        profile_description: 'Software Engineering student focused on mobile app development.',
        current_reservations: []
      },
      {
        name: { first: 'Ana', last: 'Reyes' },
        email: 'ana_reyes@dlsu.edu.ph',
        password: 'password123',
        user_type: 'technician',
        profile_description: 'Lab technician with 5 years of experience managing computer laboratories.',
        current_reservations: []
      },
      {
        name: { first: 'Luis', last: 'Martinez' },
        email: 'luis_martinez@dlsu.edu.ph',
        password: 'password123',
        user_type: 'technician',
        profile_description: 'Senior lab technician specializing in network administration and hardware maintenance.',
        current_reservations: []
      }
    ];

    const createdUsers = await UserProfile.insertMany(users);
    console.log(`Created ${createdUsers.length} users`);

    // Create sample reservation slots for the next 7 days
    const laboratories = ['G301', 'G302', 'G303', 'G304', 'G305'];
    const timeSlots = [
      '08:00', '08:30', '09:00', '09:30', '10:00',
      '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
      '13:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30', '18:00'
    ];

    const slots = [];
    const today = new Date();
    
    for (let day = 0; day < 7; day++) {
      const date = new Date(today);
      date.setDate(today.getDate() + day);
      
      for (const lab of laboratories) {
        for (const timeSlot of timeSlots) {
          for (let seat = 1; seat <= 35; seat++) {
            slots.push({
              laboratory: lab,
              date: date,
              time_slot: timeSlot,
              seat_number: seat,
              is_available: true,
              is_blocked: false
            });
          }
        }
      }
    }

    await ReservationSlot.insertMany(slots);
    console.log(`Created ${slots.length} reservation slots`);

    // Create some sample reservations
    const sampleReservations = [
      {
        user_id: createdUsers[0]._id, // Juan
        laboratory: 'G301',
        reservation_date: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        time_slot: '09:00',
        end_time: '09:30',
        seat_number: 15,
        is_anonymous: false,
        purpose: 'Programming assignment work',
        status: 'active'
      },
      {
        user_id: createdUsers[1]._id, // Maria
        laboratory: 'G302',
        reservation_date: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        time_slot: '14:00',
        end_time: '14:30',
        seat_number: 22,
        is_anonymous: true,
        purpose: 'Web development project',
        status: 'active'
      },
      {
        user_id: createdUsers[2]._id, // Pedro
        laboratory: 'G303',
        reservation_date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        time_slot: '10:30',
        end_time: '11:00',
        seat_number: 8,
        is_anonymous: false,
        purpose: 'Mobile app development',
        status: 'active'
      }, 
      {
        user_id: createdUsers[1]._id, // Maria
        laboratory: 'G305',
        reservation_date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        time_slot: '17:30',
        end_time: '18:00',
        seat_number: 21,
        is_anonymous: true,
        purpose: 'Programming assignment work',
        status: 'active'
      }, 
      {
        user_id: createdUsers[2]._id, // Pedro
        laboratory: 'G302',
        reservation_date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        time_slot: '15:30',
        end_time: '16:00',
        seat_number: 17,
        is_anonymous: false,
        purpose: 'Programming assignment work',
        status: 'active'
      }
    ];

    const createdReservations = await Reservation.insertMany(sampleReservations);
    console.log(`Created ${createdReservations.length} sample reservations`);

    // Update slots to reflect reservations
    for (const reservation of createdReservations) {
      await ReservationSlot.findOneAndUpdate(
        {
          laboratory: reservation.laboratory,
          date: reservation.reservation_date,
          time_slot: reservation.time_slot,
          seat_number: reservation.seat_number
        },
        {
          is_available: false,
          reserved_by: reservation.user_id,
          reservation_id: reservation._id
        }
      );
    }

    // Update users with their reservations
    for (const reservation of createdReservations) {
      await UserProfile.findByIdAndUpdate(
        reservation.user_id,
        { $push: { current_reservations: reservation._id } }
      );
    }

    console.log('Database seeded successfully!');
    console.log('\nSample login credentials:');
    console.log('Student: juan_dela@dlsu.edu.ph / password123');
    console.log('Student: maria_santos@dlsu.edu.ph / password123');
    console.log('Student: pedro_garcia@dlsu.edu.ph / password123');
    console.log('Technician: ana_reyes@dlsu.edu.ph / password123');
    console.log('Technician: luis_martinez@dlsu.edu.ph / password123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();

