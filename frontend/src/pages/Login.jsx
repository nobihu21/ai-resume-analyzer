import React from 'react';
import { Card, Form, Button, Container } from 'react-bootstrap';
import { LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';

const Login = () => {
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            alert("Google Login Failed");
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const email = e.target[0].value;
        const password = e.target[1].value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            alert("Login Failed. Check your credentials.");
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: 'var(--background)' }}>
            <Card className="glass-card p-4 border-0" style={{ width: '100%', maxWidth: '400px' }}>
                <Card.Body>
                    <div className="text-center mb-4">
                        <div className="bg-primary text-white d-inline-block p-3 rounded-circle mb-3">
                            <LogIn size={32} />
                        </div>
                        <h3>AI Job Assistant</h3>
                        <p className="text-muted">Empowering your career with AI</p>
                    </div>
                    <Form onSubmit={handleLogin}>
                        <Form.Group className="mb-3">
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control type="email" placeholder="name@example.com" required />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label>Password</Form.Label>
                            <Form.Control type="password" placeholder="••••••••" required />
                        </Form.Group>
                        <Button type="submit" className="w-100 btn-primary-custom py-2 mb-3">
                            Sign In
                        </Button>
                        <Button 
                            variant="outline-dark" 
                            className="w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                            onClick={handleGoogleLogin}
                        >
                             Continue with Google
                        </Button>
                    </Form>
                    <div className="text-center mt-4">
                        <span className="text-muted small">Don't have an account? <a href="#" className="text-accent fw-bold text-decoration-none">Sign Up</a></span>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Login;
