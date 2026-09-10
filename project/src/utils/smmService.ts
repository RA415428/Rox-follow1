import { Order, SmmApiSettings } from '../types';
import { getApiUrl } from './storage';

export interface SmmApiResponse {
  success: boolean;
  orderId?: string;
  error?: string;
  rawResponse?: string;
}

export async function submitOrderToSmmApi(
  order: Order,
  smmSettings: SmmApiSettings
): Promise<SmmApiResponse> {
  if (!smmSettings.enabled) {
    return {
      success: false,
      error: 'SMM API forwarding is disabled in Admin Panel.'
    };
  }

  // 1. Send order to backend server proxy first (bypasses browser CORS completely)
  try {
    const proxyEndpoint = getApiUrl('/api/smm/proxy-order');
    const res = await fetch(proxyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, smmSettings })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return {
          success: true,
          orderId: data.orderId,
          rawResponse: data.rawResponse
        };
      } else if (data && data.error) {
        return {
          success: false,
          error: data.error,
          rawResponse: data.rawResponse
        };
      }
    }
  } catch (err) {
    console.warn('Backend SMM proxy route unreachable, attempting direct client fallback:', err);
  }

  // 2. Fallback direct client attempt (for standalone offline or demo URLs)
  const isDemoUrl = smmSettings.apiUrl.includes('demo-smm-panel') || smmSettings.apiUrl === '';
  
  if (isDemoUrl) {
    const generatedSmmId = `SMM-${Math.floor(100000 + Math.random() * 900000)}`;
    const simResponse = {
      order: generatedSmmId,
      service: order.serviceId || '101',
      link: order.targetUrl,
      quantity: order.quantity,
      status: 'Pending',
      charge: '0.045',
      currency: 'USD',
      timestamp: new Date().toISOString()
    };

    return {
      success: true,
      orderId: generatedSmmId,
      rawResponse: JSON.stringify(simResponse, null, 2)
    };
  }

  let serviceId = order.serviceId || '';
  let apiKey = smmSettings.globalApiKey;

  const typeLower = (order.serviceType || '').toLowerCase();
  if (typeLower.includes('follower')) {
    serviceId = serviceId || smmSettings.services.followers.serviceId;
    if (smmSettings.services.followers.apiKey) apiKey = smmSettings.services.followers.apiKey;
  } else if (typeLower.includes('like')) {
    serviceId = serviceId || smmSettings.services.likes.serviceId;
    if (smmSettings.services.likes.apiKey) apiKey = smmSettings.services.likes.apiKey;
  } else if (typeLower.includes('view') || typeLower.includes('reel')) {
    serviceId = serviceId || smmSettings.services.views.serviceId;
    if (smmSettings.services.views.apiKey) apiKey = smmSettings.services.views.apiKey;
  } else if (typeLower.includes('comment')) {
    serviceId = serviceId || smmSettings.services.comments.serviceId;
    if (smmSettings.services.comments.apiKey) apiKey = smmSettings.services.comments.apiKey;
  } else if (typeLower.includes('share')) {
    serviceId = serviceId || smmSettings.services.shares.serviceId;
    if (smmSettings.services.shares.apiKey) apiKey = smmSettings.services.shares.apiKey;
  } else if (typeLower.includes('repost')) {
    serviceId = serviceId || smmSettings.services.reposts?.serviceId || '';
    if (smmSettings.services.reposts?.apiKey) apiKey = smmSettings.services.reposts.apiKey;
  } else if (typeLower.includes('save')) {
    serviceId = serviceId || smmSettings.services.saves?.serviceId || '';
    if (smmSettings.services.saves?.apiKey) apiKey = smmSettings.services.saves.apiKey;
  } else if (typeLower.includes('reach') || typeLower.includes('impression') || typeLower.includes('visit')) {
    serviceId = serviceId || smmSettings.services.reach?.serviceId || '';
    if (smmSettings.services.reach?.apiKey) apiKey = smmSettings.services.reach.apiKey;
  }

  if (!serviceId) {
    serviceId = smmSettings.services.followers.serviceId || '101';
  }

  if (!apiKey) {
    return {
      success: false,
      error: 'Missing API Key for SMM Panel.'
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('key', apiKey);
    formData.append('action', 'add');
    formData.append('service', serviceId);
    formData.append('link', order.targetUrl);
    formData.append('quantity', order.quantity.toString());

    const res = await fetch(smmSettings.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const data = await res.json();
    if (data && (data.order !== undefined || data.order_id !== undefined)) {
      return {
        success: true,
        orderId: String(data.order || data.order_id),
        rawResponse: JSON.stringify(data, null, 2)
      };
    } else if (data && data.error) {
      return {
        success: false,
        error: String(data.error),
        rawResponse: JSON.stringify(data, null, 2)
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: `Could not connect to SMM Panel API (${err.message || 'CORS / Network Error'}). Ensure API URL & Key are correct.`
    };
  }

  return {
    success: false,
    error: 'Failed to place order on SMM Panel.'
  };
}

export async function testSmmApiConnection(apiUrl: string, apiKey: string): Promise<{ success: boolean; message: string; balance?: string }> {
  if (!apiUrl || !apiUrl.trim()) {
    return { success: false, message: 'API URL is required.' };
  }

  const isDemo = apiUrl.includes('demo-smm-panel');
  if (isDemo) {
    return {
      success: true,
      message: 'Demo SMM Panel API connected successfully! System ready for order processing.',
      balance: '$50.00 USD (Demo Balance)'
    };
  }

  // 1. Try server proxy balance test (bypasses browser CORS completely)
  try {
    const proxyEndpoint = getApiUrl('/api/smm/proxy-balance');
    const res = await fetch(proxyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiUrl, apiKey })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return {
          success: true,
          message: 'Connected to SMM Panel API successfully via Server Proxy!',
          balance: data.balance || 'Connected'
        };
      } else if (data && data.error) {
        return {
          success: false,
          message: `SMM Panel API Error: ${data.error}`
        };
      }
    }
  } catch (err) {
    console.warn('Backend balance proxy test failed, trying direct:', err);
  }

  // 2. Direct fetch fallback
  try {
    const formData = new URLSearchParams();
    formData.append('key', apiKey || 'test');
    formData.append('action', 'balance');

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    const data = await res.json();
    if (data && data.balance !== undefined) {
      return {
        success: true,
        message: `Connection successful! Account balance: ${data.balance} ${data.currency || 'USD'}`,
        balance: `${data.balance} ${data.currency || 'USD'}`
      };
    } else if (data && data.error) {
      return {
        success: false,
        message: `SMM Panel Error: ${data.error}`
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Connection failed: ${err.message || 'CORS / Network error'}. Check API URL and API Key.`
    };
  }

  return {
    success: false,
    message: 'Could not connect to SMM API server.'
  };
}

