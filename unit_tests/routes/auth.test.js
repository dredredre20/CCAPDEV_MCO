const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const bcrypt = require('bcrypt');
const express = require('express');
const session = require('express-session');

// Mock dependencies
const mockUserProfile = {
    findOne: sinon.stub(),
    save: sinon.stub()
};
const mockLogError = sinon.stub();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

// Mock module dependencies
const authRouter = require('../../../routes/auth');
app.use(authRouter);

describe('Authentication Routes', () => {
    beforeEach(() => {
        sinon.resetHistory();
    });

    describe('POST /user-registration', () => {
        it('should redirect with error when missing required fields', async () => {
            const res = await request(app)
                .post('/user-registration')
                .send({});
            
            expect(res.status).to.equal(302);
            expect(res.header.location).to.include('?error=All fields are required');
        });

        it('should create user on valid registration', async () => {
            mockUserProfile.findOne.resolves(null);
            mockUserProfile.save.resolves();
            
            const res = await request(app)
                .post('/user-registration')
                .send({
                    first: 'John',
                    last: 'Doe',
                    email: 'john_doe@dlsu.edu.ph',
                    password: 'password123',
                    user_type: 'student'
                });
            
            expect(res.status).to.equal(302);
            expect(res.header.location).to.include('?success=Registration successful');
        });
    });

    describe('POST /user-login', () => {
        it('should set session on valid credentials', async () => {
            const mockUser = {
                _id: '123',
                user_type: 'student',
                password: await bcrypt.hash('password123', 10),
                save: sinon.stub().resolves()
            };
            mockUserProfile.findOne.resolves(mockUser);
            
            const res = await request(app)
                .post('/user-login')
                .send({
                    email: 'john_doe@dlsu.edu.ph',
                    password: 'password123',
                    remember_me: 'on'
                });
            
            expect(res.status).to.equal(302);
            expect(res.header.location).to.equal('/student');
        });
    });

    describe('GET /logout', () => {
        it('should destroy session and redirect', async () => {
            const res = await request(app)
                .get('/logout');
            
            expect(res.status).to.equal(302);
            expect(res.header.location).to.equal('/user-login');
        });
    });
});