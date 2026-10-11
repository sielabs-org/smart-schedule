const express = require('express');
const { getUsers, createUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));
router.route('/').get(getUsers).post(createUser);

module.exports = router;
