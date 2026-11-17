import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { google, type androidpublisher_v3 } from 'googleapis';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import * as betterSqlite3 from 'better-sqlite3';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia',
});

// Lazy-initialized Google Play Android Publisher client (env-injected credentials).
let playPublisher: androidpublisher_v3.Androidpublisher | null = null;

function loadServiceAccountCredentials(): Record<string, unknown> {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON: not valid JSON');
    }
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_B64) {
    try {
      const json = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
      return JSON.parse(json);
    } catch (e) {
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_B64: not valid base64 JSON');
    }
  }

  throw new Error(
    'Google Play service account not configured. Set GOOGLE_SERVICE_ACCOUNT_B64 or GOOGLE_SERVICE_ACCOUNT_JSON.'
  );
}

function getPlayPublisher(): androidpublisher_v3.Androidpublisher {
  if (playPublisher) {
    return playPublisher;
  }

  const credentials = loadServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  playPublisher = google.androidpublisher({ version: 'v3', auth });
  return playPublisher;
}

function isEntitled(purchase: androidpublisher_v3.Schema$SubscriptionPurchase): boolean {
  // v3 purchases.subscriptions.get uses paymentState:
  // 0=pending, 1=payment received (active), 2=free trial, 3=pending deferred.
  const paymentState = purchase.paymentState;
  const autoRenewing = purchase.autoRenewing;
  const expiryTimeMillis = purchase.expiryTimeMillis ? parseInt(purchase.expiryTimeMillis, 10) : 0;

  if (expiryTimeMillis <= Date.now()) {
    return false;
  }

  if (autoRenewing !== true) {
    return false;
  }

  return paymentState === 1 || paymentState === 2;
}

function playStatus(purchase: androidpublisher_v3.Schema$SubscriptionPurchase): 'active' | 'trialing' {
  return purchase.paymentState === 2 ? 'trialing' : 'active';
}

// Subscription tiers configuration
export const TIERS = {
  free: {
    name: 'Free',
    price_monthly: 0,
    price_annual: 0,
    max_seniors: 1,
    max_family_members: 1,
    features: ['basic_wellness', 'daily_score', 'email_support'],
    stripe_price_monthly: null,
    stripe_price_annual: null,
  },
  family: {
    name: 'Family',
    price_monthly: 999, // $9.99 in cents
    price_annual: 9900,  // $99/year in cents
    max_seniors: 2,
    max_family_members: 5,
    features: ['basic_wellness', 'daily_score', 'pattern_detection', 'realtime_alerts', 'priority_support', 'privacy_dashboard'],
    stripe_price_monthly: process.env.STRIPE_PRICE_FAMILY_MONTHLY,
    stripe_price_annual: process.env.STRIPE_PRICE_FAMILY_ANNUAL,
  },
  premium: {
    name: 'Premium',
    price_monthly: 1499, // $14.99 in cents
    price_annual: 14900,  // $149/year in cents
    max_seniors: -1, // unlimited
    max_family_members: -1, // unlimited
    features: ['basic_wellness', 'daily_score', 'pattern_detection', 'realtime_alerts', 'priority_support', 'privacy_dashboard', 'health_integration', 'smartwatch_support', 'advanced_analytics', 'custom_alerts'],
    stripe_price_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    stripe_price_annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
  }
};

