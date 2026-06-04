import React, { useState, useEffect } from 'react';
import { Table, Badge, Button, Modal, Form, Card, Alert } from 'react-bootstrap';
import { Plus, Trash2, Calendar, Building2, Briefcase, Edit2 } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const JobTracker = () => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [show, setShow] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [newJob, setNewJob] = useState({
        company: '',
        role: '',
        status: 'applied',
        notes: '',
        date: new Date().toISOString().split('T')[0],
        matchScore: 0
    });

    useEffect(() => {
        if (user?.uid) {
            fetchJobs();
        }
    }, [user]);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/jobs/${user.uid}`);
            setJobs(res.data || []);
        } catch (err) {
            console.error('Fetch jobs error:', err);
            setError('Failed to load jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newJob.company || !newJob.role) {
            setError('Company and role are required');
            return;
        }

        try {
            setLoading(true);
            if (editingId) {
                // Update
                await api.put(`/api/jobs/${editingId}`, newJob);
                setSuccess('Job updated successfully');
            } else {
                // Create
                await api.post('/api/jobs', {
                    ...newJob,
                    userId: user.uid
                });
                setSuccess('Job added successfully');
            }
            setShow(false);
            setEditingId(null);
            resetForm();
            fetchJobs();
        } catch (err) {
            console.error('Add/Update error:', err);
            setError('Failed to save job');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (jobId) => {
        if (window.confirm('Are you sure you want to delete this application?')) {
            try {
                setLoading(true);
                await api.delete(`/api/jobs/${jobId}`);
                setSuccess('Job deleted successfully');
                fetchJobs();
            } catch (err) {
                console.error('Delete error:', err);
                setError('Failed to delete job');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleEdit = (job) => {
        setNewJob({
            company: job.company,
            role: job.role,
            status: job.status,
            notes: job.notes,
            date: job.date,
            matchScore: job.matchScore || 0
        });
        setEditingId(job.id);
        setShow(true);
    };

    const resetForm = () => {
        setNewJob({
            company: '',
            role: '',
            status: 'applied',
            notes: '',
            date: new Date().toISOString().split('T')[0],
            matchScore: 0
        });
        setEditingId(null);
        setError('');
    };

    const handleClose = () => {
        setShow(false);
        resetForm();
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'applied': 'primary',
            'interview': 'warning',
            'rejected': 'danger',
            'offered': 'success'
        };
        return statusMap[status] || 'secondary';
    };

    const getStatusColor = (matchScore) => {
        if (matchScore >= 80) return '#10B981';
        if (matchScore >= 60) return '#F59E0B';
        return '#EF4444';
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">Job Application Tracker</h2>
                    <p className="text-muted">Track all your job applications in one place</p>
                </div>
                <Button className="btn-primary-custom d-flex align-items-center gap-2" onClick={() => { resetForm(); setShow(true); }}>
                    <Plus size={20} /> Add Application
                </Button>
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Card className="glass-card border-0">
                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : jobs.length > 0 ? (
                    <div className="table-responsive">
                        <Table hover className="mb-0">
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                    <th>Company</th>
                                    <th>Role</th>
                                    <th>Match Score</th>
                                    <th>Status</th>
                                    <th>Date Applied</th>
                                    <th>Notes</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map(job => (
                                    <tr key={job.id}>
                                        <td className="fw-bold">
                                            <Building2 size={16} className="me-2 text-accent" style={{display: 'inline'}} />
                                            {job.company}
                                        </td>
                                        <td>
                                            <Briefcase size={16} className="me-2 text-accent" style={{display: 'inline'}} />
                                            {job.role}
                                        </td>
                                        <td>
                                            <div style={{
                                                fontWeight: '600',
                                                color: getStatusColor(job.matchScore || 0)
                                            }}>
                                                {job.matchScore || 0}%
                                            </div>
                                        </td>
                                        <td>
                                            <Badge bg={getStatusBadge(job.status)}>
                                                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Calendar size={16} className="me-2 text-muted" style={{display: 'inline'}} />
                                            {job.date || 'N/A'}
                                        </td>
                                        <td className="text-muted small" style={{maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                            {job.notes || '-'}
                                        </td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                <Button 
                                                    variant="outline-primary" 
                                                    size="sm"
                                                    onClick={() => handleEdit(job)}
                                                    disabled={loading}
                                                >
                                                    <Edit2 size={14} />
                                                </Button>
                                                <Button 
                                                    variant="outline-danger" 
                                                    size="sm"
                                                    onClick={() => handleDelete(job.id)}
                                                    disabled={loading}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-5">
                        <Briefcase size={48} className="text-muted mb-3" />
                        <p className="text-muted mb-0">No applications tracked yet. Start by adding one!</p>
                    </div>
                )}
            </Card>

            {/* Add/Edit Modal */}
            <Modal show={show} onHide={handleClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{editingId ? 'Edit Application' : 'Add New Application'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Company Name *</Form.Label>
                            <Form.Control
                                type="text"
                                value={newJob.company}
                                onChange={(e) => setNewJob({...newJob, company: e.target.value})}
                                placeholder="e.g., Google, Microsoft"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Role *</Form.Label>
                            <Form.Control
                                type="text"
                                value={newJob.role}
                                onChange={(e) => setNewJob({...newJob, role: e.target.value})}
                                placeholder="e.g., Senior Software Engineer"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Status</Form.Label>
                            <Form.Select
                                value={newJob.status}
                                onChange={(e) => setNewJob({...newJob, status: e.target.value})}
                            >
                                <option value="applied">Applied</option>
                                <option value="interview">Interview</option>
                                <option value="offered">Offered</option>
                                <option value="rejected">Rejected</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Match Score (%)</Form.Label>
                            <Form.Control
                                type="number"
                                min="0"
                                max="100"
                                value={newJob.matchScore}
                                onChange={(e) => setNewJob({...newJob, matchScore: parseInt(e.target.value) || 0})}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Date Applied</Form.Label>
                            <Form.Control
                                type="date"
                                value={newJob.date}
                                onChange={(e) => setNewJob({...newJob, date: e.target.value})}
                            />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={newJob.notes}
                                onChange={(e) => setNewJob({...newJob, notes: e.target.value})}
                                placeholder="Any additional notes..."
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                    <Button className="btn-primary-custom" onClick={handleAdd} disabled={loading}>
                        {editingId ? 'Update' : 'Add'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default JobTracker;

