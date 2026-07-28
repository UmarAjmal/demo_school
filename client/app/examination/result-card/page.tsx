'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notify } from '@/app/utils/notify';

const API = process.env.NEXT_PUBLIC_API_URL || "https://demo-school-soxa.onrender.com";

type Term = { id: number; term_name: string };
type ClassItem = { class_id: number; class_name: string };
type SectionItem = { section_id: number; section_name: string; class_id: number };

type StudentRow = {
    student_id: number;
    first_name: string;
    last_name: string;
    admission_no?: string | null;
    roll_no?: string | null;
    marked_subjects: number;
    obtained_marks: number | null;
    total_marks: number | null;
    percentage: number | null;
    grade: string | null;
    position: number | null;
    ordinal_position: string | null;
};

type CardSubjectRow = {
    subject_id: number;
    subject_name: string;
    subject_code?: string | null;
    total_marks: number | null;
    obtained_marks: number | null;
};

type StudentCardItem = {
    student_id: number;
    first_name: string;
    last_name: string;
    admission_no?: string | null;
    roll_no?: string | null;
    position: number | null;
    ordinal_position: string | null;
    percentage: number | null;
    grade: string | null;
    subject_rows: CardSubjectRow[];
    grand_total_marks: number;
    grand_obtained_marks: number;
};

type SchoolInfo = {
    school_name?: string;
    school_address?: string;
    phone_number?: string;
    school_phone2?: string;
    school_phone3?: string;
    school_logo_url?: string;
};

type CardPayload = {
    meta: {
        term_name: string;
        year_name: string;
        class_name: string;
        section_name: string;
    };
    school: SchoolInfo;
    students: StudentCardItem[];
};

function esc(text: unknown) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function fmtNum(v: number | null | undefined): string {
    if (v === null || v === undefined) return '';
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.00$/, '');
}

