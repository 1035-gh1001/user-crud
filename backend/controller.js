// IMPORTANT: In a production app, use environment variables for secrets!
const JWT_SECRET = 'your_jwt_secret_key_for_access_token';
const JWT_REFRESH_SECRET = 'your_jwt_refresh_secret_key_for_refresh_token';

const User = require('./model');
const bcrypt = require('bcryptjs'); 
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken'); // Added jsonwebtoken

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
