// IMPORTANT: In a production app, use environment variables for secrets!
const JWT_SECRET = 'your_jwt_secret_key_for_access_token';
const JWT_REFRESH_SECRET = 'your_jwt_refresh_secret_key_for_refresh_token';

const crypto = require('crypto'); // Added crypto
const User = require('./model');
const bcrypt = require('bcryptjs'); 
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken'); 

const getUsers = (req, res, next) => {
    User.find()
        .then(response => {
            res.json({ response });
        })
        .catch(error => {
            res.json({ error });
        });
};

const addUser = (req, res, next) => {
    // This function likely needs to be updated or removed in favor of registerUser
    // For now, keeping it as is, but it might conflict with new user schema
    const user = new User({
        // Assuming old schema, will need update for username, email, password
        id: req.body.id, 
        name: req.body.name, 
    });

    user.save()
        .then(response => {
            res.json({ response });
        })
        .catch(error => {
            res.json({ error });
        });
};

const updateUser = (req, res, next) => {
    // This function likely needs to be updated for new schema
    const { id, name } = req.body; // Old fields

    User.updateOne({ id: id }, { $set: { name: name } }) // Uses old 'id' field
        .then(response => {
            res.json({ response });
        })
        .catch(error => {
            res.json({ error });
        });
};

const deleteUser = (req, res, next) => {
    // This function likely needs to be updated for new schema
    const id = req.body.id; // Uses old 'id' field

    User.deleteOne({ id: id }) // Uses old 'id' field
        .then(response => {
            res.json({ response });
        })
        .catch(error => {
            res.json({ error });
        });
};

// New function for user registration
const registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
        let userByEmail = await User.findOne({ email });
        if (userByEmail) {
            return res.status(400).json({ errors: [{ msg: 'User with this email already exists' }] });
        }

        let userByUsername = await User.findOne({ username });
        if (userByUsername) {
            return res.status(400).json({ errors: [{ msg: 'User with this username already exists' }] });
        }

        const user = new User({
            username,
            email,
            password,
            // roles will be set by default based on the model
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // For now, just a success message. Later we might return a token or user object.
        res.status(201).json({ msg: 'User registered successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

exports.getUsers = getUsers;
exports.addUser = addUser; // This might be removed or refactored later
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.registerUser = registerUser;

// New function for user login
const loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
        }

        const accessTokenPayload = {
            user: {
                id: user.id, // Mongoose uses 'id' as a virtual getter for '_id'
                roles: user.roles
            }
        };

        const accessToken = jwt.sign(
            accessTokenPayload,
            JWT_SECRET, // Defined at the top of the file
            { expiresIn: '15m' }
        );

        const refreshTokenPayload = {
            user: {
                id: user.id
            }
        };

        const refreshToken = jwt.sign(
            refreshTokenPayload,
            JWT_REFRESH_SECRET, // Defined at the top of the file
            { expiresIn: '7d' }
        );

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            // path: '/api/auth', // Optional: scope cookie to auth routes
            // sameSite: 'strict' // Optional: for CSRF protection
        });

        res.json({
            accessToken,
            user: { // Send back some user info, excluding password
                id: user.id,
                username: user.username,
                email: user.email,
                roles: user.roles
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
exports.loginUser = loginUser; // Export the new function

// Function to refresh access token
const refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken;

    if (!token) {
        return res.status(401).json({ msg: 'No refresh token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
        
        // Check if user still exists (optional, but good practice)
        const user = await User.findById(decoded.user.id);
        if (!user) {
            return res.status(401).json({ msg: 'User not found, authorization denied' });
        }

        // Generate new access token
        const accessTokenPayload = {
            user: {
                id: user.id,
                roles: user.roles
            }
        };

        const newAccessToken = jwt.sign(
            accessTokenPayload,
            JWT_SECRET,
            { expiresIn: '15m' } // Same expiration as original access token
        );

        res.json({ accessToken: newAccessToken });

    } catch (err) {
        console.error('Refresh token verification failed:', err.message);
        // If refresh token is invalid or expired
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            // Optionally, clear the cookie if the refresh token is bad
            // res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
            return res.status(403).json({ msg: 'Refresh token is not valid, please login again' });
        }
        res.status(500).send('Server error');
    }
};
exports.refreshToken = refreshToken; // Export the new function

// Function to logout user
const logoutUser = (req, res) => {
    // The primary action of logout on the backend for a JWT-based system
    // where the refresh token is an httpOnly cookie is to clear that cookie.
    res.cookie('refreshToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Match settings used when setting it
        expires: new Date(0), // Set expiry to a past date
        // path: '/api/auth', // Optional: ensure path matches if set during login
        // sameSite: 'strict' // Optional: ensure sameSite matches if set during login
    });
    res.status(200).json({ msg: 'User logged out successfully' });
};
exports.logoutUser = logoutUser; // Export the new function

// Function to request password reset
const requestPasswordReset = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            // Important: Do not reveal if an email address is registered or not.
            // Send a generic success message to prevent user enumeration.
            return res.status(200).json({ msg: 'If your email is registered, you will receive a password reset link.' });
        }

        // Generate a reset token (plain token for email, hashed for DB)
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Hash the token before saving to DB
        // Need to select the fields to be able to save them, as they are select: false in schema
        const userWithPasswordFields = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires');
        if (!userWithPasswordFields) {
             // Should not happen if user was found above, but as a safeguard
            return res.status(404).json({ msg: 'User not found after attempting to select password fields.'});
        }

        userWithPasswordFields.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        // Set expiration (e.g., 1 hour from now)
        userWithPasswordFields.passwordResetExpires = Date.now() + 3600000; // 1 hour in milliseconds

        await userWithPasswordFields.save();

        // Simulate sending email (in a real app, use an email library like nodemailer)
        console.log('Password Reset Email Simulation:');
        console.log(`To: ${userWithPasswordFields.email}`);
        console.log(`Subject: Password Reset Request`);
        // IMPORTANT: The link should point to your FRONTEND URL that handles password reset.
        // The frontend will then make an API call to the /reset-password endpoint with this token.
        console.log(`Reset Link: http://<your-frontend-url>/reset-password/${resetToken}`);
        console.log('--- End of Email Simulation ---');
        
        // Again, send a generic success message
        res.status(200).json({ msg: 'If your email is registered, you will receive a password reset link.' });

    } catch (err) {
        console.error('Error in requestPasswordReset:', err.message);
        // Generic error to client, specific log on server
        res.status(500).send('Server error');
    }
};
exports.requestPasswordReset = requestPasswordReset; // Export the new function

// Function to reset password
const resetPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { password } = req.body;
    const { resetToken } = req.params; // Get token from URL parameter

    try {
        // Hash the token from the URL to match the one stored in DB
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Find user by the hashed token and check if token has not expired
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() } // Check if current time is less than expiry time
        }).select('+passwordResetToken +passwordResetExpires'); // Explicitly select these fields

        if (!user) {
            return res.status(400).json({ errors: [{ msg: 'Password reset token is invalid or has expired.' }] });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Clear the reset token fields
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        // Note: Mongoose knows 'undefined' means to $unset the field.

        await user.save();

        res.status(200).json({ msg: 'Password has been reset successfully.' });

    } catch (err) {
        console.error('Error in resetPassword:', err.message);
        res.status(500).send('Server error');
    }
};
exports.resetPassword = resetPassword; // Export the new function
