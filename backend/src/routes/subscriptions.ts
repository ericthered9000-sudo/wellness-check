import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import * as betterSqlite3 from 'better-sqlite3';

const router = Router();

// Subscription tiers
export const TIERS = {
  free: {
    name: 'Free',
    price_monthly: 0,
    price_annual: 0,
    max_seniors: 1,
    max_family_members: 1,
    features: ['basic_wellness', 'daily_score', 'email_support']
  },
  family: {
    name: 'Family',
    price_monthly: 999, // $9.99 in cents
    price_annual: 9900,  // $99/year in cents
    max_seniors: 2,
    max_family_members: 5,
    features: ['basic_wellness', 'daily_score', 'pattern_detection', 'realtime_alerts', 'priority_support', 'privacy_dashboard']
  },
  premium: {
    name: 'Premium',
    price_monthly: 1499, // $14.99 in cents
    price_annual: 14900,  // $149/year in cents
    max_seniors: -1, // unlimited
    max_family_members: -1, // unlimited
    features: ['basic_wellness', 'daily_score', 'pattern_detection', 'realtime_alerts', 'priority_support', 'privacy_dashboard', 'health_integration', 'smartwatch_support', 'advanced_analytics', 'custom_alerts']
  }
};

export default (db: betterSqlite3.Database) => {
  // Get subscription plans
  router.get('/plans', (req: Request, res: Response) => {
    res.json({
      success: true,
      plans: TIERS
    });
  });

  // Get user's current subscription
  router.get('/current', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const subscription = db.prepare(`
        SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'
      `).get(req.user.id);

      if (!subscription) {
        // Return free tier
        return res.json({
          success: true,
          subscription: {
            tier: 'free',
            status: 'active',
            max_seniors: 1,
            max_family_members: 1,
            features: TIERS.free.features
          }
        });
      }

      res.json({
        success: true,
        subscription: {
          ...subscription,
          features: TIERS[(subscription as any).tier as keyof typeof TIERS]?.features || TIERS.free.features
        }
      });
    } catch (error) {
      console.error('Get subscription error:', error);
      res.status(500).json({ success: false, error: 'Failed to get subscription' });
    }
  });

  // Check if user can add more seniors
  router.get('/can-add-senior', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const subscription = db.prepare(`
        SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'
      `).get(req.user.id) as any;

      const tier = subscription?.tier || 'free';
      const tierConfig = TIERS[tier as keyof typeof TIERS];

      // Count current seniors for this user
      const seniors = db.prepare(`
        SELECT COUNT(*) as count FROM family_connections WHERE family_member_id = ?
      `).get(req.user.id) as { count: number };

      const canAdd = tierConfig.max_seniors === -1 || seniors.count < tierConfig.max_seniors;

      res.json({
        success: true,
        canAdd,
        current: seniors.count,
        max: tierConfig.max_seniors === -1 ? 'unlimited' : tierConfig.max_seniors
      });
    } catch (error) {
      console.error('Check senior limit error:', error);
      res.status(500).json({ success: false, error: 'Failed to check limit' });
    }
  });

  // Check if user can add more family members
  router.get('/can-add-family', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Get senior profile
      const seniorProfile = db.prepare(`
        SELECT user_id FROM senior_profiles WHERE user_id = ?
      `).get(req.user.id);

      if (!seniorProfile) {
        return res.status(400).json({ success: false, error: 'Only seniors can add family members' });
      }

      const subscription = db.prepare(`
        SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'
      `).get(req.user.id) as any;

      const tier = subscription?.tier || 'free';
      const tierConfig = TIERS[tier as keyof typeof TIERS];

      // Count current family members for this senior
      const family = db.prepare(`
        SELECT COUNT(*) as count FROM family_connections WHERE senior_id = ?
      `).get(req.user.id) as { count: number };

      const canAdd = tierConfig.max_family_members === -1 || family.count < tierConfig.max_family_members;

      res.json({
        success: true,
        canAdd,
        current: family.count,
        max: tierConfig.max_family_members === -1 ? 'unlimited' : tierConfig.max_family_members
      });
    } catch (error) {
      console.error('Check family limit error:', error);
      res.status(500).json({ success: false, error: 'Failed to check limit' });
    }
  });

  // Create checkout session for subscription
  router.post('/checkout', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { tier, billing } = req.body;

      if (!['family', 'premium'].includes(tier)) {
        return res.status(400).json({ success: false, error: 'Invalid tier' });
      }

      if (!['monthly', 'annual'].includes(billing)) {
        return res.status(400).json({ success: false, error: 'Invalid billing cycle' });
      }

      const tierConfig = TIERS[tier as keyof typeof TIERS];
      const price = billing === 'monthly' ? tierConfig.price_monthly : tierConfig.price_annual;

      // In production, this would create a Stripe checkout session
      // For now, we'll simulate it
      const checkoutSessionId = `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store pending checkout
      db.prepare(`
        INSERT INTO checkout_sessions (id, user_id, tier, billing, price, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(checkoutSessionId, req.user.id, tier, billing, price);

      res.json({
        success: true,
        checkoutSessionId,
        checkoutUrl: `https://checkout.stripe.com/pay/${checkoutSessionId}`,
        tier,
        billing,
        price: price / 100 // Convert cents to dollars
      });
    } catch (error) {
      console.error('Checkout error:', error);
      res.status(500).json({ success: false, error: 'Failed to create checkout session' });
    }
  });

  // Webhook to handle subscription events (from Stripe in production)
  router.post('/webhook', async (req: Request, res: Response) => {
    try {
      const { event, data } = req.body;

      // In production, verify Stripe webhook signature
      // For now, we'll handle simulated events

      if (event === 'checkout.session.completed') {
        const { userId, tier, billing } = data;

        // Create or update subscription
        const existingSub = db.prepare(`
          SELECT id FROM subscriptions WHERE user_id = ?
        `).get(userId);

        if (existingSub) {
          // Update existing subscription
          db.prepare(`
            UPDATE subscriptions
            SET tier = ?, billing_cycle = ?, status = 'active', updated_at = datetime('now')
            WHERE user_id = ?
          `).run(tier, billing, userId);
        } else {
          // Create new subscription
          const subId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          db.prepare(`
            INSERT INTO subscriptions (id, user_id, tier, billing_cycle, status, created_at)
            VALUES (?, ?, ?, ?, 'active', datetime('now'))
          `).run(subId, userId, tier, billing);
        }

        res.json({ success: true });
      } else {
        res.json({ success: true, message: 'Event not handled' });
      }
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ success: false, error: 'Webhook processing failed' });
    }
  });

  // Cancel subscription
  router.post('/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Downgrade to free tier
      db.prepare(`
        UPDATE subscriptions SET status = 'cancelled', updated_at = datetime('now')
        WHERE user_id = ?
      `).run(req.user.id);

      res.json({
        success: true,
        message: 'Subscription cancelled. You will retain access until the end of your billing period.'
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
    }
  });

  return router;
};