const mongoose = require('mongoose');

const {UserProfile} = require('./models/User');
const {Reservation} = require('./models/Reservation');

mongoose.connect('mongodb://localhost:27017/ReserveALabDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})  .then(() => console.log("MongoDB connected"))
    .catch(err => console.log("MongoDB error:", err));

const sampleUsers = [
    {   name: {first: 'Andre', last: 'Chu'}, 
        email: 'andre_chu@dlsu.edu.ph', 
        password: 'hello123', 
        user_type: 'student', 
        university: 'De La Salle University Undergraduate',
        profile_description: 'Interested in Game Development',
        current_reservations: [
            {
                laboratory: 'G302', 
                reservation_date: new Date('2025-07-09'), 
                time_slot: '08:00-08:30', 
                seat_number: 3, 
                is_anonymous: false, 
            },
            {
                laboratory: 'G301', 
                reservation_date: new Date('2025-07-21'), 
                time_slot: '11:30-12:00', 
                seat_number: 5, 
                is_anonymous: true, 
            }
        ] 
    },
    {
        name: {first: 'Joaquin', last: 'Tin'}, 
        email: 'joaquin_tin@dlsu.edu.ph', 
        password: 'gaming123', 
        user_type: 'student', 
        university: 'De La Salle University Undergraduate',
        profile_description: 'Interested in hosting video segments', 
        current_reservations: [
            {
                laboratory: 'G305', 
                reservation_date: new Date('2025-07-18'), 
                time_slot: '11:00-11:30', 
                seat_number:11, 
                is_anonymous: true, 
            
            }

        ]
    },
    {
        name: {first: 'Jesus', last: 'Planta'}, 
        email: 'jesus_planta@dlsu.edu.ph', 
        password: 'coding123', 
        user_type: 'student', 
        university: 'De La Salle University Undergraduate',
        profile_description: 'Interested in software engineering', 
        current_reservations: [
            {
                laboratory: 'G304', 
                reservation_date: new Date('2025-07-11'), 
                time_slot: '01:00-01:30', 
                seat_number: 21, 
                is_anonymous: false, 
            },
            {
                laboratory: 'G303', 
                reservation_date: new Date('2025-07-14'), 
                time_slot: '10:00-10:30', 
                seat_number: 10, 
                is_anonymous: false, 
            },
        ] 
    },
    {
        name: {first: 'Luis', last: 'Biacora'}, 
        email: 'luis_biacora@dlsu.edu.ph', 
        password: 'cybersec456', 
        user_type: 'faculty', 
        university: 'UP Diliman Graduate',
        profile_description: 'Interested in Cybersecurity', 
        current_reservations: []
    },
    {
        name: {first: 'Ramon', last: 'Alcaide'}, 
        email: 'ramon_alcaide@dlsu.edu.ph', 
        password: 'eleceng789', 
        user_type: 'faculty', 
        university: 'UP Diliman Graduate',
        profile_description: 'Interested in Electrical Engineering', 
        current_reservations: []
    }    
];


const sampleReservations = [
    {
        user_id: new mongoose.Types.ObjectId(),
        email: 'andre_chu@dlsu.edu.ph',
        laboratory: 'G302', 
        reservation_date: new Date('2025-07-09'), 
        time_slot: '08:00-08:30', 
        seat_number: 3, 
        is_anonymous: false, 
        status: 'active', 
        created_by: new mongoose.Types.ObjectId(),
        walk_in_reservation: false
    },
    {
        user_id: new mongoose.Types.ObjectId(),
        email: 'andre_chu@dlsu.edu.ph',
        laboratory: 'G301', 
        reservation_date: new Date('2025-07-21'), 
        time_slot: '11:30-12:00', 
        seat_number: 5, 
        is_anonymous: true, 
        status: 'active', 
        created_by: new mongoose.Types.ObjectId(),
        walk_in_reservation: false
    },
    {
        user_id: new mongoose.Types.ObjectId(),
        email: 'jesus_planta@dlsu.edu.ph',
        laboratory: 'G304', 
        reservation_date: new Date('2025-07-11'), 
        time_slot: '01:00-01:30', 
        seat_number: 21, 
        is_anonymous: false, 
        status: 'late', 
        created_by: new mongoose.Types.ObjectId(),
        walk_in_reservation: true
    },
    {
        user_id: new mongoose.Types.ObjectId(),
        email: 'jesus_planta@dlsu.edu.ph',
        laboratory: 'G303', 
        reservation_date: new Date('2025-07-14'), 
        time_slot: '10:00-10:30', 
        seat_number: 10, 
        is_anonymous: false, 
        status: 'cancelled', 
        created_by: new mongoose.Types.ObjectId(),
        walk_in_reservation: false
    },
    {
        user_id: new mongoose.Types.ObjectId(),
        email: 'joaquin_tin@dlsu.edu.ph',
        laboratory: 'G305', 
        reservation_date: new Date('2025-07-18'), 
        time_slot: '11:00-11:30', 
        seat_number:11, 
        is_anonymous: true, 
        status: 'active', 
        created_by: new mongoose.Types.ObjectId(),
        walk_in_reservation: true
    }    
];


async function seedTheDatabase(){
    try {

        //Clear existing data
        await UserProfile.deleteMany({});
        await Reservation.deleteMany({});

        const user = await UserProfile.insertMany(sampleUsers);
        console.log(`Inserted ${user.length} users`);
        
        const reserve = await Reservation.insertMany(sampleReservations);
        console.log(`Inserted ${reserve.length} reservations`);

        console.log('Database has been seeded.');
        process.exit(0);

    } catch (error){
        console.error('Error seeding the database: ', error);
        process.exit(1);
    }
}

seedTheDatabase();

