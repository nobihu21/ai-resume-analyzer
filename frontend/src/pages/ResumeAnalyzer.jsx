import React, { useState } from 'react';
import { Row, Col, Form, Button, Card, ProgressBar, Badge } from 'react-bootstrap';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../api';

const ResumeAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await api.post('/api/analyze-resume', formData);
      setResults(res.data);
    } catch (err) {
      console.error(err);
      alert('Analysis failed. Make sure both backends are running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4">AI Resume Analyzer</h2>
      
      <Row>
        <Col md={12}>
          <div className="glass-card mb-4 text-center py-5 border-dashed">
            <Upload className="text-accent mb-3" size={48} />
            <h4>Upload your Resume (PDF)</h4>
            <p className="text-muted">Drag & drop or click to choose a file</p>
            <Form.Group className="mb-3 d-flex justify-content-center">
              <Form.Control 
                type="file" 
                className="w-50" 
                onChange={(e) => setFile(e.target.files[0])}
                accept=".pdf"
              />
            </Form.Group>
            <Button 
                className="btn-primary-custom" 
                onClick={handleUpload}
                disabled={loading || !file}
            >
              {loading ? 'Analyzing...' : 'Start Analysis'}
            </Button>
          </div>
        </Col>
      </Row>

      {results && (
        <Row className="framer-motion-anim">
          <Col md={4}>
            <Card className="glass-card text-center h-100">
              <Card.Body>
                <h4>ATS Score</h4>
                <div className="display-4 fw-bold text-primary my-4">{results.score}%</div>
                <ProgressBar now={results.score} variant={results.score > 70 ? 'success' : 'warning'} />
              </Card.Body>
            </Card>
          </Col>
          <Col md={8}>
            <Card className="glass-card mb-4">
              <Card.Body>
                <h4><AlertCircle className="me-2" /> Missing Keywords</h4>
                <div className="d-flex flex-wrap gap-2 mt-3">
                  {results.missing_keywords?.map((kw, i) => (
                    <Badge key={i} bg="secondary" className="p-2">{kw}</Badge>
                  ))}
                </div>
              </Card.Body>
            </Card>
            <Card className="glass-card">
              <Card.Body>
                <h4><CheckCircle2 className="me-2 text-success" /> Improvement Suggestions</h4>
                <ul className="mt-3">
                  {results.suggestions?.map((s, i) => (
                    <li key={i} className="mb-2">{s}</li>
                  ))}
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default ResumeAnalyzer;
