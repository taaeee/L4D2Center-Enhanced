const url = "https://vctxtgacwuprmivvgclw.supabase.co/functions/v1/steam-avatars";
const key = "sb_publishable_x6a3UfdTi8NpEyqFqhL31A_ZS5RCjfg";

async function test() {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "apikey": key
      },
      body: JSON.stringify({ steamids: ["76561198012345678"] })
    });
    
    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Body:", text);
  } catch (err) {
    console.error(err);
  }
}

test();
