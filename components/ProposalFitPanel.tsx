"use client";

import { CheckCircle, AlertCircle, AlertTriangle, Loader2 } from "lucide-react";

/**
 * Proposal-Call Fit Analysis Panel
 *
 * Displays AI-powered analysis of proposal alignment with call requirements.
 * Phase 1.5 - First AI Assistant Implementation
 */

export interface FitAnalysisScore {
  overallScore: number; // 0-100
  scores: {
    eligibility: number;
    budget: number;
    timeline: number;
    strategicFit: number;
  };
  recommendations: string[];
  redFlags: string[];
  reasoning: string;
  generatedAt: number;
  model: string;
  tokensUsed: number;
}

interface ProposalFitPanelProps {
  analysis: FitAnalysisScore | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onContinue: () => void;
  onGoBack: () => void;
}

export default function ProposalFitPanel({
  analysis,
  isAnalyzing,
  onAnalyze,
  onContinue,
  onGoBack,
}: ProposalFitPanelProps) {
  // Helper to get score color
  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  // Helper to get score background color
  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return "bg-emerald-100";
    if (score >= 60) return "bg-amber-100";
    return "bg-red-100";
  };

  // Helper to get score label
  const getScoreLabel = (score: number): string => {
    if (score >= 90) return "Excellent Match";
    if (score >= 80) return "Good Match";
    if (score >= 70) return "Fair Match";
    if (score >= 60) return "Needs Improvement";
    return "Poor Match";
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          Proposal-Call Fit Analysis
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          AI-powered analysis to help you improve your proposal before submission
        </p>
      </div>

      {/* Loading State */}
      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
          <p className="text-gray-700 font-medium">Analyzing your proposal...</p>
          <p className="text-sm text-gray-500 mt-1">
            This may take 10-30 seconds
          </p>
        </div>
      )}

      {/* No Analysis Yet */}
      {!analysis && !isAnalyzing && (
        <div className="text-center py-8">
          <div className="mb-4 text-4xl">🎯</div>
          <p className="text-gray-600 mb-6">
            Get AI-powered feedback on how well your proposal aligns with this call's requirements.
          </p>
          <button
            onClick={onAnalyze}
            className="rounded-full bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            Analyze My Proposal
          </button>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !isAnalyzing && (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="text-center pb-6 border-b border-gray-200">
            <div className="text-sm text-gray-600 mb-2">Overall Alignment</div>
            <div className={`text-5xl font-bold ${getScoreColor(analysis.overallScore)} mb-2`}>
              {analysis.overallScore}%
            </div>
            <div
              className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${getScoreBgColor(analysis.overallScore)} ${getScoreColor(analysis.overallScore)}`}
            >
              {getScoreLabel(analysis.overallScore)}
            </div>
          </div>

          {/* Category Scores */}
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(analysis.scores).map(([category, score]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize font-medium text-gray-700">
                    {category.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  <span className={`font-semibold ${getScoreColor(score)}`}>
                    {score}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Red Flags (if any) */}
          {analysis.redFlags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-2">
                    Critical Issues
                  </h4>
                  <ul className="space-y-1">
                    {analysis.redFlags.map((flag, idx) => (
                      <li key={idx} className="text-sm text-red-800">
                        • {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    Recommendations to Improve Your Score
                  </h4>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-blue-800">
                        {idx + 1}. {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* AI Reasoning */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2 text-sm">
              Analysis Summary
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {analysis.reasoning}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={onGoBack}
              className="rounded-full border border-gray-300 bg-white px-6 py-2 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              ← Go Back to Edit
            </button>

            <div className="flex gap-3">
              <button
                onClick={onAnalyze}
                className="rounded-full border border-indigo-600 bg-white px-6 py-2 text-indigo-600 font-medium hover:bg-indigo-50 transition-colors"
              >
                Re-Analyze
              </button>
              <button
                onClick={onContinue}
                className={`rounded-full px-6 py-2 font-medium transition-colors ${
                  analysis.overallScore >= 60
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-amber-600 text-white hover:bg-amber-700"
                }`}
              >
                {analysis.overallScore >= 60
                  ? "Continue to Submit →"
                  : "Continue Anyway →"}
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="text-xs text-gray-500 text-center pt-2">
            Analysis generated by {analysis.model} •{" "}
            {new Date(analysis.generatedAt).toLocaleString()} •{" "}
            {analysis.tokensUsed.toLocaleString()} tokens
          </div>
        </div>
      )}
    </div>
  );
}
