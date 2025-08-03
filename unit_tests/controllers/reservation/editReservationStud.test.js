/*const { editReservation } = require('../../../controllers/reservationController');
const { UserProfile } = require('../../../models/User');
const { Reservation } = require('../../../models/Reservation');
const { ReservationSlot } = require('../../../models/ReservationSlot');

jest.mock('../../../models/User', () => ({
  UserProfile: {
    findById: jest.fn().mockReturnValue({
      lean: jest.fn(),
    }),
  }
}));

jest.mock('../../../models/Reservation', () => {
  const mockReservation = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(true),
  }));
  
  mockReservation.findById = jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue({}) // Properly mock lean()
  });
  
  return { Reservation: mockReservation };
});

jest.mock('../../../models/ReservationSlot', () => ({
  ReservationSlot: {
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn(),
    }),
  }
}));

// Mock logError function if it's used
jest.mock('../../../utils/logger', () => ({
  logError: jest.fn(),
}), { virtual: true });

// If logError is imported directly in the controller, you might need to mock it this way:
global.logError = jest.fn();

describe('editReservation functionality', () => {
  const mockReq = {
    body: {
      reservationId: 'res456',
      laboratory: 'G302',
      reservation_date: '2025-08-11',
      time_slot: '11:00',
      seat_number: 7
    },
    query: { userId: 'student123' },
    session: { userId: 'student123' }
  };
  
  const mockRes = { redirect: jest.fn() };
  const mockReservation = {
    _id: 'res456',
    user_id: 'student123',
    laboratory: 'G301',
    reservation_date: new Date('2025-08-10'),
    time_slot: '10:00',
    seat_number: 5,
    save: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup UserProfile.findById().lean() chain
    const mockUser = {
      _id: 'student123',
      user_type: 'student'
    };
    const mockUserLean = jest.fn().mockResolvedValue(mockUser);
    UserProfile.findById.mockReturnValue({ lean: mockUserLean });
    
    // Setup Reservation.findById
    Reservation.findById.mockResolvedValue(mockReservation);
    
    // Setup ReservationSlot.findOne().lean() chain
    const mockSlotLean = jest.fn();
    ReservationSlot.findOne.mockReturnValue({ lean: mockSlotLean });
  });

  test('successfully updates reservation', async () => {
    // Mock new slot availability
    const mockNewSlot = {
      canBeReserved: () => true,
      reserve: jest.fn(),
      save: jest.fn()
    };
    
    // Mock old slot
    const mockOldSlot = {
      release: jest.fn(),
      save: jest.fn()
    };
    
    // Handle multiple slot queries with lean()
    ReservationSlot.findOne().lean
      .mockResolvedValueOnce(mockNewSlot)  // New slot
      .mockResolvedValueOnce(mockOldSlot); // Old slot

    await editReservation(mockReq, mockRes);
    
    expect(mockReservation.save).toHaveBeenCalled();
    expect(mockReservation.laboratory).toBe('G302');
    expect(mockRes.redirect).toHaveBeenCalledWith(
      expect.stringContaining('success=Reservation updated')
    );
  });

  test('prevents updating to unavailable slot', async () => {
    // Mock slot as unavailable
    ReservationSlot.findOne().lean.mockResolvedValue({
      canBeReserved: () => false
    });
    
    await editReservation(mockReq, mockRes);
    
    expect(mockRes.redirect).toHaveBeenCalledWith(
      expect.stringContaining('error=New slot is not available')
    );
  });
});*/