const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const Division = require('../models/Division');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('name email role division teacher department isActive')
    .populate('division', 'code title')
    .populate('teacher', 'name email')
    .sort({ role: 1, name: 1 });

  res.json({ success: true, users: users.map((user) => user.toSafeObject()) });
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, division, teacher } = req.body;

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }
  if (!['student', 'teacher'].includes(role)) {
    res.status(400);
    throw new Error('Admins can create student or teacher accounts only');
  }
  if (password.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters long');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    res.status(409);
    throw new Error('An account with this email already exists');
  }

  let assignment = {};
  if (role === 'student') {
    if (!division || !mongoose.isValidObjectId(division)) {
      res.status(400);
      throw new Error('Select a valid division for the student account');
    }
    if (teacher) {
      res.status(400);
      throw new Error('Student accounts cannot be linked to a teacher profile');
    }
    if (!(await Division.exists({ _id: division }))) {
      res.status(400);
      throw new Error('Selected division does not exist');
    }
    assignment = { division };
  } else {
    if (!teacher || !mongoose.isValidObjectId(teacher)) {
      res.status(400);
      throw new Error('Select a valid teacher profile for the teacher account');
    }
    if (division) {
      res.status(400);
      throw new Error('Teacher accounts cannot be linked to a student division');
    }
    if (!(await Teacher.exists({ _id: teacher, isActive: true }))) {
      res.status(400);
      throw new Error('Selected teacher profile does not exist or is inactive');
    }
    if (!(await Subject.exists({ teacher }))) {
      res.status(400);
      throw new Error('Assign at least one subject and division to this teacher profile before creating its account');
    }
    if (await User.exists({ role: 'teacher', teacher })) {
      res.status(409);
      throw new Error('This teacher profile already has a login account');
    }
    assignment = { teacher };
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role,
    ...assignment
  });

  res.status(201).json({ success: true, user: user.toSafeObject() });
});

module.exports = { getUsers, createUser };
