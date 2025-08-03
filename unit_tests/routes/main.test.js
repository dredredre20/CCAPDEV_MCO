const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const express = require('express');

// Mock models
const mockUserProfile = {
    findById: sinon.stub(),
    findOne: sinon.stub()
};
const mockReservation = {
    find: sinon.stub()
};
const mockLogError = sinon.stub();

const app = express();
app.use(express.urlencoded({ extended: true }));

// Mock module dependencies
const mainRouter = require('../../../routes/main');
app.use(mainRouter);

describe('Main Routes', () => {
    beforeEach(() => {
        sinon.resetHistory();
    });

    describe('GET /', () => {
        it('should render homepage with menu items', async () => {
            const res = await request(app).get('/');
            expect(res.status).to.equal(200);
            expect(res.text).to.include('ReserveALab Homepage');
        });
    });

    describe('GET /student', () => {
        it('should redirect to login when unauthenticated', async () => {
            const res = await request(app).get('/student');
            expect(res.status).to.equal(302);
            expect(res.header.location).to.include('/user-login');
        });

        it('should render dashboard when authenticated', async () => {
            mockUserProfile.findById.resolves({
                _id: '123',
                name: { first: 'John', last: 'Doe' },
                user_type: 'student'
            });
            mockReservation.find.resolves([]);
            
            const agent = request.agent(app);
            await agent
                .post('/user-login')
                .send({ email: 'test@dlsu.edu.ph', password: 'password' });
            
            const res = await agent.get('/student');
            expect(res.status).to.equal(200);
            expect(res.text).to.include('Student Dashboard');
        });
    });

    describe('GET /technician', () => {
        it('should show error when unauthenticated', async () => {
            const res = await request(app).get('/technician');
            expect(res.status).to.equal(200);
            expect(res.text).to.include('Please log in as a technician');
        });
    });

    // Add tests for other routes following similar patterns
});