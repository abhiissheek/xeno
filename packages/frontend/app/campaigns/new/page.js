"use client";

import { useForm, useFieldArray } from 'react-hook-form';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import debounce from 'lodash.debounce';

export default function NewCampaign() {
  const [audienceSize, setAudienceSize] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
  const [isParsingAI, setIsParsingAI] = useState(false);
  const router = useRouter();

  const { control, register, handleSubmit, watch } = useForm({
    defaultValues: {
      campaignName: '',
      rules: [{ field: "total_spends", condition: ">", value: "" }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "rules"
  });

  const rules = watch('rules');

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:3001/auth/status', {
          credentials: 'include'
        });
        const data = await response.json();
        if (!data.authenticated) {
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);
  const fetchAudienceSize = useCallback(debounce(async (currentRules) => {
    const validRules = currentRules.filter(rule => rule.value !== '' && rule.value !== null);
    if (validRules.length === 0) {
        setAudienceSize(0);
        return;
    }
    try {
      const response = await fetch('http://localhost:3001/segments/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: validRules }),
        credentials: 'include'
      });
      if (response.status === 401) {
          router.push('/login');
          return;
      }
      const data = await response.json();
      if (response.ok) {
        setAudienceSize(data.audienceSize);
      }
    } catch (error) {
      console.error("Error fetching audience size:", error);
    }
  }, 500), [router]);

  useEffect(() => {
    fetchAudienceSize(rules);
  }, [rules, fetchAudienceSize]);

  const handleAIQuery = async () => {
    if (!naturalLanguageQuery.trim()) return;
    
    setIsParsingAI(true);
    try {
      const response = await fetch('http://localhost:3001/segments/parse-natural-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: naturalLanguageQuery }),
        credentials: 'include'
      });
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      
      const data = await response.json();
      if (response.ok && data.rules) {
        setValue('rules', data.rules);
        setNaturalLanguageQuery('');
      } else {
        alert('Failed to parse your query. Please try rephrasing it.');
      }
    } catch (error) {
      console.error('AI parsing error:', error);
      alert('Error processing your query. Please try again.');
    } finally {
      setIsParsingAI(false);
    }
  };
  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      
      if (response.ok) {
        router.push('/campaigns');
      } else {
        const result = await response.json();
        alert(`Error: ${result.message || 'Failed to create campaign'}`);
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert('An error occurred during submission.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <main>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Create New Campaign</h1>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Estimated Audience Size: {audienceSize}</h2>
        
        {/* AI-Powered Natural Language Query */}
        <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <h3 style={{ marginBottom: '1rem' }}>🤖 AI-Powered Segment Builder</h3>
          <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
            Describe your target audience in plain English (e.g., "users who spent more than 1000 and visited more than 5 times")
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={naturalLanguageQuery}
              onChange={(e) => setNaturalLanguageQuery(e.target.value)}
              placeholder="Describe your target audience..."
              style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              onKeyPress={(e) => e.key === 'Enter' && handleAIQuery()}
            />
            <button
              type="button"
              onClick={handleAIQuery}
              disabled={isParsingAI || !naturalLanguageQuery.trim()}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#4285f4', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: isParsingAI ? 'not-allowed' : 'pointer',
                opacity: isParsingAI ? 0.7 : 1
              }}
            >
              {isParsingAI ? 'Processing...' : 'Generate Rules'}
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{marginBottom: '20px'}}>
                <label htmlFor="campaignName" style={{fontWeight: 'bold'}}>Campaign Name: </label>
                <input {...register('campaignName')} id="campaignName" type="text" required style={{marginLeft: '10px', padding: '5px'}} />
            </div>

            {fields.map((item, index) => (
            <div key={item.id} style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
                <select {...register(`rules.${index}.field`)}>
                <option value="total_spends">Total Spends</option>
                <option value="visit_count">Visit Count</option>
                <option value="last_visit_date">Last Visit (days ago)</option>
                </select>
                <select {...register(`rules.${index}.condition`)}>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value="=">=</option>
                </select>
                <input {...register(`rules.${index}.value`)} placeholder="Value" type="number" required />
                <button type="button" onClick={() => remove(index)}>Remove</button>
            </div>
            ))}
            
            <button
            type="button"
            onClick={() => append({ field: 'total_spends', condition: '>', value: '' })}>
            Add Rule
            </button>
            <br />
            <input 
              type="submit" 
              value={isLoading ? "Creating Campaign..." : "Create & Send Campaign"} 
              disabled={isLoading}
              style={{ 
                marginTop: '20px', 
                padding: '10px', 
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
              }} 
            />
        </form>
      </main>
    </div>
  );
}