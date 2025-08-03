const authenticateUser = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/user-login?error=Please log in to access this page');
  }
  next();
};

const authorizeStudent = (req, res, next) => {
  if (!req.session.userType || req.session.userType !== 'student') {
    return res.redirect('/user-login?error=Access denied. Student only.');
  }
  next();
};

const authorizeTechnician = (req, res, next) => {
  if (!req.session.userType || req.session.userType !== 'technician') {
    return res.redirect('/user-login?error=Access denied. Technician only.');
  }
  next();
};

module.exports = {
  authenticateUser,
  authorizeStudent,
  authorizeTechnician
};
