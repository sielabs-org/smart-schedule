import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Navbar from '../components/Navbar';
import Timetable from '../components/Timetable';
import UserManagement from '../components/UserManagement';
import {
  DEPARTMENT_INFO,
  DIVISIONS_INFO,
  DAYS,
  DUMMY_TIMETABLE
} from '../data/dummyTimetable';
import { useAuth } from '../context/AuthContext';

import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Layers,
  CalendarDays,
  Eye,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function AdminDashboard() {
  const { isDemo } = useAuth();
  const [selectedDivision, setSelectedDivision] = useState('SE1');
  const [selectedDay, setSelectedDay] = useState('All');
  const [showGenModal, setShowGenModal] = useState(false);
  const [timetableData, setTimetableData] = useState({});
  const [lastGeneratedTime, setLastGeneratedTime] = useState('Today at 09:30 AM');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Real generation state, driven entirely by the backend response */
  const [genStatus, setGenStatus] = useState('idle'); // idle | generating | success | error
  const [genResult, setGenResult] = useState(null);
  const [genError, setGenError] = useState(null);

  const isGenerating = genStatus === 'generating';

  /* Manual slot edit state (PUT /timetable/slot/:id) */
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [slotError, setSlotError] = useState(null);

  const fetchTimetable = async () => {
    setIsLoading(true);
    setError(null);
    if (isDemo) {
      setTimetableData(DUMMY_TIMETABLE);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get('/timetable');
      setTimetableData(response.timetable);
      setLastGeneratedTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      );
    } catch (err) {
      setError(err.message || 'Failed to load timetable');
      console.error('Timetable fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const handleGenerateTimetable = async () => {
    setShowGenModal(true);
    setGenStatus('generating');
    setGenResult(null);
    setGenError(null);

    try {
      /* api.post attaches the JWT as "Authorization: Bearer <token>" (see services/api.js) */
      const response = await api.post('/timetable/generate', {});

      setGenResult(response);
      setGenStatus('success');

      /* Pull the freshly generated timetable back down (GET /timetable) */
      await fetchTimetable();
    } catch (err) {
      setGenError(err.message || 'Failed to generate timetable');
      setGenStatus('error');
      console.error('Timetable generation error:', err);
    }
  };

  const closeGenModal = () => {
    setShowGenModal(false);
    setGenStatus('idle');
    setGenResult(null);
    setGenError(null);
  };

  /* Persist a manual edit of an existing slot. api.put sends the JWT as
     "Authorization: Bearer <token>", same as every other request.
     Note: GET /timetable does not currently return slot _id / *Ref values, so
     this cannot be triggered from the timetable grid until that is exposed. */
  const handleSaveSlot = async (slotId, changes) => {
    setIsSavingSlot(true);
    setSlotError(null);

    try {
      await api.put(`/timetable/slot/${slotId}`, changes);

      /* Pull the updated timetable back down so the grid reflects the edit */
      await fetchTimetable();

      return { success: true };
    } catch (err) {
      /* 409 carries the clash message from the backend (teacher, classroom
         or division clash); api.js puts it on err.message */
      setSlotError({
        message: err.message || 'Failed to update timetable slot',
        isClash: err.status === 409
      });
      console.error('Timetable slot update error:', err);

      return { success: false, error: err };
    } finally {
      setIsSavingSlot(false);
    }
  };

  const genStats = genResult
    ? [
        { label: 'Divisions scheduled', value: genResult.divisions?.length ?? 0 },
        { label: 'Timetable slots created', value: genResult.slotsCreated ?? 0 },
        { label: 'Sessions left unplaced', value: genResult.unplacedCount ?? 0 }
      ]
    : [];

  const genWarnings = genResult?.warnings || [];
  const genUnplaced = genResult?.unplaced || [];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {isDemo && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Demo mode: this is sample timetable data. Generation and changes require the live backend.
          </p>
        )}

        {/* =========================================
            HEADER
        ========================================= */}

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

            <div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">

                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  Admin Control Panel
                </span>

                <span className="text-xs text-slate-500 font-medium">
                  Dept Code: {DEPARTMENT_INFO.code}
                </span>

              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {DEPARTMENT_INFO.name} Department
              </h1>

              <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-2xl">
                Manage divisions, view master schedules, and trigger automatic
                timetable generation.
              </p>

            </div>

            {/* Generate Button */}

            <button
              onClick={handleGenerateTimetable}
              disabled={isDemo || isGenerating}
              className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 ${
                isGenerating
                  ? 'opacity-60 cursor-not-allowed'
                  : 'cursor-pointer'
              }`}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>
                {isDemo ? 'Demo: View Only' : isGenerating ? 'Generating...' : 'Generate Timetable'}
              </span>
            </button>

          </div>

          <UserManagement disabled={isDemo} />

          {/* =========================================
              DIVISION CARDS
          ========================================= */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-7 pt-6 border-t border-slate-100">

            {DEPARTMENT_INFO.divisions.map((divKey) => {

              const div = DIVISIONS_INFO[divKey];
              const isSelected = selectedDivision === divKey;

              return (
                <button
                  key={divKey}
                  onClick={() => setSelectedDivision(divKey)}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border-blue-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <div>

                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                        Division
                      </span>

                      <h4 className="text-lg font-bold text-slate-900 mt-0.5">
                        {div.title}
                      </h4>

                      <p className="text-xs text-slate-500 mt-1">
                        {div.classTeacher} • {div.room}
                      </p>

                    </div>

                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {divKey}
                    </div>

                  </div>

                </button>
              );
            })}

          </div>

        </div>


        {/* =========================================
            CLASH PREVENTION BANNER
        ========================================= */}

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">

          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />

          <div className="text-xs space-y-1">

            <span className="font-bold text-slate-800">
              Automated Clash Prevention Active
            </span>

            <p className="text-slate-600 leading-relaxed">
              The algorithm guarantees zero teacher double-booking across
              divisions. For example, if Prof. S. R. Kulkarni is assigned to
              SE1 from 10:00–11:00, the system automatically prevents
              scheduling them for TE1 at the exact same slot.
            </p>

          </div>

        </div>


        {/* =========================================
            FILTERS
        ========================================= */}

        <div className="space-y-4">

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">

            {/* Division Selector */}

            <div className="flex items-center gap-2 flex-wrap">

              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Select Division:
              </span>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">

                {DEPARTMENT_INFO.divisions.map((div) => (

                  <button
                    key={div}
                    onClick={() => setSelectedDivision(div)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      selectedDivision === div
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                    }`}
                  >
                    {div}
                  </button>

                ))}

              </div>

            </div>


            {/* Day Filter */}

            <div className="flex items-center gap-2">

              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                Day Filter:
              </span>

              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer"
              >
                <option value="All">All Days (Mon-Sat)</option>

                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}

              </select>

            </div>


            {/* Last Generated */}

            <div className="text-xs text-slate-500 flex items-center gap-1.5">

              <Eye className="w-3.5 h-3.5 text-blue-600" />

              <span>
                Last Generated:{' '}
                <strong className="text-slate-800">
                  {lastGeneratedTime}
                </strong>
              </span>

            </div>

          </div>


          {/* =========================================
              LOADING / ERROR / TIMETABLE
          ========================================= */}

          {isLoading ? (
            <div className="flex items-center justify-center py-12 bg-white border border-slate-200 rounded-xl">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm text-slate-600">Loading timetable from server...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-red-800">Failed to Load Timetable</span>
                <p className="text-red-600 leading-relaxed">{error}</p>
                <button
                  onClick={fetchTimetable}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <Timetable
              timetableData={timetableData}
              selectedDivision={selectedDivision}
              selectedDay={selectedDay}
            />
          )}

        </div>

      </main>


      {/* =========================================
          GENERATION MODAL
      ========================================= */}

      {showGenModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">

          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">

            {/* Modal Header */}

            <div className="text-center space-y-2">

              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 mb-2">

                {isGenerating ? (
                  <RefreshCw className="w-7 h-7 animate-spin" />
                ) : genStatus === 'error' ? (
                  <AlertCircle className="w-7 h-7 text-red-500" />
                ) : (
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                )}

              </div>

              <h3 className="text-xl font-bold text-slate-900">

                {isGenerating
                  ? 'Generating Automatic Timetable'
                  : genStatus === 'error'
                  ? 'Timetable Generation Failed'
                  : 'Timetable Generated Successfully!'}

              </h3>

              <p className="text-xs text-slate-500">

                {isGenerating
                  ? 'Constraint satisfaction engine is organizing conflict-free schedules.'
                  : genStatus === 'error'
                  ? 'The server could not generate the timetable.'
                  : genResult?.message}

              </p>

            </div>


            {/* Progress / Real Backend Result / Real Backend Error */}

            {isGenerating ? (

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">

                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full w-1/3 bg-blue-600 rounded-full animate-pulse"></div>
                </div>

                <p className="text-slate-600 font-medium">
                  Running the constraint solver on the server (POST
                  /api/timetable/generate)...
                </p>

                <div className="space-y-2 text-slate-400">

                  <div className="flex items-start gap-2.5">
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0 mt-0.5" />
                    <span className="text-blue-700 font-semibold">
                      Placing sessions with zero teacher & classroom clashes...
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 mt-0.5" />
                    <span>
                      Teacher cannot be booked for two divisions at the same
                      day and time.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 mt-0.5" />
                    <span>
                      A classroom cannot host two divisions at the same day and
                      time.
                    </span>
                  </div>

                </div>

              </div>

            ) : genStatus === 'error' ? (

              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs flex items-start gap-2.5">

                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />

                <div className="space-y-1">

                  <span className="font-bold text-red-800 block">
                    Backend rejected the request
                  </span>

                  <p className="text-red-700 leading-relaxed break-words">
                    {genError}
                  </p>

                </div>

              </div>

            ) : (

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">

                {genStats.map((stat) => (

                  <div
                    key={stat.label}
                    className="flex items-start gap-2.5"
                  >

                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />

                    <span className="text-slate-700 font-medium">
                      {stat.label}:{' '}
                      <strong className="text-slate-900">{stat.value}</strong>
                    </span>

                  </div>

                ))}

                {genWarnings.map((warning, idx) => (

                  <div
                    key={idx}
                    className="flex items-start gap-2.5"
                  >

                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />

                    <span className="text-amber-700 leading-relaxed">
                      {warning}
                    </span>

                  </div>

                ))}

                {genUnplaced.length > 0 && (

                  <div className="pt-1 space-y-1.5">

                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Unplaced sessions
                    </span>

                    <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">

                      {genUnplaced.map((item, idx) => (

                        <div
                          key={idx}
                          className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        >
                          <span className="font-semibold text-slate-800">
                            {item.subject}
                          </span>
                          {item.teacher && item.teacher !== '-' ? ` - ${item.teacher}` : ''}
                          <span className="block text-slate-500">
                            {item.reason}
                          </span>
                        </div>

                      ))}

                    </div>

                  </div>

                )}

                {genResult?.generationBatch && (

                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    Batch: {genResult.generationBatch}
                  </p>

                )}

              </div>

            )}


            {/* Close */}

            {!isGenerating && (

              <button
                onClick={closeGenModal}
                className="w-full py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Close & View Updated Timetables
              </button>

            )}

          </div>

        </div>

      )}

    </div>
  );
}