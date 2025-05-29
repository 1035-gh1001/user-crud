const jwt = require('jsonwebtoken');
// IMPORTANT: In a production app, use environment variables for secrets!
const JWT_SECRET = 'your_jwt_secret_key_for_access_token'; // Temporary, should be process.env.JWT_SECRET

const protect = (req, res, next) => {
    let token;

    // Check for token in Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (e.g., "Bearer <token>")
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, JWT_SECRET);

            // Attach user to request object (excluding password)
            // Assuming the decoded payload has a 'user' object like { id: '...', roles: ['...'] }
            req.user = decoded.user; 

            next(); // Proceed to the next middleware or route handler
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ msg: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ msg: 'Not authorized, no token' });
    }
};

const checkRole = (requiredRoles) => {
    return (req, res, next) => {
        // Ensure req.user is populated by the 'protect' middleware running before this.
        if (!req.user || !req.user.roles) {
            return res.status(403).json({ msg: 'Forbidden: User roles not available.' });
        }

        const hasRequiredRole = req.user.roles.some(role => requiredRoles.includes(role));

        if (!hasRequiredRole) {
            return res.status(403).json({ msg: 'Forbidden: You do not have the required role for this action.' });
        }
        next(); // User has at least one of the required roles
    };
};

module.exports = { protect, checkRole }; // Update exports
