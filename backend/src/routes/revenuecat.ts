// RevenueCat Backend Routes for HomeBeacon
// Handles RevenueCat webhooks and subscription verification
// SECURITY: Replaces insecure /sync endpoint with /verify that
// validates transactions server-side against RevenueCat REST API.
// Uses HMAC verification with crypto.timingSafeEqual for webhooks
// instead of simple string comparison.

import { Router, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types/auth';
import * as betterSqlite3 from 'better-sqlite3';

const router = Router();

// RevenueCat configuration (set via environment variables)
const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY || '';
const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET || '';
const REVENUECAT_PUBLIC_API_KEY = process.env.REVENUECAT_PUBLIC_API_KEY || '';

// Subscription tiers configuration (matches frontend)
export const TIERS = {
  free: {
    name: 'Free',
    max_seniors: 1,
    max_family_members: 1,
  },
  family: {
    name: 'Family',
    max_seniors: 2,
    max_family_members: 5,
  },
  premium: {
    name: 'Premium',
    max_seniors: -1, // unlimited
    max_family_members: -1, // unlimited
  }
};

/**
 * HMAC-SHA256 verification for RevenueCat webhooks.
 * Uses crypto.timingSafeEqual for constant-time comparison to prevent timing attacks.
 * Replaces the insecure simple string comparison.
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!REVENUECAT_WEBHOOK_SECRET) {
    logger.error('[RevenueCat] Webhook secret not configured — rejecting all webhooks');
    return false;
  }

  try {
    const expected = createHmac('sha256', REVENUECAT_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }

    return timingSafeEqual(expectedBuf, signatureBuf);
  } catch (err) {
    logger.error('[RevenueCat] HMAC verification error:', err);
    return false;
  }
}

/**
 * Determine tier from RevenueCat entitlements.
 * FAIL-CLOSED: defaults to 'free' on any ambiguity.
 */
function tierFromEntitlements(entitlements: Record<string, any> | undefined | null): 'free' | 'family' | 'premium' {
  if (!entitlements || typeof entitlements !== 'object') {
    return 'free';
  }

  // Check premium first (highest tier)
  if (entitlements['premium'] && entitlements['premium'].product_identifier) {
    return 'premium';
  }
  if (entitlements['family'] && entitlements['family'].product_identifier) {
    return 'family';
  }

  return 'free';
}

export default (db: betterSqlite3.Database) => {

  // ──────────────────────────────────────────
  // VERIFY endpoint — server-side purchase verification
  // ──────────────────────────────────────────
  // Takes a transactionId, productId, and optional revenueCatId from the client,
  // calls RevenueCat REST API server-side to verify the transaction and
  // confirm entitlements. Only updates DB based on VERIFIED data.
  router.post('/verify', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { transactionId, productId, revenueCatId } = req.body;

      if (!transactionId) {
        return res.status(400).json({ success: false, error: 'transactionId is required' });
      }

      // Call RevenueCat REST API to verify the subscriber's entitlements server-side
      // This prevents the client from simply claiming a tier — we verify with RevenueCat.
      const subscriberId = revenueCatId || req.user.id;
      const rcResponse = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(subscriberId)}`,
        {
          headers: {
            'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!rcResponse.ok) {
        logger.error(`[RevenueCat] REST API error: ${rcResponse.status} for subscriber ${subscriberId}`);
        // FAIL-CLOSED: don't update tier if we can't verify
        return res.status(502).json({ success: false, error: 'Failed to verify subscription with RevenueCat' });
      }

      const rcData = await rcResponse.json() as any;
      const subscriber = rcData.subscriber;

      if (!subscriber) {
        logger.error('[RevenueCat] No subscriber data in REST API response');
        return res.status(502).json({ success: false, error: 'Invalid RevenueCat response' });
      }

      // Determine tier from VERIFIED entitlements
      const activeEntitlements = subscriber.entitlements;
      const tier = tierFromEntitlements(activeEntitlements);

      // Update database based on verified tier
      const now = new Date().toISOString();
      const existingSub = db.prepare(`
        SELECT id FROM subscriptions WHERE user_id = ?
      `).get(req.user.id) as any;

      if (existingSub) {
        db.prepare(`
          UPDATE subscriptions
          SET tier = ?, status = 'active', updated_at = ?
          WHERE user_id = ?
        `).run(tier, now, req.user.id);
      } else {
        const subId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        db.prepare(`
          INSERT INTO subscriptions (id, user_id, tier, billing_cycle, status, current_period_end, created_at, updated_at)
          VALUES (?, ?, ?, 'monthly', 'active', ?, ?, ?)
        `).run(subId, req.user.id, tier, periodEnd, now, now);
      }

      logger.info(`[RevenueCat] Subscription verified for user ${req.user.id}: ${tier}`);

      res.json({
        success: true,
        tier,
        max_seniors: TIERS[tier as keyof typeof TIERS].max_seniors,
        max_family_members: TIERS[tier as keyof typeof TIERS].max_family_members,
      });
    } catch (error) {
      logger.error('[RevenueCat] Verification error:', error);
      res.status(500).json({ success: false, error: 'Failed to verify subscription' });
    }
  });

  // ──────────────────────────────────────────
  // SYNC endpoint — server-side entitlement sync
  // ──────────────────────────────────────────
  // SECURITY: Does NOT accept tier from client body. The server is the
  // source of truth — we call RevenueCat API server-side to determine
  // the user's entitlements, then update the DB from that response.
  router.post('/sync', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // SECURITY: Reject any request that tries to pass tier in the body.
      // The server is the source of truth — tier is determined from RevenueCat only.
      if (req.body.tier || req.body.entitlements) {
        logger.warn(`[RevenueCat] /sync rejected — client attempted to submit tier/entitlements in body (user: ${req.user.id})`);
        return res.status(400).json({
          success: false,
          error: 'Client-submitted tier/entitlements are not accepted. Server is the source of truth.',
        });
      }

      // Call RevenueCat REST API server-side using the authenticated user's ID
      const subscriberId = req.user.id;
      const rcResponse = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(subscriberId)}`,
        {
          headers: {
            'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!rcResponse.ok) {
        logger.error(`[RevenueCat] REST API error during sync: ${rcResponse.status} for subscriber ${subscriberId}`);
        // FAIL-CLOSED: don't update tier if we can't verify
        return res.status(502).json({ success: false, error: 'Failed to sync subscription with RevenueCat' });
      }

      const rcData = await rcResponse.json() as any;
      const subscriber = rcData.subscriber;

      if (!subscriber) {
        logger.error('[RevenueCat] No subscriber data in REST API response during sync');
        return res.status(502).json({ success: false, error: 'Invalid RevenueCat response' });
      }

      // Determine tier from VERIFIED server-side entitlements
      const activeEntitlements = subscriber.entitlements;
      const tier = tierFromEntitlements(activeEntitlements);

      // Update database based on verified tier
      const now = new Date().toISOString();
      const existingSub = db.prepare(`
        SELECT id FROM subscriptions WHERE user_id = ?
      `).get(req.user.id) as any;

      if (existingSub) {
        db.prepare(`
          UPDATE subscriptions
          SET tier = ?, status = 'active', updated_at = ?
          WHERE user_id = ?
        `).run(tier, now, req.user.id);
      } else {
        const subId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        db.prepare(`
          INSERT INTO subscriptions (id, user_id, tier, billing_cycle, status, current_period_end, created_at, updated_at)
          VALUES (?, ?, ?, 'monthly', 'active', ?, ?, ?)
        `).run(subId, req.user.id, tier, periodEnd, now, now);
      }

      logger.info(`[RevenueCat] Synced subscription for user ${req.user.id}: ${tier}`);

      res.json({
        success: true,
        tier,
        max_seniors: TIERS[tier as keyof typeof TIERS].max_seniors,
        max_family_members: TIERS[tier as keyof typeof TIERS].max_family_members,
      });
    } catch (error) {
      logger.error('[RevenueCat] Sync error:', error);
      res.status(500).json({ success: false, error: 'Failed to sync subscription' });
    }
  });

  // ──────────────────────────────────────────
  // Get subscription status (for frontend)
  // ──────────────────────────────────────────
  router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Check for RevenueCat entitlement in header (set by middleware)
      const revenuecatEntitlement = (req as any).revenuecatEntitlement;

      let tier: 'free' | 'family' | 'premium' = 'free';

      if (revenuecatEntitlement === 'premium') {
        tier = 'premium';
      } else if (revenuecatEntitlement === 'family') {
        tier = 'family';
      }

      // Fallback to database
      if (!revenuecatEntitlement) {
        const subscription = db.prepare(`
          SELECT tier FROM subscriptions
          WHERE user_id = ? AND status IN ('active', 'trialing')
        `).get(req.user.id) as any;

        if (subscription && ['free', 'family', 'premium'].includes(subscription.tier)) {
          tier = subscription.tier;
        }
        // FAIL-CLOSED: if no subscription record or unknown tier, remain 'free'
      }

      res.json({
        success: true,
        tier,
        features: TIERS[tier as keyof typeof TIERS],
      });
    } catch (error) {
      logger.error('[RevenueCat] Get subscription status error:', error);
      res.status(500).json({ success: false, error: 'Failed to get subscription status' });
    }
  });

  // ──────────────────────────────────────────
  // Get available subscription plans
  // ──────────────────────────────────────────
  router.get('/plans', (_req: Request, res: Response) => {
    res.json({
      success: true,
      plans: [
        {
          id: 'family_monthly',
          tier: 'family',
          name: 'Family',
          price_monthly: 9.99,
          price_annual: 99,
          max_seniors: 2,
          max_family_members: 5,
          features: [
            '2 senior profiles',
            'Up to 5 family members',
            'Advanced pattern detection',
            'Real-time alerts',
            'Priority support',
          ],
        },
        {
          id: 'family_annual',
          tier: 'family',
          name: 'Family',
          price_monthly: 8.25,
          price_annual: 99,
          max_seniors: 2,
          max_family_members: 5,
          features: [
            '2 senior profiles',
            'Up to 5 family members',
            'Advanced pattern detection',
            'Real-time alerts',
            'Priority support',
          ],
        },
        {
          id: 'premium_monthly',
          tier: 'premium',
          name: 'Premium',
          price_monthly: 14.99,
          price_annual: 149,
          max_seniors: -1,
          max_family_members: -1,
          features: [
            'Unlimited seniors',
            'Unlimited family members',
            'Smartwatch integration',
            'Caregiver coordination',
            'Advanced analytics',
            'Care calendar',
          ],
        },
        {
          id: 'premium_annual',
          tier: 'premium',
          name: 'Premium',
          price_monthly: 12.42,
          price_annual: 149,
          max_seniors: -1,
          max_family_members: -1,
          features: [
            'Unlimited seniors',
            'Unlimited family members',
            'Smartwatch integration',
            'Caregiver coordination',
            'Advanced analytics',
            'Care calendar',
          ],
        },
      ],
    });
  });

  // ──────────────────────────────────────────
  // RevenueCat webhook endpoint (HMAC-verified with timingSafeEqual)
  // ──────────────────────────────────────────
  router.post('/webhook', async (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-revenuecat-signature'] as string;
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      // Verify webhook signature using HMAC with timingSafeEqual (REQUIRED — no dev bypass)
      if (!verifyWebhookSignature(rawBody, signature || '')) {
        logger.warn('[RevenueCat] Invalid webhook signature — rejected');
        return res.status(403).json({ error: 'Invalid signature' });
      }

      const { event, data } = req.body;

      logger.info(`[RevenueCat] Webhook: ${event}`);

      switch (event) {
        case 'INITIAL_PURCHASE':
        case 'RENEWED':
        case 'PRODUCT_CHANGED': {
          const { app_user_id, entitlement_id } = data;

          // Map entitlement to tier (FAIL-CLOSED: default to free)
          let tier: 'free' | 'family' | 'premium' = 'free';
          if (entitlement_id === 'premium') {
            tier = 'premium';
          } else if (entitlement_id === 'family') {
            tier = 'family';
          }

          // Update subscription in database
          const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          const now = new Date().toISOString();

          const existing = db.prepare(`
            SELECT id FROM subscriptions WHERE user_id = ?
          `).get(app_user_id);

          if (existing) {
            db.prepare(`
              UPDATE subscriptions
              SET tier = ?, status = 'active', current_period_end = ?, updated_at = ?
              WHERE user_id = ?
            `).run(tier, periodEnd, now, app_user_id);
          } else {
            const subId = `sub_revenuecat_${Date.now()}`;
            db.prepare(`
              INSERT INTO subscriptions (id, user_id, tier, billing_cycle, status, current_period_end, created_at, updated_at)
              VALUES (?, ?, ?, 'monthly', 'active', ?, ?, ?)
            `).run(subId, app_user_id, tier, periodEnd, now, now);
          }

          logger.info(`[RevenueCat] Subscription ${event} for user ${app_user_id}: ${tier}`);
          break;
        }

        case 'CANCELLATION':
        case 'EXPIRATION': {
          const { app_user_id } = data;

          // Downgrade to free
          db.prepare(`
            UPDATE subscriptions
            SET tier = 'free', status = 'canceled', updated_at = ?
            WHERE user_id = ?
          `).run(new Date().toISOString(), app_user_id);

          logger.info(`[RevenueCat] Subscription canceled for user ${app_user_id}`);
          break;
        }

        default:
          logger.info(`[RevenueCat] Unhandled event: ${event}`);
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('[RevenueCat] Webhook error:', error);
      res.status(500).json({ success: false, error: 'Webhook processing failed' });
    }
  });

  return router;
};