const express = require('express');
const { body } = require('express-validator'); // Import body from express-validator
const controller = require('./controller');
const { protect, checkRole } = require('./middleware/authMiddleware'); // Corrected path and added checkRole

const router = express.Router();

// Apply protect middleware to user CRUD routes
router.get('/users', protect, controller.getUsers);
router.post('/createuser', protect, controller.addUser);
router.post('/updateuser', protect, controller.updateUser);
router.post('/deleteuser', protect, controller.deleteUser);

// Add new auth route
router.post(
    '/auth/register', // will become /api/auth/register
    [
        body('username', 'Username is required').trim().notEmpty(),
        body('email', 'Please include a valid email').isEmail().normalizeEmail(),
        body('password', 'Password must be 6 or more characters').isLength({ min: 6 })
    ],
    controller.registerUser // This function will be created/updated in controller.js
);

// Add new login route
router.post(
    '/auth/login', // will become /api/auth/login
    [
        body('email', 'Please include a valid email').isEmail(),
        body('password', 'Password is required').exists()
    ],
    controller.loginUser // This function will be created in controller.js
);

// Add new refresh token route
router.post('/auth/refresh-token', controller.refreshToken); // Will be /api/auth/refresh-token

// Add new logout route
router.post('/auth/logout', controller.logoutUser); // Will be /api/auth/logout

// Route for requesting a password reset
router.post(
    '/auth/request-password-reset',
    [
        body('email', 'Please provide a valid email').isEmail()
    ],
    controller.requestPasswordReset
);

// Route for resetting the password
router.post(
    '/auth/reset-password/:resetToken', // Token as URL parameter
    [
        body('password', 'Password must be 6 or more characters').isLength({ min: 6 })
    ],
    controller.resetPassword
);

module.exports = router;
