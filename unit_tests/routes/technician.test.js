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

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

// Mock session middleware
app.use((req, res, next) => {
    req.session.userId = 'tech123';
    req.session.userType = 'technician';
    next();
});

// Replace with your actual router path
const technicianRouter = require('../../../routes/technician');
app.use('/technician', technicianRouter);

describe('Technician Routes', () => {
    beforeEach(() => {
        sinon.resetHistory();
    });

    describe('GET /technician', () => {
        it('should render technician dashboard if authenticated and user is technician', async () => {
            mockUserProfile.findById.resolves({
                _id: 'tech123',
                name: { first: 'Tech', last: 'Nician' },
                user_type: 'technician'
            });

            mockReservation.find.resolves([]);

            const res = await request(app).get('/technician');
            expect(res.status).to.equal(200);
            expect(res.text).to.include('Technician Dashboard');
        });

        it('should redirect to login if user is not technician', async () => {
            app.use((req, res, next) => {
                req.session.userType = 'student';
                next();
            });

            const res = await request(app).get('/technician');
            expect(res.status).to.equal(302);
            expect(res.header.location).to.include('/user-login');
        });
    });
});
