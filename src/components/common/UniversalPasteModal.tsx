import React, { useState, useEffect } from 'react';
import { ClipboardPaste, CheckCircle2, AlertCircle, FileSpreadsheet, ArrowRight, BookOpen } from 'lucide-react';
import { Modal } from './Modal';
import {
  parsePastedSpreadsheet,
  mapToLectureTracker,
  mapToPYQTracker,
  mapToRevisionTracker,
  mapToWeeklyQuiz,
  mapToTestTracker,
  mapToPlanning,
  mapToDailyProgress,
  STANDARD_GATE_SUBJECTS
} from '../../services/excelEngine';
import { useApp } from '../../context/AppContext';

export type PasteTargetSection = 
  | 'lecture_tracker'
  | 'pyq_tracker'
  | 'revision_tracker'
  | 'weekly_quiz'
  | 'test_tracker'
  | 'planning'
  | 'daily_progress';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetSection: PasteTargetSection;
  onSuccess?: (count: number) => void;
  initialSubject?: string;
}

const SECTION_TITLES: Record<PasteTargetSection, string> = {
  lecture_tracker: 'Lecture Tracker',
  pyq_tracker: 'PYQ Tracker',
  revision_tracker: 'Revision Tracker',
  weekly_quiz: 'Weekly Quiz',
  test_tracker: 'Test Tracker',
  planning: 'Planning',
  daily_progress: 'Daily Progress'
};

const POPULAR_SUBJECTS = [
  'C Programming',
  'Discrete Mathematics',
  'Operating Systems',
  'DBMS',
  'Computer Networks',
  'Algorithms',
  'Data Structures',
  'Theory of Computation'
];

