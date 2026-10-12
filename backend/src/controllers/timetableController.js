const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Division = require('../models/Division');
const Subject = require('../models/Subject');
const TimetableSlot = require('../models/TimetableSlot');
const { generateTimetable } = require('../utils/timetableGenerator');
const { DAYS, TIME_SLOT_STRINGS } = require('../config/constants');

// @desc    Trigger automatic timetable generation for all (or selected) divisions
// @route   POST /api/timetable/generate
// @body    { divisionIds?: string[] }  -- omit to regenerate for every division
// @access  Private/Admin
const generate = asyncHandler(async (req, res) => {
  const { divisionIds } = req.body;

  const divisionFilter = divisionIds && divisionIds.length ? { _id: { $in: divisionIds } } : {};
  const divisions = await Division.find(divisionFilter);

  if (!divisions.length) {
    res.status(400);
    throw new Error('No divisions found to generate a timetable for');
  }

  const divisionsWithSubjects = [];
  for (const division of divisions) {
    const subjects = await Subject.find({ division: division._id })
      .populate('teacher', 'name')
      .populate('preferredClassroom', 'name');

    if (!subjects.length) {
      continue; // nothing to schedule for this division yet
    }
    divisionsWithSubjects.push({ division, subjects });
  }

  if (!divisionsWithSubjects.length) {
    res.status(400);
    throw new Error(
      'None of the selected divisions have subjects configured yet. Add subjects (with teachers) before generating.'
    );
  }

  const { placed, unplaced, warnings } = generateTimetable(divisionsWithSubjects);

  const generationBatch = new mongoose.Types.ObjectId().toString();
  const divisionIdsAffected = divisionsWithSubjects.map((d) => String(d.division._id));

  // Wipe any previous slots for the affected divisions, then bulk insert the new ones
  await TimetableSlot.deleteMany({ division: { $in: divisionIdsAffected } });

  const docs = placed.map((slot) => ({ ...slot, generationBatch }));
  await TimetableSlot.insertMany(docs, { ordered: false });

  res.status(201).json({
    success: true,
    message: `Timetable generated for ${divisionsWithSubjects.length} division(s) with zero teacher/classroom clashes.`,
    generationBatch,
    divisions: divisionIdsAffected,
    slotsCreated: docs.length,
    unplacedCount: unplaced.length,
    unplaced,
    warnings
  });
});

// @desc    Get the full timetable for one division, shaped like the frontend's
//          DUMMY_TIMETABLE[division] object: { Monday: [...], Tuesday: [...] }
// @route   GET /api/timetable/division/:divisionId
// @access  Private
const getDivisionTimetable = asyncHandler(async (req, res) => {
  const { divisionId } = req.params;

  const division = await Division.findById(divisionId);
  if (!division) {
    res.status(404);
    throw new Error('Division not found');
  }

  // Same role scoping as GET /api/timetable, so this route cannot be used to bypass it
  if (req.user.role === 'student' && String(division._id) !== String(req.user.division)) {
    res.status(403);
    throw new Error('You are not allowed to view another division timetable');
  }

  if (req.user.role === 'teacher') {
    if (!req.user.teacher) {
      res.status(403);
      throw new Error('This teacher account is not linked to a teacher profile yet');
    }
    const teachesDivision = await Subject.findOne({
      division: division._id,
      teacher: req.user.teacher
    });
    if (!teachesDivision) {
      res.status(403);
      throw new Error('You are not assigned to teach this division');
    }
  }

  const slotFilter = { division: divisionId };
  if (req.user.role === 'teacher') {
    slotFilter.teacherRef = req.user.teacher;
  }
  const slots = await TimetableSlot.find(slotFilter);

  const grouped = {};
  DAYS.forEach((day) => {
    const daySlots = slots
      .filter((s) => s.day === day)
      .sort((a, b) => TIME_SLOT_STRINGS.indexOf(a.time) - TIME_SLOT_STRINGS.indexOf(b.time))
      .map((s) => ({
        time: s.time,
        subject: s.subject,
        teacher: s.teacher,
        classroom: s.classroom,
        type: s.type
      }));
    grouped[day] = daySlots;
  });

  res.json({
    success: true,
    division: { id: division._id, code: division.code, title: division.title },
    timetable: grouped
  });
});

// @desc    Get timetables scoped to the authenticated user's role:
//            admin   -> every division
//            teacher -> only the sessions assigned to that teacher
//            student -> only their own division
// @route   GET /api/timetable
// @access  Private
const getAllTimetables = asyncHandler(async (req, res) => {
  const { role } = req.user;

  let slotFilter = {};
  let divisionFilter = {};

  if (role === 'teacher') {
    if (!req.user.teacher) {
      res.status(403);
      throw new Error('This teacher account is not linked to a teacher profile yet');
    }
    slotFilter = { teacherRef: req.user.teacher };
  } else if (role === 'student') {
    if (!req.user.division) {
      res.status(403);
      throw new Error('This student account is not linked to a division yet');
    }
    divisionFilter = { _id: req.user.division };
    slotFilter = { division: req.user.division };
  }

  const slots = await TimetableSlot.find(slotFilter);

  // A teacher only ever sees the divisions they are actually assigned to teach
  if (role === 'teacher') {
    divisionFilter = { _id: { $in: [...new Set(slots.map((s) => s.division))] } };
  }

  const divisions = await Division.find(divisionFilter).sort({ year: 1, code: 1 });

  const timetable = {};
  divisions.forEach((division) => {
    const divisionSlots = slots.filter((s) => String(s.division) === String(division._id));
    const grouped = {};
    DAYS.forEach((day) => {
      grouped[day] = divisionSlots
        .filter((s) => s.day === day)
        .sort((a, b) => TIME_SLOT_STRINGS.indexOf(a.time) - TIME_SLOT_STRINGS.indexOf(b.time))
        .map((s) => ({
          time: s.time,
          subject: s.subject,
          teacher: s.teacher,
          classroom: s.classroom,
          type: s.type
        }));
    });
    timetable[division.code] = grouped;
  });

  res.json({ success: true, timetable });
});

