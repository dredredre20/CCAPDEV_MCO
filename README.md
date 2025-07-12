# ReserveALab Setup

## Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally

## Setup

1. Clone the repository and navigate to the project folder.
2. Install dependencies:
   ```
   npm install
   ```
3. Seed the database:
   ```
   node seed_db.js
   ```
4. Start the server:
   ```
   node app.js
   ```
5. Open your browser and go to `http://localhost:3000`

## Project Structure

- `app.js` - Main server file
- `routes/` - Express route handlers
- `controllers/` - Controller logic
- `models/` - Mongoose models
- `views/` - Handlebars templates
- `public/css/` - CSS files
- `public/js/` - JS files

## Features

- User registration, login, logout, profile management
- Reserve, view, edit, and remove lab reservations
- Technician and student roles
- Responsive UI

First Installation of Packages and other requirements:
1. npm init
2. npm i express
3. npm install express-handlebars
4. npm install mongodb
5. npm install mongoose


WHEN RUNNING MCO2:
1. node seed_db.js (add data to the database first)
2. node app.js
3. Enter the http link in your browser


