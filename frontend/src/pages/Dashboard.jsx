import React, { useState, useEffect } from 'react';
import { Row, Col, Card, ProgressBar } from 'react-bootstrap';
import { Zap, FileText, CheckCircle, TrendingUp, AlertCircle, Target, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFirestore } from '../hooks/useFirestore';

const Dashboard = () => {
  const { user, userProfile } = useAuth();
  const [stats, setStats] = useState({
    avgScore: 0,
    jobMatches: 0,
    applicationsSent: 0,
    interviews: 0
  });

  // Fetch user's jobs
  const { data: jobs } = useFirestore('jobs', user ? [{ field: 'userId', operator: '==', value: user.uid }] : null);

  // Calculate statistics
  useEffect(() => {
    if (jobs && jobs.length > 0) {
      const interviewsCount = jobs.filter(job => job.status === 'interview').length;
      const avgScore = Math.round(
        jobs.reduce((sum, job) => sum + (job.matchScore || 0), 0) / jobs.length
      );

      setStats({
        avgScore: avgScore || 0,
        jobMatches: jobs.filter(job => job.matchScore >= 70).length,
        applicationsSent: jobs.length,
        interviews: interviewsCount
      });
    }
  }, [jobs]);

  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'applied':
        return 'primary';
      case 'interview':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'offered':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const recentActivities = jobs?.slice(0, 5).map(job => ({
    id: job.id,
    company: job.company || 'Company',
    role: job.role || 'Role',
    status: job.status || 'applied',
    date: job.date || new Date().toLocaleDateString(),
    matchScore: job.matchScore || 0
  })) || [];

  return (
    <div>
      <div className="mb-5">
        <h2 className="mb-1">Welcome back, {userProfile?.displayName || 'User'}! 👋</h2>
        <p className="text-muted">Here's your job search overview</p>
      </div>

      {/* Statistics Cards */}
      <Row className="g-4 mb-5">
        <Col md={3}>
          <Card className="glass-card border-0 h-100 text-center accent-border">
            <Card.Body>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
                <FileText size={40} className="text-accent" />
              </div>
              <div className="stat-value">{stats.avgScore}%</div>
              <div className="stat-label">Avg. ATS Score</div>
              <ProgressBar 
                now={stats.avgScore} 
                className="mt-3" 
                style={{ height: '4px' }}
              />
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="glass-card border-0 h-100 text-center" style={{borderTop: '4px solid var(--accent)'}}>
            <Card.Body>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
                <Zap size={40} className="text-accent" />
              </div>
              <div className="stat-value">{stats.jobMatches}</div>
              <div className="stat-label">Strong Matches</div>
              <p className="text-muted small mt-3">Score ≥ 70%</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="glass-card border-0 h-100 text-center" style={{borderTop: '4px solid var(--success)'}}>
            <Card.Body>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
                <CheckCircle size={40} className="text-success" />
              </div>
              <div className="stat-value text-success">{stats.applicationsSent}</div>
              <div className="stat-label">Applications</div>
              <p className="text-muted small mt-3">Total sent</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="glass-card border-0 h-100 text-center" style={{borderTop: '4px solid var(--warning)'}}>
            <Card.Body>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
                <TrendingUp size={40} className="text-warning" />
              </div>
              <div className="stat-value text-warning">{stats.interviews}</div>
              <div className="stat-label">Interviews</div>
              <p className="text-muted small mt-3">Upcoming</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Recent Activity */}
        <Col lg={8}>
          <Card className="glass-card border-0 mb-4">
            <Card.Body>
              <div className="d-flex align-items-center justify-content-between mb-4">
                <h4 className="mb-0">Recent Activity</h4>
                <a href="/tracker" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  View all →
                </a>
              </div>

              {recentActivities.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="d-flex align-items-center p-3 border rounded"
                      style={{
                        borderColor: 'var(--border-color)',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                        e.currentTarget.style.borderColor = 'var(--accent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                      }}
                    >
                      <div className="me-3 p-2 bg-light rounded">
                        <FileText size={20} className="text-accent" />
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-bold">{activity.role} - {activity.company}</div>
                        <div className="text-muted small">Applied on {activity.date}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: getScoreColor(activity.matchScore)
                        }}>
                          {activity.matchScore}% Match
                        </div>
                        <span className={`badge bg-${getStatusBadgeColor(activity.status)} mt-1`}>
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle size={32} className="text-muted mb-2" />
                  <p className="text-muted">No applications yet. Start by analyzing a job!</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Quick Tips & Actions */}
        <Col lg={4}>
          <Card className="glass-card border-0 mb-3 accent-border">
            <Card.Body>
              <div className="d-flex align-items-center gap-2 mb-3">
                <Target size={20} className="text-accent" />
                <h5 className="mb-0">AI Insights</h5>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                <p className="mb-2">
                  💡 <strong>Resume Tip:</strong> Add quantifiable achievements to increase ATS score.
                </p>
                <p className="mb-2">
                  💡 <strong>Job Tips:</strong> Target roles with 70%+ match for better results.
                </p>
                <p className="mb-0">
                  💡 <strong>Career:</strong> Consider roles that align with your skills.
                </p>
              </div>
            </Card.Body>
          </Card>

          <Card className="glass-card border-0 accent-border">
            <Card.Body>
              <div className="d-flex align-items-center gap-2 mb-3">
                <Award size={20} className="text-accent" />
                <h5 className="mb-0">Next Steps</h5>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <a href="/resume" style={{
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Analyze your resume</span>
                  <span>→</span>
                </a>
                <a href="/job" style={{
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Find job matches</span>
                  <span>→</span>
                </a>
                <a href="/chatbot" style={{
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  padding: '0.5rem 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Chat with AI</span>
                  <span>→</span>
                </a>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
