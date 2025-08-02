const ErrorLog = require('../models/ErrorLog');


async function logError(err, context = {}){
    try {

        const logEntry = new ErrorLog({
            message: err.message, 
            stack: err.stack, 
            route: context.route || 'N/A', 
            userId: context.userId || null
        });

        await logEntry.save();

    } catch (loggingError) {
        console.error('Failed to save error log:', loggingError);
    }
}

module.exports = logError;