// @desc    Manually create/override a single timetable slot (e.g. fix a clash by hand)
// @route   POST /api/timetable/slot
// @access  Private/Admin
const upsertSlot = asyncHandler(async (req, res) => {
  const { division, day, time, subject, teacher, classroom, type, teacherRef, classroomRef, subjectRef } =
    req.body;

  if (!division || !day || !time || !subject) {
    res.status(400);
    throw new Error('division, day, time and subject are required');
  }

  // Enforce the same hard constraints manually: teacher/classroom cannot clash elsewhere
  if (teacherRef) {
    const clash = await TimetableSlot.findOne({
      day,
      time,
      teacherRef,
      division: { $ne: division }
    });
    if (clash) {
      res.status(409);
      throw new Error(`Teacher clash: already teaching another division at ${day} ${time}`);
    }
  }

  if (classroomRef) {
    const clash = await TimetableSlot.findOne({
      day,
      time,
      classroomRef,
      division: { $ne: division }
    });
    if (clash) {
      res.status(409);
      throw new Error(`Classroom clash: room already in use by another division at ${day} ${time}`);
    }
  }

  const slot = await TimetableSlot.findOneAndUpdate(
    { division, day, time },
    { division, day, time, subject, teacher, classroom, type, teacherRef, classroomRef, subjectRef },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({ success: true, slot });
});

// @desc    Manually move/edit an existing timetable slot (e.g. resolve a clash by hand)
// @route   PUT /api/timetable/slot/:id
// @body    { subject?, teacher?, classroom?, day?, time?, type?, subjectRef?, teacherRef?, classroomRef? }
// @access  Private/Admin
const updateSlot = asyncHandler(async (req, res) => {
  const { subject, teacher, classroom, day, time, type, subjectRef, teacherRef, classroomRef } =
    req.body;

  const slot = await TimetableSlot.findById(req.params.id).populate('division', 'code');

  if (!slot) {
    res.status(404);
    throw new Error('Timetable slot not found');
  }

  // Only the provided fields change; everything else keeps its current value
  const updates = {
    subject: subject ?? slot.subject,
    teacher: teacher ?? slot.teacher,
    classroom: classroom ?? slot.classroom,
    day: day ?? slot.day,
    time: time ?? slot.time,
    type: type ?? slot.type,
    subjectRef: subjectRef ?? slot.subjectRef,
    teacherRef: teacherRef ?? slot.teacherRef,
    classroomRef: classroomRef ?? slot.classroomRef
  };

  const divisionId = slot.division._id;

  // Enforce the same hard constraints as the generator. The slot being edited
  // is excluded from every check so it never clashes with itself.
  if (updates.teacherRef) {
    const clash = await TimetableSlot.findOne({
      _id: { $ne: slot._id },
      day: updates.day,
      time: updates.time,
      teacherRef: updates.teacherRef,
      division: { $ne: divisionId }
    });
    if (clash) {
      res.status(409);
      throw new Error(
        `Teacher clash: already teaching another division at ${updates.day} ${updates.time}`
      );
    }
  }

  if (updates.classroomRef) {
    const clash = await TimetableSlot.findOne({
      _id: { $ne: slot._id },
      day: updates.day,
      time: updates.time,
      classroomRef: updates.classroomRef,
      division: { $ne: divisionId }
    });
    if (clash) {
      res.status(409);
      throw new Error(
        `Classroom clash: room already in use by another division at ${updates.day} ${updates.time}`
      );
    }
  }

  const ownClash = await TimetableSlot.findOne({
    _id: { $ne: slot._id },
    division: divisionId,
    day: updates.day,
    time: updates.time
  });
  if (ownClash) {
    res.status(409);
    throw new Error(
      `Division clash: ${slot.division.code} already has a session at ${updates.day} ${updates.time}`
    );
  }

  slot.set(updates);
  await slot.save({ runValidators: true });

  res.status(200).json({ success: true, slot });
});

// @desc    Delete all generated slots for a division (reset)
// @route   DELETE /api/timetable/division/:divisionId
// @access  Private/Admin
const clearDivisionTimetable = asyncHandler(async (req, res) => {
  const result = await TimetableSlot.deleteMany({ division: req.params.divisionId });
  res.json({ success: true, deletedCount: result.deletedCount });
});

module.exports = {
  generate,
  getDivisionTimetable,
  getAllTimetables,
  upsertSlot,
  updateSlot,
  clearDivisionTimetable
};
