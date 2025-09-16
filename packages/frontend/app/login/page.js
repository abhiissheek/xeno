"use client";

import { useGoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch('http://localhost:3001/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeResponse.code }),
          credentials: 'include'
        });
        
        if (res.ok) {
          router.push('/campaigns');
        } else {
          const errorData = await res.json();
          setError(errorData.message || 'Login failed. Please try again.');
        }
      } catch (error) {
        console.error("Login error:", error);
        setError('Network error. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    },
    flow: 'auth-code',
    onError: (error) => {
      console.error('Google login failed:', error);
      setError('Google authentication failed. Please try again.');
    }
  });

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ 
        textAlign: 'center',
        backgroundColor: 'white',
        padding: '3rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{ 
          marginBottom: '2rem',
          color: '#333',
          fontSize: '2rem',
          fontWeight: 'bold'
        }}>
          Welcome to Xeno CRM
        </h1>
        
        <p style={{ 
          marginBottom: '2rem',
          color: '#666',
          fontSize: '1rem'
        }}>
          Please sign in with your Google account to continue
        </p>

        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}
        
        <button 
          onClick={() => login()} 
          disabled={isLoading}
          style={{ 
            padding: '12px 24px', 
            fontSize: '18px', 
            cursor: isLoading ? 'not-allowed' : 'pointer', 
            border: '1px solid #4285f4', 
            borderRadius: '4px',
            backgroundColor: '#4285f4',
            color: 'white',
            width: '100%',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          {isLoading ? 'Signing in...' : 'Sign in with Google 🚀'}
        </button>

        <p style={{ 
          marginTop: '1.5rem',
          fontSize: '0.875rem',
          color: '#888'
        }}>
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  );
}