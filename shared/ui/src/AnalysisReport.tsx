// packages/shared/ui/src/AnalysisReport.tsx
'use client';

import React from 'react';
import { SentimentAnalysisResponse, RichAnalysisResponse } from '@metiscore/types';

type AnalysisResponse = SentimentAnalysisResponse | RichAnalysisResponse;

const InfoCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`bg-slate-50 p-4 rounded-lg border border-slate-200 ${className}`}>
    <h3 className="text-md font-semibold text-slate-700 mb-2">{title}</h3>
    <div className="text-sm text-slate-600">{children}</div>
  </div>
);

const StatusDisplay: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="text-center bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-indigo-600 capitalize">{value}</p>
        </div>
    );
}

// This component now handles BOTH types of analysis reports
export const AnalysisReport = ({ response }: { response: AnalysisResponse }) => {

  // Check if the response is the rich version for the partner
  if ('partnerSupportInsights' in response) {
    // --- RENDER THE "SECRET SAUCE" PROTECTED PARTNER VIEW ---
    const richResponse = response as RichAnalysisResponse;
    return (
      <div className="space-y-4 animate-fade-in w-full">
        <h2 className="text-xl font-bold text-center text-gray-800">Relational Health Summary</h2>
        <StatusDisplay 
          label="Relationship Health" 
          value={richResponse.partnerSupportInsights?.relationshipHealth} 
        />
        {richResponse.relationshipSupport && (
          <InfoCard title="Support Recommendations">
            <ul className="list-disc list-inside space-y-1">
              {richResponse.relationshipSupport.map((rec, i) => <li key={i}>{rec}</li>)}
            </ul>
          </InfoCard>
        )}
        {richResponse.crisisAssessment && (
           <InfoCard title="Safety Assessment" className="bg-yellow-50 border-yellow-200">
              <p>Risk Level: <span className="font-bold capitalize">{richResponse.crisisAssessment.riskLevel}</span></p>
           </InfoCard>
        )}
      </div>
    );
  }

  // --- RENDER THE ORIGINAL, BASIC VIEW FOR THE PRIMARY USER ---
  const simpleResponse = response as SentimentAnalysisResponse;
  const { insights, sentiment, emotions, crisisAssessment } = simpleResponse;

  const getCrisisColor = (level?: string) => {
    if (!level) return 'bg-gray-100 border-gray-500 text-gray-900';
    const s = level.toLowerCase();
    if (s.includes('high') || s.includes('critical')) return 'bg-red-100 border-red-500 text-red-900';
    if (s.includes('medium') || s.includes('elevated')) return 'bg-yellow-100 border-yellow-500 text-yellow-900';
    return 'bg-green-100 border-green-500 text-green-900';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full">
      <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">AI Analysis Report</h3>
      <div className="bg-slate-50 p-4 rounded-lg shadow-sm mb-4">
        <h4 className="text-lg font-semibold text-blue-700 mb-2">Overall Assessment</h4>
        <p className="text-slate-700">{insights?.overall_assessment || 'No assessment available.'}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-slate-50 p-4 rounded-lg shadow-sm">
          <h4 className="font-semibold text-lg mb-2 text-slate-700">Sentiment</h4>
          <p className="text-slate-600">Category: {sentiment?.category || 'N/A'}</p>
          <p className="text-slate-600">Score: {sentiment?.score?.toFixed(2) || 'N/A'}</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg shadow-sm">
          <h4 className="font-semibold text-lg mb-2 text-slate-700">Emotions</h4>
          <p className="text-slate-600">Primary: {emotions?.primary || 'N/A'}</p>
          <p className="text-slate-600">Intensity: {emotions?.emotional_intensity?.toFixed(2) || 'N/A'}</p>
        </div>
        <div className={`p-4 rounded-lg shadow-sm border-l-4 ${getCrisisColor(crisisAssessment?.risk_level)} md:col-span-2`}>
          <h4 className="font-semibold text-lg mb-2">Crisis Assessment</h4>
          <p>Risk: {crisisAssessment?.risk_level || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};
