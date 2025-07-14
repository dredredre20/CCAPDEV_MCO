# ReserveALab - Lab Reservation System

A web-based laboratory reservation system for De La Salle University that allows students and technicians to reserve, manage, and view lab availability. Built with Node.js, Express, Handlebars, and MongoDB.

## Features

- **Student Portal**: Reserve labs, view availability, manage reservations
- **Technician Portal**: Manage lab reservations, edit/delete bookings, view statistics
- **Real-time Availability**: Dynamic slot checking and reservation management
- **User Authentication**: Secure login with role-based access control
- **Responsive Design**: Modern UI with mobile-friendly interface

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CCAPDEV_MCO-Planta-Code
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MongoDB**
   - Ensure MongoDB is running on your system
   - The application connects to `mongodb://localhost:27017/ReserveALabDB`

4. **Seed the database**
   ```bash
   node seed_db.js
   ```

5. **Start the server**
   ```bash
   node app.js
   ```

6. **Access the application**
   - Open your browser and go to `http://localhost:3000`

## Required Packages

The following packages are automatically installed when you run `npm install`:

- **express** - Web framework for Node.js
- **express-handlebars** - Template engine
- **mongoose** - MongoDB object modeling
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication
- **cookie-parser** - Cookie parsing middleware
- **body-parser** - Request body parsing
- **multer** - File upload handling

## Sample Login Credentials

After running the seed script, you can use these accounts:

### Students
- **Email**: juan_dela@dlsu.edu.ph | **Password**: password123
- **Email**: maria_santos@dlsu.edu.ph | **Password**: password123
- **Email**: pedro_garcia@dlsu.edu.ph | **Password**: password123

### Technicians
- **Email**: ana_reyes@dlsu.edu.ph | **Password**: password123
- **Email**: luis_martinez@dlsu.edu.ph | **Password**: password123

## Available Laboratories

- **G301** - 35 seats
- **G302** - 35 seats
- **G303** - 35 seats
- **G304** - 35 seats
- **G305** - 35 seats