export default (db: betterSqlite3.Database) => {
  // Get subscription plans
  router.get('/plans', (req: Request, res: Response) => {
    res.json({
      success: true,
      plans: Object.keys(TIERS).map(key => ({
        id: key,
        ...TIERS[key as keyof typeof TIERS],
        price_monthly_display: TIERS[key as keyof typeof TIERS].price_monthly / 100,
        price_annual_display: TIERS[key as keyof typeof TIERS].price_annual / 100,
      }))
    });
  });

  // Verify a Google Play purchase with the Play Developer API.
  // Expected payload: { productId, purchaseToken, packageName? }
  router.post('/verify', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { productId, purchaseToken, packageName } = req.body;

      if (!purchaseToken || typeof purchaseToken !== 'string') {
        return res.status(422).json({
          success: false,
          error: 'purchaseToken is required for server-side verification'
        });
      }

      if (!productId || typeof productId !== 'string') {
        return res.status(400).json({ success: false, error: 'productId is required' });
      }

      const rawProductId = productId.toLowerCase();
      let tier: keyof typeof TIERS = 'free';
      let billingCycle: 'monthly' | 'annual' = 'monthly';

      if (rawProductId.includes('premium')) {
        tier = 'premium';
      } else if (rawProductId.includes('family')) {
        tier = 'family';
      }

      if (rawProductId.includes('annual')) {
        billingCycle = 'annual';
      } else if (rawProductId.includes('monthly')) {
        billingCycle = 'monthly';
      }

      const verifiedPackageName = typeof packageName === 'string' && packageName.trim()
        ? packageName.trim()
        : 'com.homebeacon.app';

      const publisher = getPlayPublisher();
      const response = await publisher.purchases.subscriptions.get({
        packageName: verifiedPackageName,
        subscriptionId: productId,
        token: purchaseToken,
      });
      const purchase = response.data;

      if (!isEntitled(purchase)) {
        logger.warn('Google Play purchase not entitled', {
          userId: req.user.id,
          productId,
          packageName: verifiedPackageName,
          paymentState: purchase.paymentState,
          autoRenewing: purchase.autoRenewing,
          expiryTimeMillis: purchase.expiryTimeMillis,
        });
        return res.status(400).json({
          success: false,
          error: 'Purchase is not active or in a valid trial'
        });
      }

      const status = playStatus(purchase);
      const expiryTime = purchase.expiryTimeMillis
        ? new Date(parseInt(purchase.expiryTimeMillis, 10)).toISOString()
        : null;

      const offerInfo = JSON.stringify({
        paymentState: purchase.paymentState,
        autoRenewing: purchase.autoRenewing,
        expiryTimeMillis: purchase.expiryTimeMillis,
        priceCurrencyCode: purchase.priceCurrencyCode,
        priceAmountMicros: purchase.priceAmountMicros,
        countryCode: purchase.countryCode,
        orderId: purchase.orderId,
        startTimeMillis: purchase.startTimeMillis,
      });

      const existingSub = db.prepare(`
        SELECT id FROM subscriptions WHERE user_id = ?
      `).get(req.user.id);

      if (existingSub) {
        db.prepare(`
          UPDATE subscriptions
          SET tier = ?, billing_cycle = ?, status = ?, product_id = ?, purchase_token = ?,
              package_name = ?, current_period_end = ?, verified_at = datetime('now'),
              payment_state = ?, subscription_state = ?, offer_info = ?, updated_at = datetime('now')
          WHERE user_id = ?
        `).run(
          tier,
          billingCycle,
          status,
          productId,
          purchaseToken,
          verifiedPackageName,
          expiryTime,
          purchase.paymentState ?? null,
          null,
          offerInfo,
          req.user.id
        );
      } else {
        const subId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        db.prepare(`
          INSERT INTO subscriptions (
            id, user_id, tier, billing_cycle, status, product_id, purchase_token, package_name,
            current_period_end, verified_at, payment_state, subscription_state, offer_info, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, datetime('now'))
        `).run(
          subId, req.user.id, tier, billingCycle, status, productId, purchaseToken,
          verifiedPackageName, expiryTime, purchase.paymentState ?? null, null, offerInfo
        );
      }

      logger.info(`Google Play subscription verified for user ${req.user.id}: ${tier} (${billingCycle}) ${status}`, {
        productId,
        packageName: verifiedPackageName,
        paymentState: purchase.paymentState,
      });
      res.json({ success: true, tier, billingCycle });
    } catch (error: any) {
      logger.error('Google Play subscription verification error:', {
        error: error?.message || error,
        stack: error?.stack,
      });
      res.status(500).json({ success: false, error: 'Verification failed' });
    }
  });

  // Get user's current subscription
  router.get('/current', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const subscription = db.prepare(`
        SELECT * FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trialing')
      `).get(req.user.id) as any;

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
          id: subscription.id,
          tier: subscription.tier,
          status: subscription.status,
          billing_cycle: subscription.billing_cycle,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          stripe_subscription_id: subscription.stripe_subscription_id,
          max_seniors: TIERS[subscription.tier as keyof typeof TIERS]?.max_seniors || 1,
          max_family_members: TIERS[subscription.tier as keyof typeof TIERS]?.max_family_members || 1,
          features: TIERS[subscription.tier as keyof typeof TIERS]?.features || TIERS.free.features
        }
      });
    } catch (error) {
      logger.error('Get subscription error:', error);
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
        SELECT * FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trialing')
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
      logger.error('Check senior limit error:', error);
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
        SELECT * FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trialing')
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
      logger.error('Check family limit error:', error);
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
      const priceId = billing === 'monthly' ? tierConfig.stripe_price_monthly : tierConfig.stripe_price_annual;

      if (!priceId) {
        return res.status(400).json({ success: false, error: 'Invalid price ID' });
      }

      // Get user email from database
      const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.id) as { email: string } | undefined;

      if (!user?.email) {
        return res.status(400).json({ success: false, error: 'User email required' });
      }

      // Create Stripe checkout session with 7-day trial
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription/cancel`,
        customer_email: user.email,
        subscription_data: {
          trial_period_days: 7, // 7-day free trial
          metadata: {
            userId: req.user.id,
            tier: tier,
            billing: billing,
          },
        },
        metadata: {
          userId: req.user.id,
          tier: tier,
          billing: billing,
        },
      });

      // Store checkout session in database
      db.prepare(`
        INSERT INTO checkout_sessions (id, user_id, tier, billing, stripe_session_id, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(session.id, req.user.id, tier, billing, session.id);

      res.json({
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error) {
      logger.error('Checkout error:', error);
      res.status(500).json({ success: false, error: 'Failed to create checkout session' });
    }
  });

  // Verify checkout session status
  router.get('/checkout/:sessionId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { sessionId } = req.params;

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session || session.payment_status !== 'paid') {
        return res.json({
          success: true,
          paid: false,
          status: session?.status || 'unknown',
        });
      }

      res.json({
        success: true,
        paid: true,
        subscriptionId: session.subscription,
      });
    } catch (error) {
      logger.error('Verify checkout error:', error);
      res.status(500).json({ success: false, error: 'Failed to verify checkout' });
    }
  });

  // Webhook to handle subscription events from Stripe
  router.post('/webhook', async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;

    let event;

    try {
      // Verify webhook signature (REQUIRED in all environments)
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        logger.error('[Stripe] STRIPE_WEBHOOK_SECRET not configured — rejecting webhook');
        return res.status(500).json({ error: 'Webhook not configured' });
      }
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    try {
      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const tier = session.metadata?.tier;
          const billing = session.metadata?.billing;

          if (!userId || !tier || !billing) {
            logger.error('Missing metadata in checkout session');
            return res.json({ received: true });
          }

          // Create or update subscription
          const existingSub = db.prepare(`
            SELECT id FROM subscriptions WHERE user_id = ?
          `).get(userId);

          if (existingSub) {
            // Update existing subscription
            db.prepare(`
              UPDATE subscriptions
              SET tier = ?, billing_cycle = ?, status = 'trialing', 
                  stripe_subscription_id = ?, updated_at = datetime('now')
              WHERE user_id = ?
            `).run(tier, billing, session.subscription, userId);
          } else {
            // Create new subscription
            const subId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            db.prepare(`
              INSERT INTO subscriptions (id, user_id, tier, billing_cycle, status, stripe_subscription_id, created_at)
              VALUES (?, ?, ?, ?, 'trialing', ?, datetime('now'))
            `).run(subId, userId, tier, billing, session.subscription);
          }

          logger.info(`Subscription created for user ${userId}: ${tier} (${billing})`);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const stripeSubId = subscription.id;

          // Find subscription in database
          const sub = db.prepare(`
            SELECT * FROM subscriptions WHERE stripe_subscription_id = ?
          `).get(stripeSubId) as any;

          if (sub) {
            const status = subscription.status === 'active' ? 'active' :
                          subscription.status === 'trialing' ? 'trialing' :
                          subscription.status === 'canceled' ? 'canceled' :
                          subscription.status === 'unpaid' ? 'unpaid' : 'active';

            const currentPeriodEnd = (subscription as any).current_period_end || 0;

            db.prepare(`
              UPDATE subscriptions
              SET status = ?, current_period_end = datetime(?, 'unixepoch'),
                  cancel_at_period_end = ?, updated_at = datetime('now')
              WHERE stripe_subscription_id = ?
            `).run(status, currentPeriodEnd, (subscription as any).cancel_at_period_end || false, stripeSubId);

            logger.info(`Subscription ${stripeSubId} updated to ${status}`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const stripeSubId = subscription.id;

          // Mark subscription as canceled
          db.prepare(`
            UPDATE subscriptions SET status = 'canceled', updated_at = datetime('now')
            WHERE stripe_subscription_id = ?
          `).run(stripeSubId);

          logger.info(`Subscription ${stripeSubId} canceled`);
          break;
        }

        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Webhook processing error:', error);
      res.status(500).json({ success: false, error: 'Webhook processing failed' });
    }
  });

  // Create billing portal session (for managing subscription)
  router.post('/portal', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Get user's Stripe subscription
      const subscription = db.prepare(`
        SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ? AND stripe_subscription_id IS NOT NULL
      `).get(req.user.id) as { stripe_subscription_id: string } | undefined;

      if (!subscription?.stripe_subscription_id) {
        return res.status(400).json({ success: false, error: 'No active subscription found' });
      }

      // Get customer ID from subscription
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);

      // Create billing portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeSub.customer as string,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription`,
      });

      res.json({
        success: true,
        portalUrl: portalSession.url,
      });
    } catch (error) {
      logger.error('Portal session error:', error);
      res.status(500).json({ success: false, error: 'Failed to create portal session' });
    }
  });

  // Cancel subscription
  router.post('/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Get user's subscription
      const subscription = db.prepare(`
        SELECT * FROM subscriptions WHERE user_id = ? AND stripe_subscription_id IS NOT NULL
      `).get(req.user.id) as any;

      if (!subscription?.stripe_subscription_id) {
        return res.status(400).json({ success: false, error: 'No active subscription found' });
      }

      // Cancel at period end (user keeps access until end of billing period)
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      // Update database
      db.prepare(`
        UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(req.user.id);

      res.json({
        success: true,
        message: 'Subscription will be canceled at the end of your billing period.',
        accessUntil: subscription.current_period_end,
      });
    } catch (error) {
      logger.error('Cancel subscription error:', error);
      res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
    }
  });

  return router;
};
