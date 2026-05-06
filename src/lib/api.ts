/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppLog } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://eycwwbgymeuggayeifce.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "";

export async function callDb(endpoint: string, method: string = 'GET', data?: any, range?: string) {
  const headers: Record<string, string> = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Accept-Profile": "toko",
    "Content-Profile": "toko",
  };

  if (method === "POST" || method === "PATCH") {
    headers["Prefer"] = "return=representation";
  }

  if (range) {
    headers["Range"] = range;
  }

  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  
  try {
    const options: RequestInit = {
      method,
      headers,
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DB Error (${endpoint}): ${response.status} ${errorText}`);
      return null;
    }

    if (response.status === 204) return true;
    return await response.json();
  } catch (error) {
    console.error(`Fetch Error (${endpoint}):`, error);
    return null;
  }
}

export async function logAction(action: string, status: string, message: string = "", details: any = null) {
  const entry: AppLog = {
    action,
    status,
    message,
    details
  };
  return await callDb("app_log", "POST", entry);
}

export function getNowWIB() {
  const now = new Date();
  // Offset for WIB (UTC+7)
  const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  return wibTime.toISOString();
}
