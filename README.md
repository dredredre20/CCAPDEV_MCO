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

======================================================================================
CURRENT FILE STRUCTURE WHEN SETTING UP:
Root Folder (Main MCO2 Folder)
- package.json
- package-lock.json
- app.js
- seed_db.js
- node_modules (folder)
- routes (folder)
    - auth.js
    - student.js
    - technician.js
    - main.js
- view (folder)
    - partials (folder inside view)
       - header.hbs (haven't really used header and side-panel
                     at the moment but im going to just leave them there)
       - side-panel.hbs
    - layouts (folder inside view)
       - main.hbs
    - all other hbs files, the html files we turned into hbs
- public (folder)
    - js (folder)
    - css (folder)
- models (folder)
======================================================================================

WHEN RUNNING MCO2:
1. node seed_db.js (add data to the database first)
2. node app.js
3. Enter the http link in your browser


