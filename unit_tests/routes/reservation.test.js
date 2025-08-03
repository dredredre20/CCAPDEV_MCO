const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const express = require('express');
const session = require('express-session');

// Mock dependencies
const mockReservationController = {
    reserveSlot: sinon.stub(),
    viewAvailability: sinon.stub(),
    editReservation: sinon.stub(),
    deleteReservation: sinon.stub(),
    blockSlot: sinon.stub(),
    reserveForStudent: sinon.stub()
};

// Setup express app
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

// Inject mocked controller into router
const proxyquire = require('proxyquire');
const reservationRouter = proxyquire('../../../routes/reservation', {
    '../controllers/reservationController': mockReservationController
});
app.use('/reservation', reservationRouter);

describe('Reservation Routes', () => {
    beforeEach(() => {
        sinon.resetHistory();
    });

    it('GET /view should call viewAvailability', async () => {
        mockReservationController.viewAvailability.callsFake((req, res) => res.send('Viewing availability'));
        const res = await request(app).get('/reservation/view');
        expect(res.text).to.include('Viewing availability');
        expect(mockReservationController.viewAvailability.calledOnce).to.be.true;
    });

    it('POST /create should call reserveSlot', async () => {
        mockReservationController.reserveSlot.callsFake((req, res) => res.send('Reserved'));
        const res = await request(app).post('/reservation/create');
        expect(res.text).to.include('Reserved');
        expect(mockReservationController.reserveSlot.calledOnce).to.be.true;
    });

    it('POST /edit/:id should call editReservation', async () => {
        mockReservationController.editReservation.callsFake((req, res) => res.send('Edited'));
        const res = await request(app).post('/reservation/edit/123');
        expect(res.text).to.include('Edited');
        expect(mockReservationController.editReservation.calledOnce).to.be.true;
    });

    it('POST /delete/:id should call deleteReservation', async () => {
        mockReservationController.deleteReservation.callsFake((req, res) => res.send('Deleted'));
        const res = await request(app).post('/reservation/delete/123');
        expect(res.text).to.include('Deleted');
        expect(mockReservationController.deleteReservation.calledOnce).to.be.true;
    });

    it('POST /block should call blockSlot', async () => {
        mockReservationController.blockSlot.callsFake((req, res) => res.send('Blocked'));
        const res = await request(app).post('/reservation/block');
        expect(res.text).to.include('Blocked');
        expect(mockReservationController.blockSlot.calledOnce).to.be.true;
    });

    it('POST /student-reserve should call reserveForStudent', async () => {
        mockReservationController.reserveForStudent.callsFake((req, res) => res.send('Student reserved'));
        const res = await request(app).post('/reservation/student-reserve');
        expect(res.text).to.include('Student reserved');
        expect(mockReservationController.reserveForStudent.calledOnce).to.be.true;
    });
});