export const UniversalPasteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  targetSection,
  onSuccess,
  initialSubject
}) => {
  const { importBulkData } = useApp();
  const [pastedText, setPastedText] = useState('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialSubject && initialSubject !== 'All') {
        setSelectedSubject(initialSubject);
      }
    } else {
      setPastedText('');
      setParsedHeaders([]);
      setParsedRows([]);
      setPreviewItems([]);
      setStatusMessage(null);
      setSelectedSubject('');
    }
  }, [isOpen, initialSubject]);

  const recomputeMapping = (text: string, subjectOverride: string) => {
    if (!text.trim()) {
      setParsedHeaders([]);
      setParsedRows([]);
      setPreviewItems([]);
      return;
    }

    const { headers, rows } = parsePastedSpreadsheet(text);
    setParsedHeaders(headers);
    setParsedRows(rows);

    const effectiveSubj = subjectOverride.trim() || undefined;

    let mapped: any[] = [];
    switch (targetSection) {
      case 'lecture_tracker':
        mapped = mapToLectureTracker(rows, effectiveSubj);
        if (effectiveSubj) {
          mapped = mapped.map(item => ({ ...item, subject: effectiveSubj }));
        }
        break;
      case 'pyq_tracker':
        mapped = mapToPYQTracker(rows);
        if (effectiveSubj) {
          mapped = mapped.map(item => ({ ...item, subject: effectiveSubj }));
        }
        break;
      case 'revision_tracker':
        mapped = mapToRevisionTracker(rows, effectiveSubj);
        if (effectiveSubj) {
          mapped = mapped.map(item => ({ ...item, subject: effectiveSubj }));
        }
        break;
      case 'weekly_quiz':
        mapped = mapToWeeklyQuiz(rows);
        break;
      case 'test_tracker':
        mapped = mapToTestTracker(rows);
        if (effectiveSubj) {
          mapped = mapped.map(item => ({ ...item, subject: item.subject || effectiveSubj }));
        }
        break;
      case 'planning':
        mapped = mapToPlanning(rows);
        break;
      case 'daily_progress':
        mapped = mapToDailyProgress(rows);
        break;
    }
    setPreviewItems(mapped);
  };

  const handleTextChange = (text: string) => {
    setPastedText(text);
    recomputeMapping(text, selectedSubject);
  };

  const handleSubjectChange = (newSubj: string) => {
    setSelectedSubject(newSubj);
    recomputeMapping(pastedText, newSubj);
  };

  const handleImport = async () => {
    if (previewItems.length === 0) return;
    setIsImporting(true);
    setStatusMessage(null);

    try {
      const payload: any = {};
      switch (targetSection) {
        case 'lecture_tracker':
          payload.lectureTracker = previewItems;
          break;
        case 'pyq_tracker':
          payload.pyqTracker = previewItems;
          break;
        case 'revision_tracker':
          payload.revisionTracker = previewItems;
          break;
        case 'weekly_quiz':
          payload.weeklyQuiz = previewItems;
          break;
        case 'test_tracker':
          payload.testTracker = previewItems;
          break;
        case 'planning':
          payload.planning = previewItems;
          break;
        case 'daily_progress':
          payload.dailyProgress = previewItems;
          break;
      }

      const res = await importBulkData(payload, 'update');
      if (onSuccess) onSuccess(res.importedCount);
      onClose();
    } catch (err: any) {
      setStatusMessage(`Import failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Paste from Excel / Google Sheets → ${SECTION_TITLES[targetSection]}`}
      subtitle="Copy table rows directly from Excel, Google Sheets, or GO Classes and paste below."
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Subject Target Selector */}
        {(targetSection === 'lecture_tracker' || targetSection === 'pyq_tracker' || targetSection === 'revision_tracker' || targetSection === 'test_tracker') && (
          <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Target Subject:</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                  (Assigns subject to all rows, e.g. C Programming)
                </span>
              </div>
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Auto-Detect / Keep Original</option>
                {STANDARD_GATE_SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {/* Quick Pick Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-indigo-100 dark:border-indigo-900/40">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Quick Pick:</span>
              {POPULAR_SUBJECTS.map(subj => {
                const isActive = selectedSubject === subj;
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => handleSubjectChange(isActive ? '' : subj)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {subj}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
            Paste Data (Tabs, columns, headers, and hyperlinks are detected automatically):
          </label>
          <textarea
            rows={6}
            value={pastedText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Paste cells copied directly from Excel, Sheets, or GO Classes here..."
            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        {statusMessage && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Detected {parsedRows.length} rows and {parsedHeaders.length} columns
              </span>
              <span className="text-slate-400 text-[11px]">
                Previewing first {Math.min(parsedRows.length, 3)} rows
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto max-h-48 bg-slate-50/50 dark:bg-slate-900/50">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0">
                  <tr>
                    {parsedHeaders.map((h, i) => (
                      <th key={i} className="p-2 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {parsedRows.slice(0, 3).map((r, rIdx) => (
                    <tr key={rIdx}>
                      {parsedHeaders.map((h, cIdx) => (
                        <td key={cIdx} className="p-2 truncate max-w-[160px] text-slate-800 dark:text-slate-200 font-mono">
                          {r[h] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mapped Result Preview */}
            {previewItems.length > 0 && (
              <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 space-y-1.5">
                <div className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    How records will be saved:
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Subject will be: <strong className="text-indigo-600 dark:text-indigo-400">{previewItems[0]?.subject || 'General'}</strong>
                  </span>
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {previewItems.slice(0, 3).map((item, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] bg-white dark:bg-slate-800 px-2 py-1.5 rounded border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
                          {item.subject || 'General'}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {item.module || item.lectureTitle || item.topic || item.quizName || item.testName || `Row ${idx + 1}`}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono shrink-0">
                        {item.revision1Date ? `R1: ${item.revision1Date}` : item.testDate ? item.testDate : item.duration ? item.duration : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={parsedRows.length === 0 || isImporting}
            onClick={handleImport}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>{isImporting ? 'Importing...' : `Import ${parsedRows.length} Rows`}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
