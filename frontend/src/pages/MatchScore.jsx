import React, { useState } from 'react';
import { Row, Col, Form, Button, Card, ProgressBar, Alert } from 'react-bootstrap';
import { Zap, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const MatchScore = () => {
    const { user } = useAuth();
    const [file, setFile] = useState(null);
    const [jd, setJd] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [fileName, setFileName] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
            setError('');
        }
    };

    const handleMatch = async () => {
        setError('');
        setResults(null);

        if (!file || !jd.trim()) {
            setError('Please upload a resume and enter a job description');
            return;
        }

        if (jd.trim().length < 50) {
            setError('Job description must be at least 50 characters');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('resume', file);
            formData.append('jobDescription', jd);

            console.log('[MATCH SCORE] Calculating match...');
            const res = await api.post('/api/match-score', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 60000
            });

            if (res.data.error) {
                setError(res.data.error);
            } else {
                setResults({
                    match_percentage: res.data.match_percentage || 0,
                    missing_skills: res.data.missing_skills || [],
                    explanation: res.data.explanation || ''
                });
            }
        } catch (err) {
            console.error('[MATCH SCORE ERROR]', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to calculate match';
            setError(`Error: ${errorMsg}. Make sure both backends are running.`);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#10B981';
        if (score >= 60) return '#F59E0B';
        return '#EF4444';
    };

    const getProgressVariant = (score) => {
        if (score >= 80) return 'success';
        if (score >= 60) return 'warning';
        return 'danger';
    };

    return (
        <div>
            <h2 className="mb-1 d-flex align-items-center gap-2">
                <Zap size={28} className="text-accent" />
                Resume vs Job Match Engine
            </h2>
            <p className="text-muted mb-4">Get a detailed match analysis between your resume and target job</p>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible className="mb-4">{error}</Alert>}

            <Row className="mb-4 g-4">
                <Col md={6}>
                    <Card className="glass-card border-0 h-100 accent-border">
                        <Card.Body>
                            <h5 className="mb-3 d-flex align-items-center gap-2">
                                📄 Step 1: Upload Resume (PDF)
                            </h5>
                            <Form.Group>
                                <Form.Control
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    disabled={loading}
                                />
                                {fileName && (
                                    <small className="text-muted mt-2 d-block">
                                        Selected: {fileName}
                                    </small>
                                )}
                            </Form.Group>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6}>
                    <Card className="glass-card border-0 h-100 accent-border">
                        <Card.Body>
                            <h5 className="mb-3 d-flex align-items-center gap-2">
                                💼 Step 2: Paste Job Description
                            </h5>
                            <Form.Group>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    placeholder="Paste the complete job description here..."
                                    value={jd}
                                    onChange={(e) => setJd(e.target.value)}
                                    disabled={loading}
                                />
                            </Form.Group>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <div className="text-center mb-5">
                <Button
                    className="btn-primary-custom px-5 py-3"
                    onClick={handleMatch}
                    disabled={loading || !file || !jd.trim()}
                    size="lg"
                >
                    {loading ? (
                        <>
                            <Loader size={20} className="me-2" />
                            Analyzing... (this may take 30 seconds)
                        </>
                    ) : (
                        <>
                            <Zap size={20} className="me-2" />
                            Compare & Score
                        </>
                    )}
                </Button>
            </div>

            {results && (
                <Row className="g-4">
                    <Col md={12}>
                        <Card className="glass-card border-0 mb-4 text-center" style={{borderTop: '4px solid var(--accent)'}}>
                            <Card.Body className="py-5">
                                <p className="text-muted mb-2">Match Score</p>
                                <div style={{
                                    fontSize: '4rem',
                                    fontWeight: '700',
                                    color: getScoreColor(results.match_percentage),
                                    marginBottom: '1rem'
                                }}>
                                    {results.match_percentage}%
                                </div>
                                <ProgressBar
                                    now={results.match_percentage}
                                    variant={getProgressVariant(results.match_percentage)}
                                    style={{ height: '24px', marginBottom: '1rem' }}
                                />
                                <p style={{
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    color: getScoreColor(results.match_percentage)
                                }}>
                                    {results.match_percentage >= 80
                                        ? '🎉 Excellent match!'
                                        : results.match_percentage >= 60
                                        ? '👍 Good match'
                                        : '⚠️ Consider improving'}
                                </p>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col md={6}>
                        <Card className="glass-card border-0">
                            <Card.Body>
                                <h5 className="d-flex align-items-center gap-2 mb-4">
                                    <XCircle className="text-danger" />
                                    Skills to Develop
                                </h5>
                                {results.missing_skills && results.missing_skills.length > 0 ? (
                                    <ul style={{ paddingLeft: '1.5rem', marginBottom: 0 }}>
                                        {results.missing_skills.map((skill, i) => (
                                            <li key={i} style={{ marginBottom: '0.75rem' }}>
                                                <strong>{skill}</strong>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-muted mb-0">No significant skill gaps detected!</p>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col md={6}>
                        <Card className="glass-card border-0">
                            <Card.Body>
                                <h5 className="d-flex align-items-center gap-2 mb-4">
                                    <CheckCircle className="text-success" />
                                    AI Evaluation
                                </h5>
                                <p style={{ lineHeight: '1.8', marginBottom: 0 }}>
                                    {results.explanation}
                                </p>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {!results && !loading && (
                <Card className="glass-card border-0 text-center py-5">
                    <Card.Body>
                        <AlertCircle size={48} className="text-muted mb-3" />
                        <p className="text-muted">
                            Upload your resume and enter a job description to get a detailed match analysis.
                        </p>
                    </Card.Body>
                </Card>
            )}
        </div>
    );
};

export default MatchScore;
