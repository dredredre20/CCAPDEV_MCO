/*const { reserveSlot } = require('../../../controllers/reservationController');
const { UserProfile } = require('../../../models/User');
const { Reservation } = require('../../../models/Reservation');
const { ReservationSlot } = require('../../../models/ReservationSlot');

// Mock dependencies
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
  
  mockReservation.findOne = jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(null) // Properly mock lean()
  });
  
  return { Reservation: mockReservation };
});

// Update ReservationSlot mock
jest.mock('../../../models/ReservationSlot', () => {
  const mockSlotInstance = {
    canBeReserved: jest.fn(() => true),
    reserve: jest.fn(),
    save: jest.fn().mockResolvedValue(true),
  };
  
  const ReservationSlot = jest.fn().mockImplementation(() => mockSlotInstance);
  ReservationSlot.findOne = jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(mockSlotInstance) // Mock lean() properly
  });
  
  return { ReservationSlot };
});

// Mock logError function
jest.mock('../../../utils/logger', () => ({
  logError: jest.fn(),
}), { virtual: true });

// If logError is imported directly in the controller, you might need to mock it this way:
global.logError = jest.fn();

describe('reserveSlot functionality', () => {
  const mockReq = {
    body: {
      laboratory: 'G301',
      reservation_date: '2025-08-10',
      time_slot: '10:00',
      seat_number: 5,
      purpose: 'Testing'
    },
    query: { userId: 'student123' },
    originalUrl: '/test-route',
    session: { userId: 'student123' }
  };
  
  const mockRes = {
    redirect: jest.fn()
  };

  const mockUser = {
    _id: 'student123',
    user_type: 'student',
    current_reservations: [],
    save: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup the chain: UserProfile.findById().lean()
    const mockUserLean = jest.fn().mockResolvedValue(mockUser);
    const mockUserFindById = jest.fn().mockReturnValue({ lean: mockUserLean });
    UserProfile.findById = mockUserFindById;
    
    // Setup the chain: ReservationSlot.findOne().lean()
    const mockSlotLean = jest.fn();
    const mockSlotFindOne = jest.fn().mockReturnValue({ lean: mockSlotLean });
    ReservationSlot.findOne = mockSlotFindOne;
  });

  test('successfully reserves available slot', async () => {
    // Mock slot availability
    const mockSlot = {
      canBeReserved: () => true,
      reserve: jest.fn(),
      save: jest.fn()
    };
    
    // Setup ReservationSlot.findOne().lean() chain
    ReservationSlot.findOne().lean.mockResolvedValue(mockSlot);
    Reservation.findOne.mockResolvedValue(null); // No existing reservation

    await reserveSlot(mockReq, mockRes);
    
    expect(mockRes.redirect).toHaveBeenCalledWith(
      expect.stringContaining('success=Reservation created')
    );
  });

  test('rejects reservation for past date', async () => {
    const pastReq = {
      ...mockReq,
      body: {
        ...mockReq.body,
        reservation_date: '2020-01-01'  // Past date
      }
    };
    
    await reserveSlot(pastReq, mockRes);
    
    expect(mockRes.redirect).toHaveBeenCalledWith(
      expect.stringContaining('error=Cannot make reservations for past dates')
    );
  });

  test('blocks double-booking same timeslot', async () => {
    // Mock existing reservation

    Reservation.findOne = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'existing' }) // Return actual value
    });
    
    Reservation.findOne.mockResolvedValue({ _id: 'existing' });
    // Still need to mock the slot lean chain even though it won't be reached
    ReservationSlot.findOne().lean.mockResolvedValue(null);
    
    await reserveSlot(mockReq, mockRes);
    
    expect(mockRes.redirect).toHaveBeenCalledWith(
      expect.stringContaining('error=You already have a reservation')
    );
  });

  test('handles unavailable slot', async () => {
    // Mock slot as unavailable
    const mockSlot = {
      canBeReserved: () => false,
    };
    ReservationSlot.findOne().lean.mockResolvedValue(mockSlot);
    Reservation.findOne.mockResolvedValue(null); // No existing reservation
    
    await reserveSlot(mockReq, mockRes);
    
    expect(mockRes.redirect).toHaveBeenCalledWith(
      expect.stringContaining('error=')
    );
  });
});*/