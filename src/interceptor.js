// L4D2 Center Enhanced - Main World Interceptor
console.log("L4D2 Center Enhanced: Interceptor Loaded in MAIN world");

// Listen for messages from Content Script (postMessage works across worlds)
window.addEventListener("message", (event) => {
  // Log all messages for debugging
  console.log("L4D2 Enhanced: Message received:", event.data);

  // Only process our messages
  const data = event.data;
  if (!data || typeof data !== "object" || !data.type) return;
  if (!data.type.startsWith("L4D2_")) return;

  if (data.type === "L4D2_CREATE_PARTY") {
    console.log("L4D2 Enhanced: Processing CREATE_PARTY");
    console.log(
      "L4D2 Enhanced: CreatePartyButton exists?",
      typeof window.CreatePartyButton
    );

    if (typeof window.CreatePartyButton === "function") {
      try {
        window.CreatePartyButton();
        console.log("L4D2 Enhanced: CreatePartyButton called successfully!");
      } catch (e) {
        console.error("L4D2 Enhanced: CreatePartyButton error:", e);
      }
    } else {
      console.error("L4D2 Enhanced: CreatePartyButton function not found!");
      // Try alternative methods
      console.log(
        "L4D2 Enhanced: Available window functions:",
        Object.keys(window).filter((k) => k.toLowerCase().includes("party"))
      );
    }
  }

  if (data.type === "L4D2_JOIN_PARTY") {
    const code = data.code;
    console.log("L4D2 Enhanced: Processing JOIN_PARTY with code:", code);

    // Set the input value
    const inp = document.getElementById("invitecodeinput");
    console.log("L4D2 Enhanced: Input element found?", !!inp);
    if (inp) inp.value = code;

    console.log(
      "L4D2 Enhanced: JoinPartyButton exists?",
      typeof window.JoinPartyButton
    );
    if (typeof window.JoinPartyButton === "function") {
      try {
        window.JoinPartyButton(true);
        console.log("L4D2 Enhanced: JoinPartyButton called successfully!");
      } catch (e) {
        console.error("L4D2 Enhanced: JoinPartyButton error:", e);
      }
    } else {
      console.error("L4D2 Enhanced: JoinPartyButton function not found!");
    }
  }
  // --- Anticheat Login ---
  if (data.type === "L4D2_ANTICHEAT_LOGIN_REQUEST") {
    console.log("L4D2 Enhanced: Processing ANTICHEAT_LOGIN_REQUEST");
    performAnticheatLogin();
  }
});

// --- Minimal Protobuf Decoder for AntiCheatToken ---
// Fields: 1=bool(Success), 2=string(Error), 3=string(Token)
function decodeAntiCheatToken(buffer) {
  const view = new DataView(buffer.buffer || buffer);
  const result = { Success: false, Error: "", Token: "" };
  let offset = 0;

  while (offset < buffer.length) {
    // Read field tag (varint): contains field number + wire type
    const tag = buffer[offset++];
    const fieldNumber = tag >> 3;
    const wireType = tag & 0x07;

    if (wireType === 0) {
      // Varint (used for bool)
      let value = 0;
      let shift = 0;
      let byte;
      do {
        byte = buffer[offset++];
        value |= (byte & 0x7f) << shift;
        shift += 7;
      } while (byte & 0x80);

      if (fieldNumber === 1) result.Success = value !== 0;
    } else if (wireType === 2) {
      // Length-delimited (used for string)
      let length = 0;
      let shift = 0;
      let byte;
      do {
        byte = buffer[offset++];
        length |= (byte & 0x7f) << shift;
        shift += 7;
      } while (byte & 0x80);

      const strBytes = buffer.slice(offset, offset + length);
      const str = new TextDecoder().decode(strBytes);
      offset += length;

      if (fieldNumber === 2) result.Error = str;
      if (fieldNumber === 3) result.Token = str;
    } else {
      // Unknown wire type, skip (shouldn't happen for this simple message)
      console.warn("L4D2 Enhanced: Unknown protobuf wire type", wireType);
      break;
    }
  }

  return result;
}

// --- Anticheat Login Flow ---
function performAnticheatLogin() {
  const apiDomain = "api.l4d2center.com";
  const url = `https://${apiDomain}/v2/get_ac_login`;

  const xhr = new XMLHttpRequest();
  let fullUrl = url + "?";

  // Append CSRF token from localStorage (same as the original plugin)
  const csrf = localStorage.getItem("auth3");
  if (csrf) {
    fullUrl += `csrf=${encodeURIComponent(csrf)}`;
  }

  xhr.open("GET", fullUrl, true);
  xhr.timeout = 5000;
  xhr.withCredentials = true;
  xhr.responseType = "arraybuffer";

  xhr.onload = function () {
    if (xhr.status === 200) {
      try {
        const bytes = new Uint8Array(xhr.response);
        const decoded = decodeAntiCheatToken(bytes);
        console.log("L4D2 Enhanced: Anticheat API response:", decoded);

        if (decoded.Success && decoded.Token) {
          window.postMessage(
            {
              type: "L4D2_ANTICHEAT_LOGIN_RESPONSE",
              success: true,
              token: decoded.Token,
            },
            "*"
          );
        } else {
          window.postMessage(
            {
              type: "L4D2_ANTICHEAT_LOGIN_RESPONSE",
              success: false,
              error: decoded.Error || "Token not received",
            },
            "*"
          );
        }
      } catch (e) {
        console.error("L4D2 Enhanced: Protobuf decode error:", e);
        window.postMessage(
          {
            type: "L4D2_ANTICHEAT_LOGIN_RESPONSE",
            success: false,
            error: "Failed to decode response",
          },
          "*"
        );
      }
    } else {
      window.postMessage(
        {
          type: "L4D2_ANTICHEAT_LOGIN_RESPONSE",
          success: false,
          error: `HTTP ${xhr.status}`,
        },
        "*"
      );
    }
  };

  xhr.onerror = function () {
    window.postMessage(
      {
        type: "L4D2_ANTICHEAT_LOGIN_RESPONSE",
        success: false,
        error: "Network error",
      },
      "*"
    );
  };

  xhr.ontimeout = function () {
    window.postMessage(
      {
        type: "L4D2_ANTICHEAT_LOGIN_RESPONSE",
        success: false,
        error: "Request timed out",
      },
      "*"
    );
  };

  xhr.send();
  console.log("L4D2 Enhanced: Anticheat API request sent to", fullUrl);
}

console.log("L4D2 Center Enhanced: Message listener registered");
