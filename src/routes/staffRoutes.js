// src/routes/staffRoutes.js
const express = require('express');
const router = express.Router();
const StaffController = require('../controllers/StaffController');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

// Get all staff (requires admin role)
router.get('/', authenticateToken, authorize(['admin']), StaffController.getAllStaff);
router.get('/:staffId', authenticateToken, authorize(['admin']), StaffController.getStaffById);

// Approve/Reject applications (requires admin role)
router.get('/applications', authenticateToken, authorize(['admin']), StaffController.getStaffApplications);
router.post('/applications/:applicationId/approve', authenticateToken, authorize(['admin']), StaffController.approveStaffApplication);
router.post('/applications/:applicationId/reject', authenticateToken, authorize(['admin']), StaffController.rejectStaffApplication);
router.put('/:staffId/role', authenticateToken, authorize(['admin']), StaffController.updateStaffRole);

module.exports = router;