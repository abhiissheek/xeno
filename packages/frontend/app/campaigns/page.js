"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CampaignsHistory() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        async function checkAuthAndFetchCampaigns() {
            try {
                // Check authentication status first
                const authResponse = await fetch('http://localhost:3001/auth/status', {
                    credentials: 'include'
                });
                const authData = await authResponse.json();
                
                if (!authData.authenticated) {
                    router.push('/login');
                    return;
                }
                
                setUser(authData.user);
                
                // Fetch campaigns
                const response = await fetch('http://localhost:3001/campaigns', {
                    credentials: 'include'
                });
                
                if (response.status === 401) {
                    router.push('/login');
                    return;
                }
                
                const data = await response.json();
                if (response.ok) {
                    setCampaigns(data);
                } else {
                    setError(data.message || 'Failed to fetch campaigns');
                }
            } catch (error) {
                console.error("Fetch error:", error);
                setError('An error occurred while fetching campaigns.');
            } finally {
                setLoading(false);
            }
        }
        checkAuthAndFetchCampaigns();
    }, [router]);

    const handleLogout = async () => {
        try {
            await fetch('http://localhost:3001/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if logout request fails
            router.push('/login');
        }

    if (loading) return <p style={{ padding: '2rem' }}>Loading campaigns...</p>;
    if (error) return <p style={{ padding: '2rem', color: 'red' }}>Error: {error}</p>;

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Campaign History</h1>
                    {user && <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>Welcome, {user.name}</p>}
                </div>
                <button 
                    onClick={handleLogout}
                    style={{ 
                        padding: '8px 16px', 
                        backgroundColor: '#dc3545', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Logout
                </button>
            </div>
            <button onClick={() => router.push('/campaigns/new')} style={{ marginBottom: '1rem', padding: '10px', cursor: 'pointer' }}>+ New Campaign</button>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>Audience Size</th>
                        <th style={styles.th}>Sent</th>
                        <th style={styles.th}>Failed</th>
                        <th style={styles.th}>Created At</th>
                    </tr>
                </thead>
                <tbody>
                    {campaigns.map(campaign => (
                        <tr key={campaign.id}>
                            <td style={styles.td}>{campaign.name}</td>
                            <td style={styles.td}>{campaign.audience_size}</td>
                            <td style={styles.td}>{campaign.sent_count || 0}</td>
                            <td style={styles.td}>{campaign.failed_count || 0}</td>
                            <td style={styles.td}>{new Date(campaign.created_at).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const styles = {
    th: { border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2' },
    td: { border: '1px solid #ddd', padding: '8px' }
};