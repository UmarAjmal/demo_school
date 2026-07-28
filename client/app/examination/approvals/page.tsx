'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notify } from '@/app/utils/notify';

type ApprovalSheet = {
    sheet_type: 'term_exam' | 'test_paper';
    id: string;
    term_id?: number;
    term_name?: string;
    test_id?: number;
    test_name?: string;
    description?: string;
    total_marks?: number;
    class_id: number;
    class_name: string;
    section_id: number;
    section_name: string;
    subject_id: number;
    subject_name: string;
    status: 'pending' | 'approved' | 'published';
    student_count: number;
    submitted_by_name: string;
    approved_by_name: string;
    published_by_name: string;
    last_updated?: string;
};

type SummaryStats = {
    total_sheets: number;
    pending_count: number;
    approved_count: number;
    published_count: number;
};

type StudentDetailRow = {
    student_id: number;
    first_name: string;
    last_name: string;
    admission_no?: string | null;
    roll_no?: string | null;
    obtained_marks?: number | null;
    total_marks?: number | null;
    remarks?: string | null;
    status?: string;
};

const API = process.env.NEXT_PUBLIC_API_URL || "https://demo-school-soxa.onrender.com";

export default function MarksApprovalPage() {
    const { user } = useAuth();

    // ── state ─────────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [canApprove, setCanApprove] = useState(false);
    const [canPublish, setCanPublish] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [summary, setSummary] = useState<SummaryStats>({ total_sheets: 0, pending_count: 0, approved_count: 0, published_count: 0 });
    const [sheets, setSheets] = useState<ApprovalSheet[]>([]);

    // ── filters ───────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'all' | 'term_exam' | 'test_paper'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'published'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // ── detail modal ──────────────────────────────────────────────────────────
    const [selectedSheet, setSelectedSheet] = useState<ApprovalSheet | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailStudents, setDetailStudents] = useState<StudentDetailRow[]>([]);
    const [obtainedMap, setObtainedMap] = useState<Record<number, string>>({});
    const [remarksMap, setRemarksMap] = useState<Record<number, string>>({});
    const [savingMarks, setSavingMarks] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // ── fetch approvals list ──────────────────────────────────────────────────
    const loadApprovals = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                user_id: String(user.id),
                sheet_type: activeTab,
                status: statusFilter
            });
            const r = await fetch(`${API}/exams/approvals/list?${params.toString()}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load approvals');

            setCanApprove(!!d.can_approve);
            setCanPublish(!!d.can_publish);
            setUserRole(d.user_role || 'Staff');
            setSummary(d.summary || { total_sheets: 0, pending_count: 0, approved_count: 0, published_count: 0 });
            setSheets(d.sheets || []);
        } catch (e: any) {
            notify.error(e.message || 'Failed to load approvals list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadApprovals();
    }, [user?.id, activeTab, statusFilter]);

    // ── filtered sheets search ────────────────────────────────────────────────
    const filteredSheets = useMemo(() => {
        if (!searchQuery.trim()) return sheets;
        const q = searchQuery.toLowerCase();
        return sheets.filter(s =>
            s.class_name.toLowerCase().includes(q) ||
            s.section_name.toLowerCase().includes(q) ||
            s.subject_name.toLowerCase().includes(q) ||
            (s.term_name && s.term_name.toLowerCase().includes(q)) ||
            (s.test_name && s.test_name.toLowerCase().includes(q)) ||
            s.submitted_by_name.toLowerCase().includes(q)
        );
    }, [sheets, searchQuery]);

    // ── open sheet detail modal ───────────────────────────────────────────────
    const openSheetDetail = async (sheet: ApprovalSheet) => {
        if (!user?.id) return;
        setSelectedSheet(sheet);
        setLoadingDetail(true);
        try {
            const params = new URLSearchParams({
                user_id: String(user.id),
                sheet_type: sheet.sheet_type
            });
            if (sheet.sheet_type === 'term_exam') {
                params.set('term_id', String(sheet.term_id));
                params.set('class_id', String(sheet.class_id));
                params.set('section_id', String(sheet.section_id));
                params.set('subject_id', String(sheet.subject_id));
            } else {
                params.set('test_id', String(sheet.test_id));
            }

            const r = await fetch(`${API}/exams/approvals/sheet-detail?${params.toString()}`);
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to load sheet detail');

            const stList: StudentDetailRow[] = d.students || [];
            setDetailStudents(stList);

            const om: Record<number, string> = {};
            const rm: Record<number, string> = {};
            for (const st of stList) {
                om[st.student_id] = st.obtained_marks !== null && st.obtained_marks !== undefined ? String(st.obtained_marks) : '';
                rm[st.student_id] = st.remarks || '';
            }
            setObtainedMap(om);
            setRemarksMap(rm);
        } catch (e: any) {
            notify.error(e.message || 'Failed to open sheet detail');
            setSelectedSheet(null);
        } finally {
            setLoadingDetail(false);
        }
    };

    // ── save updated student marks ────────────────────────────────────────────
    const handleSaveAdjustedMarks = async () => {
        if (!user?.id || !selectedSheet) return;

        setSavingMarks(true);
        try {
            const marksPayload = detailStudents.map(st => ({
                student_id: st.student_id,
                obtained_marks: obtainedMap[st.student_id] !== '' ? Number(obtainedMap[st.student_id]) : null,
                remarks: remarksMap[st.student_id] || null
            }));

            const payload: any = {
                user_id: user.id,
                sheet_type: selectedSheet.sheet_type,
                marks: marksPayload
            };

            if (selectedSheet.sheet_type === 'term_exam') {
                payload.term_id = selectedSheet.term_id;
                payload.class_id = selectedSheet.class_id;
                payload.section_id = selectedSheet.section_id;
                payload.subject_id = selectedSheet.subject_id;
                payload.total_marks = detailStudents[0]?.total_marks || 100;
            } else {
                payload.test_id = selectedSheet.test_id;
            }

            const r = await fetch(`${API}/exams/approvals/update-marks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Failed to update marks');

            notify.success(d.message || 'Student marks adjusted & saved.');
            await loadApprovals();
        } catch (e: any) {
            notify.error(e.message || 'Save failed');
        } finally {
            setSavingMarks(false);
        }
    };

    // ── change approval / publication status ─────────────────────────────────
    const handleChangeStatus = async (targetStatus: 'pending' | 'approved' | 'published') => {
        if (!user?.id || !selectedSheet) return;

        setUpdatingStatus(true);
        try {
            const payload: any = {
                user_id: user.id,
                sheet_type: selectedSheet.sheet_type,
                target_status: targetStatus
            };

            if (selectedSheet.sheet_type === 'term_exam') {
                payload.term_id = selectedSheet.term_id;
                payload.class_id = selectedSheet.class_id;
                payload.section_id = selectedSheet.section_id;
                payload.subject_id = selectedSheet.subject_id;
            } else {
                payload.test_id = selectedSheet.test_id;
            }

            const r = await fetch(`${API}/exams/approvals/change-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'Status update failed');

            notify.success(d.message || 'Status updated.');
            setSelectedSheet(prev => prev ? { ...prev, status: targetStatus } : null);
            await loadApprovals();
        } catch (e: any) {
            notify.error(e.message || 'Status update failed');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const fmtDate = (iso?: string) => {
        if (!iso) return '-';
        try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        catch { return iso; }
    };

    return (
        <div className="page-wrap" style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', paddingBottom: '3rem' }}>
            
            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="mb-1 fw-bold" style={{ color: 'var(--primary-dark)' }}>
                        <i className="bi bi-check2-all me-2" style={{ color: 'var(--accent-orange)' }} />
                        Marks Approval & Publishing
                    </h4>
                    <div className="text-muted small">
                        Review, edit student marks, approve, and publish term & test marks to Student Portal
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
                    <span className="badge rounded-pill bg-dark text-white px-3 py-2 border">
                        <i className="bi bi-person-badge me-1" />
                        Role: {userRole}
                    </span>
                    {canPublish ? (
                        <span className="badge rounded-pill bg-success text-white px-3 py-2">
                            <i className="bi bi-rocket-takeoff me-1" />
                            Principal/Admin Mode (Approve & Publish)
                        </span>
                    ) : canApprove ? (
                        <span className="badge rounded-pill bg-info text-dark px-3 py-2">
                            <i className="bi bi-check-circle me-1" />
                            Coordinator/Head Mode (Approve Only)
                        </span>
                    ) : (
                        <span className="badge rounded-pill bg-secondary text-white px-3 py-2">
                            <i className="bi bi-eye me-1" />
                            Teacher Mode (Submission Tracker)
                        </span>
                    )}
                </div>
            </div>

            {/* ── Summary Stats Cards ─────────────────────────────────────── */}
            <div className="row g-3 mb-4">
                <div className="col-md-3 col-6">
                    <div className="card border-0 shadow-sm p-3" style={{ borderLeft: '4px solid #6366f1' }}>
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <div className="text-muted small fw-semibold">Total Sheets</div>
                                <h3 className="mb-0 fw-bold">{summary.total_sheets}</h3>
                            </div>
                            <div className="fs-2 text-indigo">
                                <i className="bi bi-files" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-6">
                    <div className="card border-0 shadow-sm p-3" style={{ borderLeft: '4px solid #f59e0b' }}>
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <div className="text-muted small fw-semibold">Pending Approval</div>
                                <h3 className="mb-0 fw-bold text-warning">{summary.pending_count}</h3>
                            </div>
                            <div className="fs-2 text-warning">
                                <i className="bi bi-clock-history" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-6">
                    <div className="card border-0 shadow-sm p-3" style={{ borderLeft: '4px solid #0ea5e9' }}>
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <div className="text-muted small fw-semibold">Approved (Unpublished)</div>
                                <h3 className="mb-0 fw-bold text-info">{summary.approved_count}</h3>
                            </div>
                            <div className="fs-2 text-info">
                                <i className="bi bi-shield-check" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-6">
                    <div className="card border-0 shadow-sm p-3" style={{ borderLeft: '4px solid #10b981' }}>
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <div className="text-muted small fw-semibold">Published to Portal</div>
                                <h3 className="mb-0 fw-bold text-success">{summary.published_count}</h3>
                            </div>
                            <div className="fs-2 text-success">
                                <i className="bi bi-globe2" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Filter & Search Card ───────────────────────────────── */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                        <div className="col-md-4">
                            <div className="btn-group w-100" role="group">
                                <button
                                    className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveTab('all')}
                                >
                                    All Sheets
                                </button>
                                <button
                                    className={`btn btn-sm ${activeTab === 'term_exam' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveTab('term_exam')}
                                >
                                    Term Exams
                                </button>
                                <button
                                    className={`btn btn-sm ${activeTab === 'test_paper' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActiveTab('test_paper')}
                                >
                                    Class Tests
                                </button>
                            </div>
                        </div>

                        <div className="col-md-4">
                            <div className="d-flex align-items-center gap-2">
                                <span className="text-muted small fw-semibold">Status:</span>
                                <select
                                    className="form-select form-select-sm"
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value as any)}
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="pending">Pending Approval</option>
                                    <option value="approved">Approved (Awaiting Publishing)</option>
                                    <option value="published">Published</option>
                                </select>
                            </div>
                        </div>

                        <div className="col-md-4">
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-white"><i className="bi bi-search" /></span>
                                <input
                                    type="text"
                                    className="form-select-sm form-control"
                                    placeholder="Search by class, subject, teacher..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Table Card ──────────────────────────────────────────────── */}
            <div className="card border-0 shadow-sm">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status" />
                            <div className="text-muted small mt-2">Loading marks approval list...</div>
                        </div>
                    ) : filteredSheets.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary" />
                            No marks sheets found for selected filters.
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Type</th>
                                        <th>Title / Term</th>
                                        <th>Class & Section</th>
                                        <th>Subject</th>
                                        <th>Students</th>
                                        <th>Status</th>
                                        <th>Submitted By</th>
                                        <th>Last Updated</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSheets.map(s => {
                                        const isTerm = s.sheet_type === 'term_exam';
                                        return (
                                            <tr key={s.id}>
                                                <td>
                                                    <span className={`badge ${isTerm ? 'bg-indigo text-white' : 'bg-info text-dark'}`}>
                                                        {isTerm ? 'Term Exam' : 'Class Test'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="fw-bold text-dark">
                                                        {isTerm ? s.term_name : s.test_name}
                                                    </div>
                                                    {s.description && <div className="text-muted extra-small">{s.description}</div>}
                                                </td>
                                                <td>
                                                    <span className="fw-semibold">{s.class_name}</span> - <span className="text-muted">{s.section_name}</span>
                                                </td>
                                                <td>
                                                    <span className="badge bg-light text-dark border">{s.subject_name}</span>
                                                </td>
                                                <td>
                                                    <span className="badge bg-secondary">{s.student_count} Students</span>
                                                </td>
                                                <td>
                                                    {s.status === 'published' ? (
                                                        <span className="badge bg-success"><i className="bi bi-globe2 me-1" />Published</span>
                                                    ) : s.status === 'approved' ? (
                                                        <span className="badge bg-info text-dark"><i className="bi bi-check-circle me-1" />Approved</span>
                                                    ) : (
                                                        <span className="badge bg-warning text-dark"><i className="bi bi-clock me-1" />Pending</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="small fw-semibold">{s.submitted_by_name}</div>
                                                </td>
                                                <td className="text-muted small">
                                                    {fmtDate(s.last_updated)}
                                                </td>
                                                <td className="text-end">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary rounded-pill px-3"
                                                        onClick={() => openSheetDetail(s)}
                                                    >
                                                        <i className="bi bi-pencil-square me-1" />
                                                        Review & Approve
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

            {/* ── Review & Approval Modal ─────────────────────────────────── */}
            {selectedSheet && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                    <div className="modal-dialog modal-xl modal-dialog-scrollable">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-dark text-white">
                                <div>
                                    <h5 className="modal-title mb-0 fw-bold">
                                        <i className="bi bi-journal-check me-2 text-warning" />
                                        Review Marks Sheet — {selectedSheet.sheet_type === 'term_exam' ? selectedSheet.term_name : selectedSheet.test_name}
                                    </h5>
                                    <div className="small text-muted">
                                        {selectedSheet.class_name} ({selectedSheet.section_name}) | Subject: {selectedSheet.subject_name}
                                    </div>
                                </div>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedSheet(null)} />
                            </div>

                            <div className="modal-body p-4">
                                {loadingDetail ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-primary" role="status" />
                                        <div className="text-muted small mt-2">Fetching student marks sheet...</div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Status Header Banner */}
                                        <div className="d-flex align-items-center justify-content-between p-3 rounded-3 mb-4 bg-light border">
                                            <div>
                                                <span className="text-muted me-2">Current Status:</span>
                                                {selectedSheet.status === 'published' ? (
                                                    <span className="badge bg-success fs-6"><i className="bi bi-globe2 me-1" />Published on Student Portal</span>
                                                ) : selectedSheet.status === 'approved' ? (
                                                    <span className="badge bg-info text-dark fs-6"><i className="bi bi-check-circle me-1" />Approved (Awaiting Principal Publishing)</span>
                                                ) : (
                                                    <span className="badge bg-warning text-dark fs-6"><i className="bi bi-clock me-1" />Pending Approval</span>
                                                )}
                                            </div>

                                            <div className="text-muted small">
                                                Submitted by: <b>{selectedSheet.submitted_by_name}</b>
                                            </div>
                                        </div>

                                        {/* Editable Students Marks Table */}
                                        <div className="table-responsive">
                                            <table className="table table-bordered align-middle">
                                                <thead className="table-dark">
                                                    <tr>
                                                        <th style={{ width: '80px' }}>Roll No</th>
                                                        <th>Student Name</th>
                                                        <th style={{ width: '140px' }}>Admission No</th>
                                                        <th style={{ width: '160px' }}>Obtained Marks</th>
                                                        <th>Remarks / Comments</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {detailStudents.map(st => (
                                                        <tr key={st.student_id}>
                                                            <td className="fw-bold">{st.roll_no || '-'}</td>
                                                            <td>{st.first_name} {st.last_name}</td>
                                                            <td className="text-muted small">{st.admission_no || '-'}</td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    className="form-control form-control-sm text-center fw-bold"
                                                                    value={obtainedMap[st.student_id] ?? ''}
                                                                    onChange={e => setObtainedMap(prev => ({ ...prev, [st.student_id]: e.target.value }))}
                                                                    placeholder="0.00"
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm"
                                                                    value={remarksMap[st.student_id] ?? ''}
                                                                    onChange={e => setRemarksMap(prev => ({ ...prev, [st.student_id]: e.target.value }))}
                                                                    placeholder="Add remarks..."
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="modal-footer bg-light justify-content-between">
                                <button className="btn btn-outline-secondary" onClick={() => setSelectedSheet(null)}>
                                    Close
                                </button>

                                <div className="d-flex align-items-center gap-2">
                                    {/* Save Marks Adjustment */}
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleSaveAdjustedMarks}
                                        disabled={savingMarks || loadingDetail}
                                    >
                                        {savingMarks ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-save me-1" />}
                                        Save Marks Adjustment
                                    </button>

                                    {/* Approve Button (Role Level >= 65) */}
                                    {canApprove && selectedSheet.status !== 'approved' && (
                                        <button
                                            className="btn btn-info text-dark font-semibold"
                                            onClick={() => handleChangeStatus('approved')}
                                            disabled={updatingStatus}
                                        >
                                            <i className="bi bi-check-circle-fill me-1" />
                                            Approve Sheet
                                        </button>
                                    )}

                                    {/* Publish Button (Role Level >= 90: Principal / VP / Admin) */}
                                    {canPublish ? (
                                        selectedSheet.status === 'published' ? (
                                            <button
                                                className="btn btn-outline-warning"
                                                onClick={() => handleChangeStatus('pending')}
                                                disabled={updatingStatus}
                                            >
                                                <i className="bi bi-arrow-counterclockwise me-1" />
                                                Unpublish / Revert to Draft
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-success fw-bold px-4"
                                                onClick={() => handleChangeStatus('published')}
                                                disabled={updatingStatus}
                                            >
                                                <i className="bi bi-rocket-takeoff-fill me-1" />
                                                Publish to Student Portal
                                            </button>
                                        )
                                    ) : (
                                        <span className="badge bg-warning text-dark p-2 border">
                                            <i className="bi bi-lock-fill me-1" />
                                            Publishing Restricted (Requires Principal / VP / Admin)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
