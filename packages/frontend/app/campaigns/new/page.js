"use client";

import { useForm, useFieldArray } from 'react-hook-form';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import debounce from 'lodash.debounce';

export default function NewCampaign() {
  const [audienceSize, setAudienceSize] = useState(0);
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
        credentials: 'include' // <-- Change 1 is here
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

  const onSubmit = async (data) => {
    try {
      const response = await fetch('http://localhost:3001/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include' // <-- Change 2 is here
      });
      
      if (response.ok) {
        router.push('/campaigns');
      } else {
        const result = await response.json();
        alert(`Error: ${result.message || 'Failed to create campaign'}`);
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert('An error occurred during submission.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <main>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Create New Campaign</h1>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>Estimated Audience Size: {audienceSize}</h2>
        
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
            <input type="submit" value="Create & Send Campaign" style={{ marginTop: '20px', padding: '10px', cursor: 'pointer' }} />
        </form>
      </main>
    </div>
  );
}