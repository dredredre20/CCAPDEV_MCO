const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const express = require('express');
const session = require('express-session');

// Mock models
const mockUserProfile = {
    findById: sinon.stub()
};
const mockReservation = {
    find: sinon.stub()
};
const mockLogError = sinon.stub();

// Express app setup
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

// Mock session middleware
app.use((req, res, next) => {
    req.session.userId = 'student123';
    req.session.userType = 'student';
    next();
});

// Replace with your actual router path
const studentRouter = require('../../../routes/student');
app.use('/student', studentRouter);

describe('Student Routes', () => {
    beforeEach(() => {
        sinon.resetHistory();
    });

    describe('GET /student', () => {
        it('should render the student dashboard if authenticated and user type is student', async () => {
            mockUserProfile.findById.resolves({
                _id: 'student123',
                name: { first: 'Test', last: 'Student' },
                user_type: 'student'
            });

            mockReservation.find.resolves([]);

            const res = await request(app).get('/student');
            expect(res.status).to.equal(200);
            expect(res.text).to.include('Student Dashboard');
        });

        it('should redirect to login if user type is not student', async () => {
            app.use((req, res, next) => {
                req.session.userType = 'technician';
                next();
            });

            const res = await request(app).get('/student');
            expect(res.status).to.equal(302);
            expect(res.header.location).to.include('/user-login');
        });
    });
});
