const mongoose = require('mongoose');

const connectDB = async () => {
  await mongoose.connect('mongodb://localhost/ReserveALabDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('MongoDB connected');
};

module.exports = {
  connectDB,
  mongoose
};

