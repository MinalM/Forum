import { getLDClient } from '../utils/ldClient'

/**
 * LaunchDarkly Observability Integration
 * 
 * This module leverages the LaunchDarkly SDK's built-in observability features:
 * - TracingHook: Automatically creates spans for flag evaluations
 * - Event tracking: Sends events to LD analytics
 * - Metrics: Tracks flag evaluation metrics
 * 
 * The TracingHook is already initialized in ldClient.ts with OTEL integration,
 * so all flag evaluations automatically:
 * 1. Create OTEL spans (sent to Grafana)
 * 2. Get tracked as events (sent to LaunchDarkly)
 */

export const initLD_Observability = () => {
  const client = getLDClient()

  if (!client) {
    console.warn('⚠️ LaunchDarkly SDK not initialized. Observability disabled.')
    return null
  }

  try {
    console.log('✅ LaunchDarkly Observability Integration Active')
    console.log('  - Flag evaluations create OTEL spans')
    console.log('  - Events will be sent to LaunchDarkly Dashboard')
    console.log('  - Service: forum-server')
    console.log('  - Environment:', process.env.NODE_ENV || 'development')

    return client
  } catch (error) {
    console.error('❌ Failed to initialize LaunchDarkly observability:', error)
    return null
  }
}

/**
 * Track custom events in LaunchDarkly
 * These events appear in LD Dashboard and are correlated with flag evaluations
 * 
 * @param eventName - Name of the event (e.g., 'post-created')
 * @param userContext - User context from request
 * @param metricData - Optional metrics/data to track with the event
 */
export const trackLD_Event = async (
  eventName: string,
  userContext: any,
  metricData?: any
) => {
  const client = getLDClient()

  if (!client) {
    console.warn('LaunchDarkly client not available for event tracking')
    return false
  }

  try {
    // Track the event in LaunchDarkly
    await client.track(eventName, userContext, metricData)
    
    console.log(`✅ Tracked event in LaunchDarkly: ${eventName}`)
    return true
  } catch (error) {
    console.error(`Failed to track event '${eventName}':`, error)
    return false
  }
}
