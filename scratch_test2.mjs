import { createClient } from '@supabase/supabase-js';

// Simulate background fetch logic exactly as it is in the extension
async function simulateBackgroundFetch(url, options = {}) {
  let plainHeaders = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        plainHeaders[key] = value;
      });
    } else if (typeof options.headers.entries === 'function') {
      for (let [key, value] of options.headers.entries()) {
        plainHeaders[key] = value;
      }
    } else {
      plainHeaders = options.headers;
    }
  }
  const plainOptions = { ...options, headers: plainHeaders };
  
  console.log("Background script executing fetch with options:", plainOptions);
  
  const response = await fetch(url, plainOptions);
  const bodyText = await response.text();
  
  return new Response(bodyText, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  });
}

const supabase = createClient(
  "https://vctxtgacwuprmivvgclw.supabase.co",
  "sb_publishable_x6a3UfdTi8NpEyqFqhL31A_ZS5RCjfg",
  {
    global: { fetch: simulateBackgroundFetch },
    auth: { persistSession: false }
  }
);

async function test() {
  console.log("Invoking edge function via supabase client...");
  const { data, error } = await supabase.functions.invoke('steam-avatars', {
    body: { steamids: ["76561198012345678"] }
  });
  
  console.log("Result:", { data, error });
}

test();
