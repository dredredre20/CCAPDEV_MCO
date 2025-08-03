const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// Register
router.get('/register', sessionController.getRegister);
router.post('/register', sessionController.postRegister);

// Login
router.get('/login', sessionController.getLogin);
router.post('/login', sessionController.postLogin);

// Logout
router.get('/logout', sessionController.logout);

module.exports = router;
