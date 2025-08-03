/*const { deleteUserAccount } = require('../../../controllers/reservationController');
const { UserProfile } = require('../../../models/User');
const { Reservation } = require('../../../models/Reservation');
const { ReservationSlot } = require('../../../models/ReservationSlot');

jest.mock('../../../models/User', () => ({
  UserProfile: {
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  }
}));

jest.mock('../../../models/Reservation', () => ({
  Reservation: {
    find: jest.fn(),
  }
}));

jest.mock('../../../models/ReservationSlot', () => ({
  ReservationSlot: {
    findOne: jest.fn(),
  }
}));

// Mock logError function if it's used
jest.mock('../../../utils/logger', () => ({
  logError: jest.fn(),
}), { virtual: true });

describe('deleteUserAccount functionality', () => {
  const mockReq = {
    body: {
      userId: 'student123',
      password: 'correctPassword'
    }
  };
  
  const mockRes = { redirect: jest.fn() };
  const mockUser = {
    _id: 'student123',
    password: 'correctPassword',
    current_reservations: ['res1', 'res2'],
    save: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    UserProfile.findById.mockResolvedValue(mockUser);
  });

  test('successfully deletes account with reservations', async () => {
    // Mock reservations to cancel
    const mockReservations = [
      { 
        _id: 'res1', 
        laboratory: 'G301',
        reservation_date: new Date('2025-08-10'),
        time_slot: '10:00',
        seat_number: 5,
        status: 'active',
        save: jest.fn() 
      },
      { 
        _id: 'res2', 
        laboratory: 'G302',
        reservation_date: new Date('2025-08-10'),
        time_slot: '11:00',
        seat_number: 3,
        status: 'active',
        save: jest.fn() 
      }
    ];
    Reservation.find.mockResolvedValue(mockReservations);
    
    // Mock slot releases
    const mockSlot1 = { release: jest.fn() };
    const mockSlot2 = { release: jest.fn() };
    ReservationSlot.findOne
      .mockResolvedValueOnce(mockSlot1)
      .mockResolvedValueOnce(mockSlot2);

    await deleteUserAccount(mockReq, mockRes);
    
    // Verify reservations are cancelled
    expect(mockReservations[0].status).toBe('cancelled');
    expect(mockReservations[1].status).toBe('cancelled');
    
    // Verify slots are released
    expect(mockSlot1.release).toHaveBeenCalled();
    expect(mockSlot2.release).toHaveBeenCalled();
    
    // Verify user is deleted
    expect(UserProfile.findByIdAndDelete).toHaveBeenCalledWith('student123');
    expect(mockRes.redirect).toHaveBeenCalledWith(
      expect.stringContaining('success=Account deleted')
    );
  });

  test('rejects incorrect password', async () => {
    const invalidReq = {
      body: {
        userId: 'student123',
        password: 'wrongPassword'
      }
    };
    
    await deleteUserAccount(invalidReq, mockRes);
    
    expect(mockRes.redirect).toHaveBeenCalledWith(
      expect.stringContaining('error=Incorrect password')
    );
  });
});*/