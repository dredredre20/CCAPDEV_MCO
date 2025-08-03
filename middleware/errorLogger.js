const { ErrorLog } = require('../models/ErrorLog');

const logError = async (error, req, res, next) => {
  try {
    const errorLog = new ErrorLog({
      message: error.message,
      stack: error.stack,
      userId: req.session.userId,
      route: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    await errorLog.save();
    console.error('Error logged to database:', error.message);
  } catch (logError) {
    console.error('Failed to log error to database:', logError.message);
  }
  
  next(error);
};

const logErrorAsync = async (error, req) => {
  try {
    const errorLog = new ErrorLog({
      message: error.message,
      stack: error.stack,
      userId: req.session.userId,
      route: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    await errorLog.save();
    console.error('Error logged to database:', error.message);
  } catch (logError) {
    console.error('Failed to log error to database:', logError.message);
  }
};

module.exports = {
  logError,
  logErrorAsync
};
