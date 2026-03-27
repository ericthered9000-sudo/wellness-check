import { useState } from 'react';
import './Pricing.css';
import { API_URL } from '../config';

interface PricingTier {
  name: string;
  id: string;
  monthly: number;
  annual: number;
  seniors: string;
  familyMembers: string;
  features: string[];
  highlighted: boolean;
  cta: string;
}

const tiers: PricingTier[] = [
  {
    name: 'Free',
    id: 'free',
    monthly: 0,
    annual: 0,
    seniors: '1',
    familyMembers: '1',
    features: [
      'Basic wellness monitoring',
      '1 senior profile',
      '1 family member',
      'Basic movement alerts',
      'Daily wellness score',
      'Email support',
    ],
    highlighted: false,
    cta: 'Get Started',
  },
  {
    name: 'Family',
    id: 'family',
    monthly: 9.99,
    annual: 99,
    seniors: '2',
    familyMembers: '5',
    features: [
      'Everything in Free',
      '2 senior profiles',
      'Up to 5 family members',
      'Advanced pattern detection',
      'Wellness score trends',
      'Real-time alerts',
      'Priority support',
      'Privacy dashboard',
    ],
    highlighted: false,
    cta: 'Start 7-Day Free Trial',
  },
  {
    name: 'Premium',
    id: 'premium',
    monthly: 14.99,
    annual: 149,
    seniors: 'Unlimited',
    familyMembers: 'Unlimited',
    features: [
      'Everything in Family',
      'Unlimited senior profiles',
      'Unlimited family members',
      'Health data integration',
      'Smartwatch support',
      'Advanced analytics',
      'Dedicated support',
      'Custom alert thresholds',
      '🔜 Calendar integration (v2)',
    ],
    highlighted: true,
    cta: 'Start 7-Day Free Trial',
  },
];

export function Pricing({ user, token }: { user: any; token?: string }) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (tier: string) => {
    if (!user || !token) {
      // Redirect to login
      window.location.href = '/login?redirect=pricing';
      return;
    }

    setLoading(tier);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier: tier,
          billing: billing,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>Simple, Transparent Pricing</h1>
        <p className="pricing-subtitle">
          Choose the plan that fits your family. All paid plans include a 7-day free trial.
        </p>
        
        <div className="billing-toggle">
          <button
            className={billing === 'monthly' ? 'active' : ''}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <div className="toggle-indicator">
            <span className="toggle-label">or</span>
            <button
              className={billing === 'annual' ? 'active' : ''}
              onClick={() => setBilling('annual')}
            >
              Annual
              <span className="save-badge">Save 17%</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="pricing-grid">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`pricing-card ${tier.highlighted ? 'highlighted' : ''} ${tier.name.toLowerCase()}`}
          >
            {tier.highlighted && (
              <div className="popular-badge">Most Popular</div>
            )}
            
            <div className="card-header">
              <h2>{tier.name}</h2>
              <div className="price">
                {billing === 'monthly' ? (
                  <>
                    <span className="amount">
                      {tier.monthly === 0 ? 'Free' : `$${tier.monthly}`}
                    </span>
                    {tier.monthly > 0 && <span className="period">/month</span>}
                  </>
                ) : (
                  <>
                    <span className="amount">
                      {tier.annual === 0 ? 'Free' : `$${tier.annual}`}
                    </span>
                    {tier.annual > 0 && <span className="period">/year</span>}
                  </>
                )}
              </div>
            </div>

            <div className="card-limits">
              <div className="limit-item">
                <span className="limit-label">Seniors</span>
                <span className="limit-value">{tier.seniors}</span>
              </div>
              <div className="limit-item">
                <span className="limit-label">Family Members</span>
                <span className="limit-value">{tier.familyMembers}</span>
              </div>
            </div>

            <ul className="features-list">
              {tier.features.map((feature, idx) => (
                <li key={idx} className={feature.includes('🔜') ? 'coming-soon' : ''}>
                  <span className="check">✓</span>
                  <span className="feature-text">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              className={`cta-button ${tier.highlighted ? 'primary' : 'secondary'}`}
              onClick={() => handleSubscribe(tier.id)}
              disabled={loading === tier.id || (tier.monthly === 0 && billing === 'annual')}
            >
              {loading === tier.id ? 'Loading...' : tier.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="pricing-footer">
        <p className="guarantee">
          🔒 No credit card required until trial ends. Cancel anytime in settings.
        </p>
        <p className="note">
          <em>Business and church plans coming in v2 — contact us for volume pricing.</em>
        </p>
      </div>
    </div>
  );
}
