const express = require('express');

const {
  register,
  login,
  sendResetPasswordLink,
  resetPassword,
  getAdmins,
  getAdmin,
  createAdmin,
  updateAdmin,
  deleteAccount,
  deleteAccountByEmail,
  deleteAdminAccount,
  getUsers,
  getUserById,
  getUserJobs,
  getUsersDashboard,
  getCompanies,
  getCompanyById,
  getCompaniesDashboard,
  getCompanyJobs,
  verifyCompany,
} = require('../controllers/admins.js');
const { protectAdmin, authorize } = require('../middlewares/auth');
const router = express.Router();

router.get('/', protectAdmin, getAdmins);

router.get('/users', protectAdmin, getUsers);
router.get('/users/dashboard', protectAdmin, getUsersDashboard);
router.get('/users/jobs/:userId', protectAdmin, getUserJobs);
router.get('/users/:userId', protectAdmin, getUserById);

router.get('/companies', protectAdmin, getCompanies);
router.get('/companies/dashboard', protectAdmin, getCompaniesDashboard);
router.get('/companies/jobs/:companyId', protectAdmin, getCompanyJobs);
router.get('/companies/:companyId', protectAdmin, getCompanyById);
router.put('/companies/verify', protectAdmin, verifyCompany)


router.get('/:adminId', protectAdmin, getAdmin);

router.post('/register', register);
router.post('/login', login);
router.post('/send-reset-password-link', sendResetPasswordLink);
router.post('/reset-password', resetPassword);

router.post('/create', protectAdmin, authorize('owner'), createAdmin);
router.put('/update/:adminId', protectAdmin, authorize('owner'), updateAdmin);

router.delete('/', protectAdmin, deleteAccount);
router.delete('/by-email', deleteAccountByEmail);
router.delete(
  '/fellow-admin',
  protectAdmin,
  authorize('owner'),
  deleteAdminAccount
);

module.exports = router;
