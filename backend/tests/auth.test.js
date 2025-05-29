const request = require('supertest');
const app = require('../app'); // Your Express app
const mongoose = require('mongoose');
const User = require('../model'); // Your User model

// IMPORTANT: Use a test-specific database URI
let TEST_MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/user-crud-test-db'; // Default

// Attempt to use the main MONGO_URI but with a different DB name for tests
if (process.env.MONGO_URI) {
    const mainUri = process.env.MONGO_URI;
    // Try to replace the database name in the main URI
    // This is a common pattern: mongodb://host/dbname -> mongodb://host/dbname_test
    // This regex attempts to find the part after the last '/' and before '?' or end of string
    TEST_MONGO_URI = mainUri.replace(/(\/[^/?]+)(\?.*)?$/, `$1_test_auth${mainUri.includes('?') ? '' : ''}`);
    if (TEST_MONGO_URI === mainUri) { // If replace didn't change, append _test_auth
        TEST_MONGO_URI = `${mainUri}${mainUri.endsWith('/') ? '' : '/'}user_crud_test_auth_db_alt`;
    }
}
console.log(`Using Test MongoDB URI: ${TEST_MONGO_URI}`);


beforeAll(async () => {
    // If mongoose is already connected by the app import, disconnect it first
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    // Connect to the test database
    await mongoose.connect(TEST_MONGO_URI, {
        // useNewUrlParser: true, // no longer needed
        // useUnifiedTopology: true, // no longer needed
        // useCreateIndex: true, // no longer needed in new mongoose versions
        // useFindAndModify: false // no longer needed
    });
});

beforeEach(async () => {
    // Clear the User collection before each test
    await User.deleteMany({});
});

afterAll(async () => {
    // Clean up and disconnect from the test database
    await User.deleteMany({});
    await mongoose.disconnect();
});

describe('Auth API - Registration', () => {
    it('should register a new user successfully', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('msg', 'User registered successfully');
    });

    it('should not register a user with a duplicate email', async () => {
        await User.create({ // Pre-populate DB directly for this test case
            username: 'testuser1',
            email: 'duplicate@example.com',
            password: 'password123' // Password hashing is done by model/controller, not needed here for pre-population
        });
        
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser2',
                email: 'duplicate@example.com',
                password: 'password123'
            });
        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0]).toHaveProperty('msg', 'User with this email already exists');
    });

    it('should not register a user with a duplicate username', async () => {
        await User.create({
            username: 'duplicateuser',
            email: 'test1@example.com',
            password: 'password123'
        });

        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'duplicateuser', // Duplicate username
                email: 'test2@example.com',
                password: 'password123'
            });
        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0]).toHaveProperty('msg', 'User with this username already exists');
    });

    it('should not register a user with a short password', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser3',
                email: 'test3@example.com',
                password: '123' // Short password
            });
        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0]).toHaveProperty('msg', 'Password must be 6 or more characters');
    });
    
    it('should not register a user with an invalid email', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser4',
                email: 'notanemail', // Invalid email
                password: 'password123'
            });
        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0]).toHaveProperty('msg', 'Please include a valid email');
    });
});

// Add describe blocks for Login, Refresh Token, etc. later
