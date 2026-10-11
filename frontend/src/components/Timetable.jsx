import React, { useState } from 'react';
import { DAYS } from '../data/dummyTimetable';
import {
  BookOpen,
  User,
  MapPin,
  Coffee,
  FlaskConical,
  Award,
  Image,
  Loader2,
  FileText
} from 'lucide-react';

export default function Timetable({
  timetableData,
  selectedDivision = 'SE1',
  selectedDay = 'All'
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  if (!timetableData || !timetableData[selectedDivision]) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
        <p className="text-slate-500 text-sm">
          No timetable data available for Division {selectedDivision}.
        </p>
      </div>
    );
  }

  const divData = timetableData[selectedDivision];

  const displayedDays =
    selectedDay === 'All' ? DAYS : [selectedDay];

  /* Backend-defined chronological order (matches TIME_SLOT_STRINGS in constants.js) */
  const SLOT_ORDER = [
    '09:00 - 09:15',
    '09:15 - 10:15',
    '10:15 - 11:15',
    '11:15 - 11:30',
    '11:30 - 12:30',
    '12:30 - 13:30',
    '13:30 - 14:15',
    '14:15 - 15:15',
    '15:15 - 16:15',
    '16:15 - 16:30'
  ];

  /* Extract unique time slots from the data and sort by backend order */
  const getTimeSlots = () => {
    const extracted = [
      ...new Set(
        displayedDays.flatMap((day) => (divData[day] || []).map((slot) => slot.time))
      )
    ];
    return extracted.sort((a, b) => {
      const idxA = SLOT_ORDER.indexOf(a);
      const idxB = SLOT_ORDER.indexOf(b);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  };

  const timeSlots = getTimeSlots();

  const formatTimeSlot = (timeSlot) =>
    timeSlot.replace(/\b(\d{2}):(\d{2})\b/g, (_, hour, minute) => {
      const hour12 = Number(hour) > 12 ? Number(hour) - 12 : Number(hour) || 12;
      return `${String(hour12).padStart(2, '0')}:${minute}`;
    });

  const escapeSvg = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;'
    })[character]);

  const fitLabel = (value, maxLength) => {
    const label = String(value ?? '');
    return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
  };

  const makeExportSvg = () => {
    const margin = 24;
    const timeColumnWidth = 140;
    const dayColumnWidth = 184;
    const headerHeight = 52;
    const rowHeight = 84;
    const titleHeight = 112;
    const width = margin * 2 + timeColumnWidth + dayColumnWidth * displayedDays.length;
    const height = titleHeight + headerHeight + rowHeight * timeSlots.length + margin;
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
      `<text x="${margin}" y="48" fill="#0f172a" font-family="Arial, sans-serif" font-size="27" font-weight="700">${escapeSvg(`Division ${selectedDivision} Timetable`)}</text>`,
      `<text x="${margin}" y="77" fill="#64748b" font-family="Arial, sans-serif" font-size="15">${escapeSvg(`Computer Engineering · ${selectedDay === 'All' ? 'Weekly Overview' : selectedDay}`)}</text>`
    ];

    const headerY = titleHeight;
    const headerCells = [
      { x: margin, width: timeColumnWidth, label: 'TIME' },
      ...displayedDays.map((day, index) => ({
        x: margin + timeColumnWidth + dayColumnWidth * index,
        width: dayColumnWidth,
        label: day.toUpperCase()
      }))
    ];
    headerCells.forEach(({ x, width: cellWidth, label }) => {
      parts.push(`<rect x="${x}" y="${headerY}" width="${cellWidth}" height="${headerHeight}" fill="#eff6ff" stroke="#cbd5e1"/>`);
      parts.push(`<text x="${x + 12}" y="${headerY + 32}" fill="#1e3a8a" font-family="Arial, sans-serif" font-size="13" font-weight="700">${escapeSvg(label)}</text>`);
    });

    timeSlots.forEach((time, rowIndex) => {
      const y = headerY + headerHeight + rowHeight * rowIndex;
      parts.push(`<rect x="${margin}" y="${y}" width="${timeColumnWidth}" height="${rowHeight}" fill="#f8fafc" stroke="#cbd5e1"/>`);
      parts.push(`<text x="${margin + 10}" y="${y + 44}" fill="#334155" font-family="Arial, sans-serif" font-size="12" font-weight="600">${escapeSvg(formatTimeSlot(time))}</text>`);

      displayedDays.forEach((day, dayIndex) => {
        const x = margin + timeColumnWidth + dayColumnWidth * dayIndex;
        const slot = getLecture(day, time);
        const fill = slot?.type === 'Lab'
          ? '#faf5ff'
          : slot?.type === 'Break'
            ? '#fffbeb'
            : slot?.type === 'Activity'
              ? '#ecfdf5'
              : slot
                ? '#eff6ff'
                : '#ffffff';
        parts.push(`<rect x="${x}" y="${y}" width="${dayColumnWidth}" height="${rowHeight}" fill="${fill}" stroke="#cbd5e1"/>`);
        if (slot) {
          parts.push(`<text x="${x + 10}" y="${y + 25}" fill="#0f172a" font-family="Arial, sans-serif" font-size="13" font-weight="700">${escapeSvg(fitLabel(slot.subject, 25))}</text>`);
          parts.push(`<text x="${x + 10}" y="${y + 48}" fill="#475569" font-family="Arial, sans-serif" font-size="11">${escapeSvg(fitLabel(slot.teacher || '', 30))}</text>`);
          parts.push(`<text x="${x + 10}" y="${y + 68}" fill="#64748b" font-family="Arial, sans-serif" font-size="10">${escapeSvg(fitLabel(slot.classroom || '', 30))}</text>`);
        }
      });
    });

    parts.push('</svg>');
    return { svg: parts.join(''), width, height };
  };

  const canvasFromSvg = async ({ svg, width, height }) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new window.Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('Could not render the timetable image.'));
        image.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not prepare the timetable export canvas.');
      context.scale(2, 2);
      context.drawImage(image, 0, 0, width, height);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadImage = async (canvas, filename) => {
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('Could not create the timetable image.'));
      }, 'image/png');
    });
    downloadBlob(blob, filename);
  };

  const exportTimetable = async (format) => {
    setIsExporting(true);
    setExportError('');
    try {
      const canvas = await canvasFromSvg(makeExportSvg());
      const filename = `timetable-${selectedDivision.toLowerCase()}-${selectedDay.toLowerCase()}`;
      if (format === 'image') {
        await downloadImage(canvas, `${filename}.png`);
        return;
      }

      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const margin = 8;
      const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
      const pageHeightInPixels = (canvas.width * pageHeight) / pageWidth;

      for (let offsetY = 0; offsetY < canvas.height; offsetY += pageHeightInPixels) {
        if (offsetY > 0) pdf.addPage();
        const sliceHeight = Math.min(pageHeightInPixels, canvas.height - offsetY);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        pageCanvas
          .getContext('2d')
          .drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        const pageImageHeight = (sliceHeight * pageWidth) / canvas.width;
        pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', margin, margin, pageWidth, pageImageHeight);
      }
      downloadBlob(pdf.output('blob'), `${filename}.pdf`);
    } catch (error) {
      setExportError(error.message || 'Could not export this timetable.');
    } finally {
      setIsExporting(false);
    }
  };

  /* Find lecture for a given day and time */
  const getLecture = (day, timeSlot) => {
    const daySchedule = divData[day];
    if (!daySchedule) return null;
    return daySchedule.find((item) => item.time === timeSlot);
  };

  /* =========================================
     BADGES
     ========================================= */

  const getLectureBadge = (type) => {
    switch (type) {
      case 'Lab':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
            <FlaskConical className="w-2.5 h-2.5" />
            LAB
          </span>
        );

      case 'Break':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
            <Coffee className="w-2.5 h-2.5" />
            BREAK
          </span>
        );

      case 'Activity':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Award className="w-2.5 h-2.5" />
            ACTIVITY
          </span>
        );

      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
            <BookOpen className="w-2.5 h-2.5" />
            LEC
          </span>
        );
    }
  };


  /* =========================================
     LECTURE CARD STYLE
     ========================================= */

  const getLectureCardStyle = (type) => {
    switch (type) {
      case 'Lab':
        return `
          bg-purple-50
          border-purple-200
          hover:border-purple-300
          text-slate-800
        `;

      case 'Break':
        return `
          bg-amber-50
          border-amber-200
          text-amber-800
          justify-center
          text-center
        `;

      case 'Activity':
        return `
          bg-emerald-50
          border-emerald-200
          hover:border-emerald-300
          text-slate-800
        `;

      default:
        return `
          bg-blue-50
          border-blue-200
          hover:border-blue-300
          hover:bg-blue-100/70
          text-slate-800
        `;
    }
  };


  return (

    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

      {/* =========================================
          TABLE HEADER
          ========================================= */}

      <div className="px-5 sm:px-6 py-5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">

        <div>

          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">

            <span>
              Division {selectedDivision} Timetable
            </span>

            <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-semibold">
              {displayedDays.length === 1
                ? `Day: ${displayedDays[0]}`
                : 'Weekly Overview'}
            </span>

          </h3>

          <p className="text-xs text-slate-500 mt-1">
            Computer Engineering • Academic Schedule
          </p>

        </div>


        {/* =========================================
            LEGEND
            ========================================= */}

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              Lecture
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              Practical Lab
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Activity/Seminar
            </span>
          </div>
          <div className="flex items-center gap-2" data-export-ignore="true">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => exportTimetable('image')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
              title="Download timetable as a PNG image"
            >
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Image className="h-3.5 w-3.5" />}
              Image
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={() => exportTimetable('pdf')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
              title="Download timetable as a PDF"
            >
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              PDF
            </button>
          </div>
        </div>
      </div>

      {exportError && (
        <p role="alert" data-export-ignore="true" className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">
          {exportError}
        </p>
      )}

      {/* =========================================
          TABLE
          ========================================= */}

      <div className="overflow-x-auto">

        <table className="w-full text-left border-collapse min-w-[800px]">

          {/* TABLE HEAD */}

          <thead>

            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">

              <th className="py-3.5 px-4 w-36 bg-slate-50 sticky left-0 z-10 border-r border-slate-200">
                Time
              </th>

              {displayedDays.map((day) => (

                <th
                  key={day}
                  className="py-3.5 px-4 border-r border-slate-200 min-w-[170px]"
                >
                  {day}
                </th>

              ))}

            </tr>

          </thead>


          {/* TABLE BODY */}

          <tbody className="text-xs">

            {timeSlots.map((timeSlot) => (

              <tr
                key={timeSlot}
                className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors"
              >

                {/* TIME */}

                <td className="py-3 px-4 font-semibold text-slate-600 bg-white sticky left-0 z-10 border-r border-slate-200 whitespace-nowrap">

                  {formatTimeSlot(timeSlot)}

                </td>


                {/* DAY COLUMNS */}

                {displayedDays.map((day) => {

                  const lecture = getLecture(day, timeSlot);


                  /* FREE SLOT */

                  if (!lecture) {

                    return (

                      <td
                        key={day}
                        className="p-2 border-r border-slate-100 text-slate-400 text-center italic"
                      >
                        Free Slot
                      </td>

                    );

                  }


                  /* BREAK (Fixed slots: Yoga, Short Break, Lunch, Life Skills) */

                  if (lecture.type === 'Break') {

                    return (

                      <td
                        key={day}
                        className="p-2 border-r border-slate-100"
                      >

                        <div className="h-full min-h-[72px] p-2.5 rounded-xl border flex flex-col items-center justify-center bg-amber-50 border-amber-200 text-amber-800">

                          {getLectureBadge('Break')}

                          <span className="text-xs font-semibold mt-1">
                            {lecture.subject}
                          </span>

                        </div>

                      </td>

                    );

                  }


                  /* NORMAL LECTURE / LAB / ACTIVITY */

                  return (

                    <td
                      key={day}
                      className="p-2 border-r border-slate-100"
                    >

                      <div
                        className={`
                          h-full
                          min-h-[78px]
                          p-2.5
                          rounded-xl
                          border
                          transition-all
                          duration-200
                          flex
                          flex-col
                          justify-between
                          gap-1.5
                          shadow-sm
                          ${getLectureCardStyle(lecture.type)}
                        `}
                      >

                        {/* SUBJECT + BADGE */}

                        <div className="flex items-start justify-between gap-1">

                          <span className="font-bold text-xs leading-snug line-clamp-2">
                            {lecture.subject}
                          </span>

                          {getLectureBadge(lecture.type)}

                        </div>


                        {/* TEACHER + ROOM */}

                        <div className="space-y-0.5 text-[11px] mt-1">

                          {lecture.teacher &&
                            lecture.teacher !== '-' && (

                              <div className="flex items-center gap-1 text-slate-600">

                                <User className="w-3 h-3 text-blue-600 shrink-0" />

                                <span className="truncate font-medium">
                                  {lecture.teacher}
                                </span>

                              </div>

                            )}


                          {lecture.classroom &&
                            lecture.classroom !== '-' && (

                              <div className="flex items-center gap-1 text-slate-500">

                                <MapPin className="w-3 h-3 text-amber-500 shrink-0" />

                                <span className="truncate font-mono">
                                  {lecture.classroom}
                                </span>

                              </div>

                            )}

                        </div>

                      </div>

                    </td>

                  );

                })}

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );
}