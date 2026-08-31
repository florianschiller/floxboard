import { userManager } from '../auth';

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let user = await userManager.getUser();

  if (user?.expired) {
    try {
      user = await userManager.signinSilent();
    } catch {
      await userManager.removeUser();
      user = null;
    }
  }

  const headers = new Headers(options.headers || {});
  if (user?.access_token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${user.access_token}`);
  }

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    try {
      user = await userManager.signinSilent();
      if (user?.access_token) {
        headers.set('Authorization', `Bearer ${user.access_token}`);
        response = await fetch(url, { ...options, headers });
      }
    } catch {
      await userManager.removeUser();
    }
  }

  return response;
}
