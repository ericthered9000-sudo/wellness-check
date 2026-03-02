import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001';

interface WeeklyReport {
  id: string;
  senior_id: string;
  week_start: string;
  week_end: string;
  avg_wellness_score: number;
  steps_avg: number;
  heart_rate_avg: number;
  sleep_avg: number;
  medication_adherence: number;
  insights: string;
  created_at: string;
}

interface Props {
  seniorId: string;
}

export function WeeklyReport({ seniorId }: Props) {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (seniorId) {
      loadReport();
    }
  }, [seniorId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/reports/weekly/${seniorId}`);
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'neutral';
    return score >= 80 ? 'good' : score >= 60 ? 'moderate' : 'low';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="weekly-report">
        <h3>Loading Report...</h3>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="weekly-report">
        <h3>No Report Available</h3>
        <p>Reports are generated weekly. Check back later.</p>
      </div>
    );
  }

  return (
    <div className="weekly-report">
      <div className="report-header">
        <h2>Weekly Wellness Report</h2>
        <p className="report-period">
          Week of {formatDate(report.week_start)} - {formatDate(report.week_end)}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="report-grid">
        {/* Wellness Score */}
        <div className="report-card wellness">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h3>Wellness Score</h3>
            <div className={`score ${getScoreColor(report.avg_wellness_score)}`}>
              {report.avg_wellness_score}
            </div>
            <span className="label">out of 100</span>
          </div>
        </div>

        {/* Steps */}
        <div className="report-card steps">
          <div className="card-icon">🚶</div>
          <div className="card-content">
            <h3>Avg Steps</h3>
            <div className="number">{report.steps_avg.toLocaleString()}</div>
            <span className="label">per day</span>
          </div>
        </div>

        {/* Heart Rate */}
        <div className="report-card heart">
          <div className="card-icon">❤️</div>
          <div className="card-content">
            <h3>Avg Heart Rate</h3>
            <div className="number">{report.heart_rate_avg} BPM</div>
            <span className="label">normal: 60-100</span>
          </div>
        </div>

        {/* Sleep */}
        <div className="report-card sleep">
          <div className="card-icon">💤</div>
          <div className="card-content">
            <h3>Avg Sleep</h3>
            <div className="number">{report.sleep_avg} hrs</div>
            <span className="label">recommended: 7-8 hrs</span>
          </div>
        </div>

        {/* Medication Adherence */}
        <div className="report-card meds">
          <div className="card-icon">💊</div>
          <div className="card-content">
            <h3>Medication Adherence</h3>
            <div className={`score ${getScoreColor(report.medication_adherence)}`}>
              {report.medication_adherence}%
            </div>
            <span className="label">last 7 days</span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="report-insights">
        <h3> Insights</h3>
        <div className="insights-box">
          <p>{report.insights}</p>
        </div>
      </div>

      {/* Generate New Report Button */}
      <div className="report-actions">
        <button className="btn btn-primary" onClick={loadReport}>
          🔄 Refresh Report
        </button>
      </div>
    </div>
  );
}

export default { WeeklyReport };
