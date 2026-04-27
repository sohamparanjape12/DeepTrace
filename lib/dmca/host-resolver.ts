import whois from 'whois-json';
import fs from 'fs';
import path from 'path';
import { HostInfo } from './types';
import { db } from '../firebase-admin';

let cachedAgents: any[] | null = null;

function loadAgents() {
  if (cachedAgents) return cachedAgents;
  try {
    const agentsPath = path.join(process.cwd(), 'data', 'dmca-agents.json');
    const data = fs.readFileSync(agentsPath, 'utf-8');
    cachedAgents = JSON.parse(data);
    return cachedAgents;
  } catch (error) {
    console.error('Failed to load dmca-agents.json', error);
    return [];
  }
}

export async function resolveHost(url: string): Promise<HostInfo | null> {
  try {
    let validUrl = url;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }
    const parsedUrl = new URL(validUrl);
    const domainParts = parsedUrl.hostname.split('.');
    const domain = domainParts.length > 2 ? domainParts.slice(-2).join('.') : parsedUrl.hostname;

    // 1. Check internal cache from Firestore
    const cacheRef = db.collection('dmca_agent_cache').doc(domain);
    const cacheDoc = await cacheRef.get();
    if (cacheDoc.exists) {
      const data = cacheDoc.data();
      // Assume TTL is handled by periodic cleanup or just checking age here
      // For MVP, if it's there, use it
      return data as HostInfo;
    }

    // 2. Check curated JSON list
    const agents = loadAgents();
    const curated = agents?.find((a: any) => a.domain === domain || parsedUrl.hostname.endsWith(a.domain));
    if (curated) {
      const info: HostInfo = {
        domain,
        agent_name: curated.agent_name,
        agent_email: curated.agent_email,
        agent_address: curated.agent_address,
        source: 'directory',
        resolved_at: new Date().toISOString()
      };
      await cacheRef.set(info);
      return info;
    }

    // 3. Fallback to WHOIS (Port 43 is often blocked in cloud environments)
    let whoisData: any = null;
    try {
      // Set a short timeout for WHOIS to avoid hanging the request
      whoisData = await Promise.race([
        whois(domain),
        new Promise((_, reject) => setTimeout(() => reject(new Error('WHOIS Timeout')), 5000))
      ]);
      
      const emails = whoisData?.emails;
      const abuseEmail = whoisData?.registrarAbuseContactEmail;
      
      if (abuseEmail || emails) {
        const contactEmail = abuseEmail || (Array.isArray(emails) ? emails[0] : emails);
        if (contactEmail) {
          const info: HostInfo = {
            domain,
            agent_name: whoisData?.registrar || 'Domain Registrar',
            agent_email: contactEmail,
            source: 'whois',
            resolved_at: new Date().toISOString()
          };
          await cacheRef.set(info);
          return info;
        }
      }
    } catch (e: any) {
      console.warn(`[HostResolver] WHOIS resolution failed for ${domain}: ${e.message}`);
      // Port 43 is likely blocked. Fallback to common provider patterns or manual.
    }

    // 4. Common Provider Patterns (Last resort before manual)
    const providerMap: Record<string, string> = {
      'cloudflare.com': 'abuse@cloudflare.com',
      'google.com': 'registrar-abuse@google.com',
      'amazonaws.com': 'trustandsafety@support.aws.com',
      'namesilo.com': 'abuse@namesilo.com',
      'godaddy.com': 'abuse@godaddy.com',
      'namecheap.com': 'abuse@namecheap.com',
    };

    if (providerMap[domain]) {
      const info: HostInfo = {
        domain,
        agent_name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
        agent_email: providerMap[domain],
        source: 'pattern_match',
        resolved_at: new Date().toISOString()
      };
      await cacheRef.set(info);
      return info;
    }

    // 5. Return manual
    return {
      domain,
      agent_name: 'Unknown Host',
      agent_email: '',
      source: 'manual',
      resolved_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Host resolution fatal error:', error);
    return null;
  }
}