function buildPrintHtml(payload: CardPayload, isBatch: boolean): string {
    const { meta, school, students } = payload;
    const schoolName = school.school_name || 'Smart School';
    const address = school.school_address || '';
    const phones = [school.phone_number, school.school_phone2, school.school_phone3].filter(Boolean).join(' | ');
    const rawLogo = school.school_logo_url || '';
    const logo = rawLogo ? (rawLogo.startsWith('http') ? rawLogo : `${API}${rawLogo}`) : '';

    const cardsHtml = students.map((student) => {
        const rows = student.subject_rows.map((sr, idx) => {
            const pct = sr.total_marks && sr.total_marks > 0 && sr.obtained_marks !== null
                ? Math.round((sr.obtained_marks / sr.total_marks) * 100)
                : null;
            return `
                <tr>
                    <td class="center">${idx + 1}</td>
                    <td class="bold">${esc(sr.subject_name)}</td>
                    <td class="center">${sr.total_marks !== null ? esc(fmtNum(sr.total_marks)) : ''}</td>
                    <td class="center bold">${sr.obtained_marks !== null ? esc(fmtNum(sr.obtained_marks)) : ''}</td>
                    <td class="center">${pct !== null ? `${pct}%` : ''}</td>
                </tr>
            `;
        }).join('');

        return `
            <div className="card-page">
                <div className="header-box">
                    <div>
                        <div className="school-name">${esc(schoolName)}</div>
                        <div>${esc(address)} ${phones ? ' | Tel: ' + esc(phones) : ''}</div>
                    </div>
                    ${logo ? `<img src="${esc(logo)}" style="max-height: 55px;"/>` : ''}
                </div>
                <div className="title-banner">STUDENT RESULT CARD</div>
                <div className="info-grid">
                    <div><strong>Student Name:</strong> ${esc(`${student.first_name} ${student.last_name}`)}</div>
                    <div><strong>Roll No:</strong> ${esc(student.roll_no || '—')}</div>
                    <div><strong>Class & Sec:</strong> ${esc(meta.class_name)} (${esc(meta.section_name)})</div>
                    <div><strong>Admission No:</strong> ${esc(student.admission_no || '—')}</div>
                    <div><strong>Term:</strong> ${esc(meta.term_name)}</div>
                    <div><strong>Academic Year:</strong> ${esc(meta.year_name)}</div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px;">#</th>
                            <th>Subject</th>
                            <th style="width: 90px;">Total Marks</th>
                            <th style="width: 100px;">Obtained Marks</th>
                            <th style="width: 80px;">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
                <div className="summary-box">
                    <div>Grand Total: <strong>${esc(fmtNum(student.grand_obtained_marks))} / ${esc(fmtNum(student.grand_total_marks))}</strong></div>
                    <div>Percentage: <strong>${student.percentage !== null ? student.percentage + '%' : '—'}</strong></div>
                    <div>Grade: <strong>${esc(student.grade || '—')}</strong></div>
                    <div>Position in Class: <strong>${esc(student.ordinal_position || '—')}</strong></div>
                </div>
            </div>
        `;
    }).join(isBatch ? '<div className="page-break"></div>' : '');

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Result Card – ${esc(meta.class_name)} (${esc(meta.section_name)})</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 15px; }
  .card-page { padding: 15px; border: 2px solid #334155; border-radius: 6px; }
  .header-box { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 10px; }
  .school-name { font-size: 20px; font-weight: bold; color: #0f172a; text-transform: uppercase; }
  .title-banner { background: #0f172a; color: #fff; text-align: center; font-weight: bold; padding: 6px; font-size: 14px; letter-spacing: 1px; margin-bottom: 12px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8fafc; padding: 10px; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #94a3b8; padding: 8px; }
  th { background: #1e293b; color: #fff; text-align: center; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .summary-box { display: flex; justify-content: space-around; background: #f1f5f9; padding: 10px; font-size: 13px; border-top: 2px solid #0f172a; border-radius: 4px; }
  .page-break { page-break-after: always; height: 0; }
</style>
</head>
<body onload="window.print()">
  ${cardsHtml}
</body>
</html>`;
}

export default function ResultCardPage() {
    const { user } = useAuth();

    const [loadingContext, setLoadingContext] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [openingStudentId, setOpeningStudentId] = useState<number | null>(null);

    const [activeYearName, setActiveYearName] = useState('');
    const [terms, setTerms] = useState<Term[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [sections, setSections] = useState<SectionItem[]>([]);

    const [selectedTerm, setSelectedTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');

    const [students, setStudents] = useState<StudentRow[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const canUsePage = !!user;

    const filteredSections = useMemo(() => {
        if (!selectedClass) return [];
        return sections.filter((s) => s.class_id === Number(selectedClass));
    }, [sections, selectedClass]);

    const ready = !!(selectedTerm && selectedClass && selectedSection && user?.id);

    const loadContext = async () => {
        if (!user?.id) {
            setLoadingContext(false);
            return;
        }

        setLoadingContext(true);
        try {
            const r = await fetch(`${API}/exams/context/class-teacher?user_id=${user.id}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load context');

            const nextTerms = Array.isArray(d.terms) ? d.terms : [];
            const nextClasses = Array.isArray(d.classes) ? d.classes : [];
            const nextSections = Array.isArray(d.sections) ? d.sections : [];

            setTerms(nextTerms);
            setClasses(nextClasses);
            setSections(nextSections);
            setActiveYearName(d.active_year?.year_name || '');

            setSelectedTerm((prev) => {
                if (prev && nextTerms.some((t: Term) => String(t.id) === prev)) return prev;
                return nextTerms.length > 0 ? String(nextTerms[0].id) : '';
            });

            setSelectedClass((prev) => {
                if (prev && nextClasses.some((c: ClassItem) => String(c.class_id) === prev)) return prev;
                return nextClasses.length > 0 ? String(nextClasses[0].class_id) : '';
            });
        } catch (e: any) {
            notify.error(e.message || 'Failed to load context');
        } finally {
            setLoadingContext(false);
        }
    };

    const loadStudents = async () => {
        if (!ready || !user?.id) return;
        setLoadingStudents(true);
        try {
            const params = new URLSearchParams({
                user_id: String(user.id),
                term_id: selectedTerm,
                class_id: selectedClass,
                section_id: selectedSection
            });

            const r = await fetch(`${API}/exams/result-card/students?${params.toString()}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load students');

            setStudents(Array.isArray(d.students) ? d.students : []);
            setSelectedIds(new Set());
        } catch (e: any) {
            setStudents([]);
            setSelectedIds(new Set());
            notify.error(e.message || 'Failed to load students');
        } finally {
            setLoadingStudents(false);
        }
    };

    const fetchCards = async (studentIds: number[]): Promise<CardPayload> => {
        if (!user?.id || !ready) throw new Error('Please select term, class and section first');

        const r = await fetch(`${API}/exams/result-card/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                term_id: Number(selectedTerm),
                class_id: Number(selectedClass),
                section_id: Number(selectedSection),
                student_ids: studentIds
            })
        });

        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Failed to load result card data');

        return d as CardPayload;
    };

    const openInNewTab = (html: string) => {
        const win = window.open('', '_blank', 'width=1100,height=900');
        if (!win) {
            notify.warning('Popup blocked. Please allow popups for this site and try again.');
            return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
    };

    const openStudentCard = async (studentId: number) => {
        if (openingStudentId !== null) return;
        setOpeningStudentId(studentId);
        try {
            const payload = await fetchCards([studentId]);
            if (!payload.students || payload.students.length === 0) {
                throw new Error('No result data found for this student');
            }
            openInNewTab(buildPrintHtml(payload, false));
            notify.success('Result card opened.');
        } catch (e: any) {
            notify.error(e.message || 'Failed to open result card');
        } finally {
            setOpeningStudentId(null);
        }
    };

    const handlePrintSelected = async () => {
        if (selectedIds.size === 0) {
            notify.warning('Select one or more students to print.');
            return;
        }

        setPrinting(true);
        try {
            const payload = await fetchCards(Array.from(selectedIds));
            openInNewTab(buildPrintHtml(payload, true));
            notify.success('Printing result cards.');
        } catch (e: any) {
            notify.error(e.message || 'Failed to print result cards');
        } finally {
            setPrinting(false);
        }
    };

    useEffect(() => {
        loadContext();
    }, [user?.id]);

    useEffect(() => {
        setSelectedSection('');
        setStudents([]);
        setSelectedIds(new Set());
    }, [selectedClass]);

    useEffect(() => {
        setStudents([]);
        setSelectedIds(new Set());
    }, [selectedTerm, selectedSection]);

    useEffect(() => {
        if (filteredSections.length === 1 && !selectedSection) {
            setSelectedSection(String(filteredSections[0].section_id));
        }
    }, [filteredSections, selectedSection]);

    useEffect(() => {
        if (ready) {
            loadStudents();
        }
    }, [ready, selectedTerm, selectedClass, selectedSection]);

    const allVisibleSelected = students.length > 0 && students.every((s) => selectedIds.has(s.student_id));

    const toggleSelectAll = () => {
        if (allVisibleSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(students.map((s) => s.student_id)));
        }
    };

    const toggleStudent = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    if (!canUsePage) {
        return (
            <div className="container py-4">
                <div className="alert alert-danger mb-0">You do not have permission to access Result Card.</div>
            </div>
        );
    }

    return (
        <div className="page-wrap" style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', paddingBottom: '3rem' }}>
            
            {/* Header Bar */}
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="mb-1 fw-bold" style={{ color: 'var(--primary-dark)' }}>
                        <i className="bi bi-file-earmark-text me-2" style={{ color: 'var(--accent-orange)' }} />
                        Student Result Cards
                    </h4>
                    <div className="text-muted small">Generate and print term result cards per student</div>
                </div>
                <span className="badge rounded-pill bg-dark text-white px-3 py-2 border shadow-xs">
                    <i className="bi bi-calendar3 me-1" /> Session: {activeYearName || 'Active Year'}
                </span>
            </div>

            {/* Seamless Filter Controls */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-bottom py-3" style={{ borderLeft: '4px solid var(--primary-teal)' }}>
                    <h6 className="mb-0 fw-bold" style={{ color: 'var(--primary-dark)' }}>
                        <i className="bi bi-sliders me-2" style={{ color: 'var(--primary-teal)' }} />
                        Select Class Target (Auto-loads Students)
                    </h6>
                </div>
                <div className="card-body p-4">
                    <div className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label fw-semibold text-dark small mb-1">
                                <span className="badge bg-dark text-white me-1">1</span> Select Term
                            </label>
                            <select className="form-select form-select-md border-2" value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} disabled={loadingContext}>
                                <option value="">-- Choose Term --</option>
                                {terms.map((t) => (
                                    <option key={t.id} value={t.id}>{t.term_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-4">
                            <label className="form-label fw-semibold text-dark small mb-1">
                                <span className="badge bg-dark text-white me-1">2</span> Select Class
                            </label>
                            <select className="form-select form-select-md border-2" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} disabled={loadingContext}>
                                <option value="">-- Choose Class --</option>
                                {classes.map((c) => (
                                    <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-4">
                            <label className="form-label fw-semibold text-dark small mb-1">
                                <span className="badge bg-dark text-white me-1">3</span> Select Section
                            </label>
                            <select
                                className="form-select form-select-md border-2"
                                value={selectedSection}
                                onChange={(e) => setSelectedSection(e.target.value)}
                                disabled={!selectedClass || loadingContext}
                            >
                                <option value="">-- Choose Section --</option>
                                {filteredSections.map((s) => (
                                    <option key={s.section_id} value={s.section_id}>{s.section_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Student List & Batch Action Card */}
            {ready && (
                <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white border-bottom p-3 d-flex flex-wrap align-items-center justify-content-between gap-3"
                        style={{ borderLeft: '4px solid #10b981' }}>
                        <div>
                            <h5 className="mb-0 fw-bold text-dark">
                                <i className="bi bi-people me-2 text-success" />
                                Student List ({students.length} Students)
                            </h5>
                            <div className="text-muted extra-small mt-1">
                                Select individual students or batch print all result cards at once.
                            </div>
                        </div>

                        {students.length > 0 && (
                            <div className="d-flex align-items-center gap-2">
                                <button className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={toggleSelectAll}>
                                    {allVisibleSelected ? 'Deselect All' : 'Select All'}
                                </button>
                                <button
                                    className="btn btn-success fw-bold px-4 rounded-pill shadow-xs"
                                    onClick={handlePrintSelected}
                                    disabled={printing || selectedIds.size === 0}
                                >
                                    {printing ? <><span className="spinner-border spinner-border-sm me-1" />Printing...</> : <><i className="bi bi-printer-fill me-1" />Print Selected Cards ({selectedIds.size})</>}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="card-body p-0">
                        {loadingStudents ? (
                            <div className="py-5 text-center text-muted">
                                <span className="spinner-border text-primary me-2" />Loading student result cards list...
                            </div>
                        ) : students.length === 0 ? (
                            <div className="py-5 text-center text-muted">No active students found for selected class & section.</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-dark">
                                        <tr>
                                            <th style={{ width: '40px' }} className="ps-4">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={allVisibleSelected}
                                                    onChange={toggleSelectAll}
                                                />
                                            </th>
                                            <th style={{ width: '80px' }}>Roll No</th>
                                            <th style={{ width: '140px' }}>Admission No</th>
                                            <th>Student Name</th>
                                            <th className="text-center">Evaluated Subjects</th>
                                            <th className="text-center">Position</th>
                                            <th className="text-center">Percentage</th>
                                            <th className="text-center">Grade</th>
                                            <th className="text-end pe-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map((s) => {
                                            const isChecked = selectedIds.has(s.student_id);
                                            const isOpening = openingStudentId === s.student_id;

                                            return (
                                                <tr key={s.student_id} className={isChecked ? 'table-light' : ''}>
                                                    <td className="ps-4">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={isChecked}
                                                            onChange={() => toggleStudent(s.student_id)}
                                                        />
                                                    </td>
                                                    <td className="fw-bold text-dark">{s.roll_no || '—'}</td>
                                                    <td className="text-muted small">{s.admission_no || '—'}</td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div
                                                                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                                                                style={{ width: 32, height: 32, fontSize: '0.85rem' }}
                                                            >
                                                                {s.first_name[0]}{s.last_name[0] || ''}
                                                            </div>
                                                            <div className="fw-semibold text-dark">{s.first_name} {s.last_name}</div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className={`badge ${s.marked_subjects > 0 ? 'bg-success-subtle text-success-emphasis border border-success-subtle' : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'}`}>
                                                            {s.marked_subjects} Subjects
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        {s.ordinal_position ? (
                                                            <span className="badge bg-indigo text-white px-3 py-1 rounded-pill fw-bold">
                                                                {s.ordinal_position}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted extra-small">—</span>
                                                        )}
                                                    </td>
                                                    <td className="text-center fw-bold text-dark">
                                                        {s.percentage !== null ? `${s.percentage}%` : '—'}
                                                    </td>
                                                    <td className="text-center">
                                                        {s.grade ? (
                                                            <span className={`badge ${s.grade === 'F' ? 'bg-danger' : s.grade === 'A+' ? 'bg-success' : 'bg-primary'}`}>
                                                                {s.grade}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted extra-small">—</span>
                                                        )}
                                                    </td>
                                                    <td className="text-end pe-4">
                                                        <button
                                                            className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold"
                                                            onClick={() => openStudentCard(s.student_id)}
                                                            disabled={isOpening}
                                                        >
                                                            {isOpening ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-file-earmark-text me-1" />}
                                                            Open Card
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
