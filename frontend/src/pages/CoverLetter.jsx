import React, { useState } from 'react';
import { Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { FileEdit, Copy, Download, Loader } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useFirestoreMutations } from '../hooks/useFirestore';

const CoverLetter = () => {
    const { user } = useAuth();
    const { addDocument } = useFirestoreMutations();
    
    const [file, setFile] = useState(null);
    const [jd, setJd] = useState('');
    const [loading, setLoading] = useState(false);
    const [letter, setLetter] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [fileName, setFileName] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
            setError('');
        }
    };

    const handleGenerate = async () => {
        setError('');
        setSuccess('');
        setLetter('');

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

            console.log('[COVER LETTER] Generating cover letter...');
            const res = await axios.post('http://localhost:5000/api/generate-cover-letter', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 60000
            });

            if (res.data.error) {
                setError(res.data.error);
            } else {
                setLetter(res.data.cover_letter || '');
                setSuccess('Cover letter generated successfully!');

                // Save to Firestore
                if (user?.uid) {
                    try {
                        await addDocument('ai_results', {
                            userId: user.uid,
                            type: 'cover_letter',
                            content: res.data.cover_letter,
                            fileName: fileName
                        });
                        console.log('[COVER LETTER] Saved to Firestore');
                    } catch (err) {
                        console.error('Failed to save to Firestore:', err);
                    }
                }
            }
        } catch (err) {
            console.error('[COVER LETTER ERROR]', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to generate cover letter';
            setError(`Error: ${errorMsg}. Make sure both backends are running.`);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(letter);
        setSuccess('Copied to clipboard!');
        setTimeout(() => setSuccess(''), 2000);
    };

    const downloadAsTxt = () => {
        const element = document.createElement('a');
        const file = new Blob([letter], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = 'cover_letter.txt';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div>
            <h2 className="mb-4 d-flex align-items-center gap-2">
                <FileEdit size={28} className="text-accent" />
                AI Cover Letter Generator
            </h2>

            {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
            {success && <Alert variant="success" className="mb-4">{success}</Alert>}

            <Row className="mb-4">
                <Col md={12}>
                    <Card className="glass-card border-0 mb-4">
                        <Card.Body>
                            <h5 className="mb-4">Step 1: Upload Your Resume & Enter Job Description</h5>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>📄 Upload Resume (PDF)</Form.Label>
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
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>💼 Job Description</Form.Label>
                                        <Form.Control 
                                            as="textarea" 
                                            rows={4} 
                                            placeholder="Paste the complete job description..."
                                            value={jd}
                                            onChange={(e) => setJd(e.target.value)}
                                            disabled={loading}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Button 
                                className="btn-primary-custom" 
                                onClick={handleGenerate} 
                                disabled={loading || !file || !jd.trim()}
                                size="lg"
                            >
                                {loading ? (
                                    <>
                                        <Loader size={18} className="me-2" />
                                        Generating... (this may take 30 seconds)
                                    </>
                                ) : (
                                    <>
                                        <FileEdit size={18} className="me-2" />
                                        Generate Personalized Letter
                                    </>
                                )}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {letter && (
                <Row>
                    <Col md={12}>
                        <Card className="glass-card border-0">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h4 className="mb-0">Generated Cover Letter</h4>
                                    <div className="d-flex gap-2">
                                        <Button 
                                            variant="outline-secondary" 
                                            size="sm"
                                            onClick={copyToClipboard}
                                            title="Copy to clipboard"
                                        >
                                            <Copy size={18} />
                                        </Button>
                                        <Button 
                                            variant="outline-secondary" 
                                            size="sm"
                                            onClick={downloadAsTxt}
                                            title="Download as text file"
                                        >
                                            <Download size={18} />
                                        </Button>
                                    </div>
                                </div>

                                <div style={{
                                    backgroundColor: '#F8FAFC',
                                    padding: '1.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    lineHeight: '1.8',
                                    whiteSpace: 'pre-wrap',
                                    wordWrap: 'break-word',
                                    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                                    fontSize: '0.95rem',
                                    color: 'var(--text-main)'
                                }}>
                                    {letter}
                                </div>

                                <div className="mt-4 p-3 bg-light rounded">
                                    <h6 className="mb-2">💡 Tips:</h6>
                                    <ul style={{ fontSize: '0.9rem', marginBottom: 0 }}>
                                        <li>Personalize with specific details about the company</li>
                                        <li>Adjust the tone if needed before sending</li>
                                        <li>Keep it to one page</li>
                                        <li>Proofread for spelling and grammar</li>
                                    </ul>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {!letter && !loading && (
                <Row>
                    <Col md={12}>
                        <Card className="glass-card border-0 text-center py-5">
                            <Card.Body>
                                <FileEdit size={48} className="text-muted mb-3" />
                                <p className="text-muted">
                                    Upload your resume and enter a job description to generate a personalized cover letter.
                                </p>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}
        </div>
    );
};

export default CoverLetter;
