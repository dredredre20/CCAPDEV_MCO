const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const express = require('express');
const session = require('express-session');

// Mock dependencies
const mockUserController = {
    viewProfile: sinon.stub(),
    editProfile: sinon.stub(),
    deleteAccount: sinon.stub()
};

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

// Proxy the controller
const proxyquire = require('proxyquire');
const profileRouter = proxyquire('../../../routes/profile', {
    '../controllers/userController': mockUserController
});
app.use('/profile', profileRouter);

describe('Profile Routes', () => {
    beforeEach(() => {
        sinon.resetHistory();
    });

    it('GET / should call viewProfile', async () => {
        mockUserController.viewProfile.callsFake((req, res) => res.send('Viewing profile'));
        const res = await request(app).get('/profile');
        expect(res.text).to.include('Viewing profile');
        expect(mockUserController.viewProfile.calledOnce).to.be.true;
    });

    it('POST /edit should call editProfile', async () => {
        mockUserController.editProfile.callsFake((req, res) => res.send('Profile edited'));
        const res = await request(app).post('/profile/edit');
        expect(res.text).to.include('Profile edited');
        expect(mockUserController.editProfile.calledOnce).to.be.true;
    });

    it('POST /delete should call deleteAccount', async () => {
        mockUserController.deleteAccount.callsFake((req, res) => res.send('Account deleted'));
        const res = await request(app).post('/profile/delete');
        expect(res.text).to.include('Account deleted');
        expect(mockUserController.deleteAccount.calledOnce).to.be.true;
    });
});
