import React, { useState } from 'react';
import { Row, Col, Form, Button, Card, Badge, Alert } from 'react-bootstrap';
import { Search, ListChecks, Target, Loader } from 'lucide-react';
import api from '../api';

const JobAnalyzer = () => {
    const [jd, setJd] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    const handleAnalyze = async () => {
        setError('');
        setResults(null);

        if (!jd.trim()) {
            setError('Please enter a job description');
            return;
        }

        if (jd.trim().length < 50) {
            setError('Job description must be at least 50 characters');
            return;
        }

        setLoading(true);

        try {
            console.log('[JOB ANALYZER] Analyzing job description...');
            const res = await api.post('/api/analyze-job', 
                { jobDescription: jd },
                { timeout: 60000 }
            );

            if (res.data.error) {
                setError(res.data.error);
            } else {
                setResults(res.data);
            }
        } catch (err) {
            console.error('[JOB ANALYZER ERROR]', err);
            const errorMsg = err.response?.data?.error || err.message || 'Analysis failed';
            setError(`Error: ${errorMsg}. Make sure the backend is running.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 className="mb-1 d-flex align-items-center gap-2">
                <Search size={28} className="text-accent" />
                Job Description Analyzer
            </h2>
            <p className="text-muted mb-4">Extract key insights, skills, and requirements from any job posting</p>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible className="mb-4">{error}</Alert>}

            <Row className="mb-4">
                <Col md={12}>
                    <Card className="glass-card border-0 accent-border">
                        <Card.Body>
                            <h5 className="mb-3">Paste Job Description</h5>
                            <Form.Control 
                                as="textarea" 
                                rows={8} 
                                className="mb-3" 
                                placeholder="Paste the complete job description here..."
                                value={jd}
                                onChange={(e) => setJd(e.target.value)}
                                disabled={loading}
                            />
                            <Button 
                                className="btn-primary-custom" 
                                onClick={handleAnalyze} 
                                disabled={loading || !jd.trim()}
                                size="lg"
                            >
                                {loading ? (
                                    <>
                                        <Loader size={18} className="me-2" />
                                        Analyzing... (this may take 30 seconds)
                                    </>
                                ) : (
                                    <>
                                        <Search size={18} className="me-2" />
                                        Extract Key Insights
                                    </>
                                )}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {results && (
                <Row className="g-4 mb-4">
                    <Col md={4}>
                        <Card className="glass-card h-100 accent-border">
                            <Card.Body>
                                <h5 className="d-flex align-items-center gap-2 mb-4">
                                    <Target size={20} className="text-accent" />
                                    Key Skills Required
                                </h5>
                                <div className="d-flex flex-wrap gap-2">
                                    {results.skills && results.skills.length > 0 ? (
                                        results.skills.map((s, i) => (
                                            <Badge key={i} bg="primary" className="p-2 text-white">
                                                {s}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-muted mb-0">No skills identified</p>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col md={4}>
                        <Card className="glass-card h-100 accent-border">
                            <Card.Body>
                                <h5 className="d-flex align-items-center gap-2 mb-4">
                                    <ListChecks size={20} className="text-accent" />
                                    Requirements
                                </h5>
                                {results.requirements && results.requirements.length > 0 ? (
                                    <ul style={{ paddingLeft: '1.5rem', marginBottom: 0 }}>
                                        {results.requirements.map((r, i) => (
                                            <li key={i} className="small text-muted mb-2">{r}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-muted mb-0">No requirements identified</p>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col md={4}>
                        <Card className="glass-card h-100 accent-border">
                            <Card.Body>
                                <h5 className="d-flex align-items-center gap-2 mb-4">
                                    <Search size={20} className="text-accent" />
                                    ATS Keywords
                                </h5>
                                <div className="d-flex flex-wrap gap-2">
                                    {results.keywords && results.keywords.length > 0 ? (
                                        results.keywords.map((k, i) => (
                                            <Badge key={i} bg="success" className="p-2 text-white">
                                                {k}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-muted mb-0">No keywords identified</p>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {!results && !loading && (
                <Card className="glass-card border-0 text-center py-5">
                    <Card.Body>
                        <Search size={48} className="text-muted mb-3" />
                        <p className="text-muted">
                            Paste a job description to extract key skills, requirements, and ATS keywords.
                        </p>
                    </Card.Body>
                </Card>
            )}
        </div>
    );
};

export default JobAnalyzer;
