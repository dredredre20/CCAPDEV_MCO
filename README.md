First Installation of Packages and other requirements:
1. npm init
2. npm i express
3. npm install mongodb
4. npm install mongoose

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


